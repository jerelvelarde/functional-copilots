# Taking the copilot into Slack or Teams

Approvers rarely want another tab. There are two routes into Slack or Teams, and one fact decides how
much work either one is.

## First: where do the tools run?

Both workshop starters register every tool, card and gate in the browser: `useFrontendTool`,
`useComponent` and `useHumanInTheLoop` in `src/copilot/`. Each web run carries them to the agent, and
each route's own comment says the agent needs no backend tools of its own. A Slack or Teams message has
no browser behind it, so the same agent would run there with no tools, no cards and no gate. It could
only answer in prose, which the spec forbids for numbers.

So chat is not "the same app in another window". Before either route works, the rules, the calculations
and the submit must be callable from a server, and the draft must live where a server can read it.

## Option A: CopilotKit Channels (same runtime and agent, new surface)

The Channels SDK runs your agent in chat providers. Your process keeps owning the agent, tools, approval
logic, state and deployment.
([reference](https://docs.copilotkit.ai/reference/channels), [Intelligence channels](https://docs.copilotkit.ai/intelligence/channels))

- **Managed Slack and Microsoft Teams** through CopilotKit Intelligence: Intelligence owns the provider
  connection, your process handles the agent. In runtime 1.84.1, managed channels are declared on the
  `CopilotRuntime` (`channels: [...]`) and need Intelligence mode
  (`intelligence: new CopilotKitIntelligence(...)`). The headcount starter's runtime runs in SSE mode;
  Open Harvey switches to Intelligence mode only when its opt-in switch is on (`src/lib/intelligence.ts`).
- **Direct adapters** you operate yourself: Slack, Teams, Discord, WhatsApp.
- **Interactive components**: actions, buttons, selects and inputs (modals only on direct adapters).
  `Thread` runs or resumes the agent; `StateStore` persists workflow state, callback snapshots, locks
  and queues.

### What moving the tools and the gate to the backend involves

1. **Tools to the server.** Register the read and compute tools on the agent: `defineTool` from
   `@copilotkit/runtime/v2` in `new BuiltInAgent({ ..., tools: [...] })`, each `execute` calling the
   same pure function the browser tool called. Remove the `useFrontendTool` twin, so web and chat share
   one definition.
2. **The draft to the server.** The starter keeps the draft in a browser store (`src/lib/store.ts`,
   saved to localStorage). Chat needs it in a database keyed by request id, so web and chat edit the
   same record and the server tools read it.
3. **The gate to the server.** `useHumanInTheLoop` renders only in a browser. Rebuild Submit as either
   a server interrupt tool (`defineTool({ name, description, parameters, interrupt: true })` with no
   `execute`: the run pauses, and the human's answer becomes the tool's result on the resume run), or a
   Channels button (`onInteraction`) whose handler calls the submit function itself. Either way the
   card shows the same summary as the web gate, and nothing is written until the click.
4. **Chat cards.** The web keeps its `useComponent` cards. In chat, a card is a message the channel
   posts. A Channel tool (`defineChannelTool`, in `@copilotkit/channels-core` 0.12.0) runs in the
   channel process the way a frontend tool runs in the browser, and posts with `thread.post(...)`.
5. **Approver decisions are events on the record.** The requester's run ended at Submit, possibly days
   before the first approver clicks. Post each approver's card from the request record when it reaches
   their step, and record the click as a decision on that record (who, decision, comment, time),
   checked against the separation-of-duties rule and the clicker's identity. Don't model it as the
   requester's run resuming. **How the card reaches an approver who didn't start the conversation is
   to verify.** A channel run replies into the conversation it came from, and a choice is answerable by
   its initiator by default (`answerableBy: "initiator"` in `@copilotkit/channels-core` 0.12.0;
   `"conversation"` lets anyone in that conversation answer). Posting into an approver's DM or an
   approvals channel means building that target yourself; test it against the installed adapter before
   the spec promises DMs. The fallback that works today: one approvals channel, `answerableBy:
   "conversation"`, and the handler checks that the clicker is the approver the record expects.
6. **A long-running worker.** The channel process holds a connection open and keeps state between a
   message and a click. Run it as a long-lived service with a durable `StateStore`, not as a serverless
   function.
7. **Test a real click.** Whether a Slack or Teams click resumes a paused `BuiltInAgent` interrupt run
   is **to verify**. The Channels docs (`/slack/interactive`) validate one managed approval path, a
   DeepAgent tool-driven approval that emits `on_interrupt`, and warn not to assume native AG-UI
   interrupts are portable. Until a click has resumed a run end to end in your setup, use the
   button-handler gate from step 3 and say the interrupt path is unverified.

**Versions.** The docs list a tested pair (on 2026-11-04: `@copilotkit/channels` 0.11.0 with
`@copilotkit/runtime` 1.73.3). The starter pins runtime 1.84.1, which already depends on
`@copilotkit/channels-core` ^0.12.0, and `@copilotkit/channels` 0.12.0 depends on the same
channels-core 0.12.0. Don't downgrade the starter to the docs' pair. Either add `@copilotkit/channels`
0.12.0 next to runtime 1.84.1 (consistent on paper, not tested end to end), or run the docs' pair in a
separate Channels worker. Install with `--save-exact` either way, and re-check before upgrading.

Choose this when the web app is the primary surface and chat is where approvers decide. Design the
approval message for a one-minute decision: the artifact summary, the numbers, the rule results, and
Approve / Send back / Reject.

## Option B: OpenBot (a self-hosted AI coworker)

[OpenBot](https://github.com/CopilotKit/openbot) is CopilotKit's open-source (MIT, beta) AI-coworker
template. You clone it and replace the example tenant package under `examples/` with your own coworkers,
channels and skills, then run it on your own infrastructure.

- Any AG-UI agent can arrive as a coworker (a built-in one, or your existing agent by URL).
- A tenant package (`examples/<name>/`: `agents.yaml`, `skills.yaml`, `channels.yaml`, `model.yaml`,
  `brand.yaml`, `knowledge.yaml`) is selected with `TENANT_PACKAGE_DIR` and synced on boot.
- Coworkers use only the tools and skills granted to them. Tools usually come from an MCP server that
  stands in for the system of record; put the rules and arithmetic there. This also solves the
  where-do-the-tools-run problem above: the tools live in that server, not in a browser.
- Team approval rules gate tool calls. **Name every tool in its own rule:** an `allow` rule for each
  read tool (`<server>/get_team_plan`, `<server>/get_comp_band`, ...) and an `ask` rule for each write
  (`<server>/submit_headcount_request`, ...). Avoid `<server>/*` → `allow`. OpenBot treats every tool
  on a server added by URL as a write, and the strictest matching rule wins, so a wildcard `allow`
  silently lets through any write you add to the server later without its own `ask` rule. The
  workshop's `starters/openbot-headcount/examples/northstar/hr-system/connect.ts` uses the wildcard for
  brevity; replace it when you adapt it.
- The gate's outcomes are `allow`, `ask`, `hand_off` and `deny`, and every call and decision lands in
  Admin → Audit.

Know the limits before you promise anything (as of Nov 2026, verified in the workshop starter):

- **The `ask` card goes to the requester**, the person whose message triggered the coworker's action.
  It governs the coworker, not the business decision: Marcus, Priya and Elena never get an OpenBot
  card. So OpenBot is not an approver-approval path today. Business approvals (manager, Finance, CFO)
  belong in the system of record or in a Channels flow.
- **Slack and Teams come through OpenTag**, and the OpenBot pairing is on a preview branch. Replies
  after an approval click don't reach Slack yet. Demo in OpenBot's web app.
- **Package skills apply when picked with `/`** in the web composer. Skills published by Intelligence's
  Automatic Learning are loaded into the coworker's runs, including channels, once skill delivery is
  enabled for the Learning container.
- **Custom MCP servers must be `https` on a public hostname**, so local development needs a tunnel.
- A package can't ship UI components, and `knowledge.yaml` takes only Drive or OneDrive roots.

Choose this when the team wants a self-hosted, governed assistant it owns, with grants, approval rules
and an audit trail in one product. The workshop's `starters/openbot-headcount/` packages the headcount
copilot this way; its README covers setup and how to publish the learned skill.

## Design notes that apply to both

- **One record.** The web request and the chat approval refer to the same request id. The requester's
  conversation is one thread; each approver's decision is an event on the record, with its own audit
  entry.
- **Approvers see rule ids**, not the agent's reasoning. "Over $350,000 fully loaded: CFO required
  (POL-APR-02)" is decidable in seconds.
- **The click is the identity check.** Record who clicked from the provider's verified user, mapped to
  your directory, and refuse a decision that breaks separation of duties.
- **Notifications are not approvals.** Only the steps that need a decision get buttons.
