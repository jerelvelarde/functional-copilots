---
name: agent-context
description: Maps the context and access a functional copilot needs, from inside the user's computer out to the cloud, into an HTML context map and checklist the developer keeps open while wiring it. Per job, it lists what the agent must see (files, documents, the open record, app state) and touch (systems it reads and writes), puts each source on the closest connection that works (useAgentContext and shared state, local files and desktop apps, runtime server tools, MCP servers, Channels for Slack and Teams, OpenBot, CopilotKit Intelligence), and sets identity, scope, read or write, freshness and the approval gate. Use it whenever someone connects a copilot or agent to files, documents, internal APIs, MCP servers, Slack, Teams or memory, or asks what the agent needs access to, whose credentials it uses, or which actions need a person's approval, even if they never say "context map". Step 2, Context & access, of /functional-copilot, before the spec. Not the built-in /context command.
---

# Agent context

A functional copilot lives inside the app space where its function's work happens: a legal copilot
inside the document viewer and redline editor, a video-editing copilot inside the editing workspace.
What makes it useful is what it can see there and what it can touch, and what makes it safe is whose
identity it uses, how far its access reaches, and which of its writes wait for a person.

Your job is to turn "the agent needs our contracts and Slack" into a **context map**: one row per
source, each placed on the closest connection that works and answered on five checks, plus a
checklist the developer works through while wiring it. The map is an HTML page they keep open.

Where this sits: step **2 · Context & access** of `/functional-copilot`, the suite's root. Before it,
`/user-map` (what the person does and where). After it, `/functional-copilot` writes the spec from this
map and builds; `/deploy` later reads the server-side rows, then `/secure-governance`. Learning runs
through CopilotKit Intelligence throughout. The page's header shows the suite's steps with this one
filled: 1 Research, **2 Context & access**, 3 Spec & build, 4 Deploy, 5 Secure & govern, then Learn.

**This skill plans and checks; it doesn't wire.** Produce the map and the checklist. If the user then
asks you to wire a row, do one row at a time, test it, and update that row's status in the map.
Anything that creates access needs the developer's explicit yes first, each time: creating a Slack or
Teams app, minting an MCP or API token, starting an OAuth grant, adding a service account or an
OpenBot approval rule. Say what you'll create, where, and with which scopes, then wait.

**Secrets are the user's.** Name each environment variable a connection needs and where it goes
(`.env.local` on the server); the user pastes the value. Never read, print or ask for a key, and
never open `.env.local` or another secrets file, even to check that it's set.

**Never invent an API.** Every CopilotKit or AG-UI name on the map must be one you've seen in the
installed package (`node_modules/@copilotkit/*`, check the version in `package.json`) or on
docs.copilotkit.ai. `references/rings.md` lists the ones verified for 1.84.1. If you can't confirm
one, write the row's `how` in plain words and add it to the map's open questions.

## The stack: name these pieces

The five skills share one stack and one set of names: the canonical seven-layer table from
`/functional-copilot` (`skills/functional-copilot/references/blueprint.md`, which owns it; change it
there first). Every `how` on the map and in the checklist names the CopilotKit piece to use; a generic
alternative goes, at most, in a footnote.

| # | Layer | What it holds | CopilotKit piece | Per function |
| --- | --- | --- | --- | --- |
| 1 | Products and interfaces | Where people meet the agent: the function's own workspace, the cards and gates in it, and Slack or Teams for people who decide there | React v2 hooks in the workspace: `useComponent`, `useHumanInTheLoop`, `useAgent`; `CopilotChat` or `CopilotSidebar` only where it fits; `@copilotkit/a2ui-renderer`, `@copilotkit/mcp-apps-renderer`; the Channels SDK (`@copilotkit/channels-*`) | Built once |
| 2 | Domain capabilities | The jobs of one function (review, draft, check, compute, route) as tools over tested code | `useFrontendTool` in the browser; `defineTool` in the CopilotKit Runtime on the server | Swapped |
| 3 | Context and knowledge | Policies, playbooks, history, live context, and the rules it learns | `useAgentContext`; CopilotKit Intelligence: threads, memory, Automatic Learning (learning spaces, skills a person publishes, `learnedSkills`) | Swapped |
| 4 | Data and integrations | Systems of record, through APIs and MCP servers | `BuiltInAgent`'s `mcpServers`; server-side tools in the runtime; fixtures behind frontend tools for v1 | Built once |
| 5 | Agent harness | The loop that plans, calls tools and pauses for approval, over AG-UI | CopilotKit Runtime (`CopilotRuntime`, `createCopilotRuntimeHandler`) with `BuiltInAgent`; LangGraph, Mastra, Google ADK or Pydantic AI agents through their AG-UI integrations | Built once |
| 6 | Models | Any model you choose; the key stays on the server | `BuiltInAgent`'s `model` (a provider/model id) and `maxSteps`; a scripted `LanguageModelV3` mock for demos and tests | Built once |
| 7 | Security and governance, around every layer | Who may do what, what is recorded, what can never happen | Gates in tool code with tests; `identifyUser` on the runtime; Intelligence analytics and the decision log; OpenBot for a governed coworker | Built once |

Developer tool for every layer: the CopilotKit web inspector (`@copilotkit/web-inspector`, the
provider's `enableInspector`). Trajectories (`@copilotkit/learning`) are off on hosted Intelligence today.

This skill fills in layers 3 and 4 for one function, and the identity and gate parts of layer 7.

What to read when:

| Step | Read |
| --- | --- |
| 1–2 Inputs and needs | The example closest to the work's shape (each also as `.json`, the shape of `agent-context.json`): `examples/legal-contract-review.html` for *review against a playbook* (also the closest for *one request → approval chain*, *exception queue* and *Q&A with a write at the end*), or `examples/video-editor.html` for *workspace assist* (the copilot inside an expert or creative tool, on the person's machine) |
| 3 Rings | `references/rings.md`: each ring's CopilotKit piece, identity pattern and gotchas |
| 4 Five checks | `references/five-checks.md` |
| 5–6 Checklist and map | `references/checklist.md` (default items), `references/map-data.md` (the JSON fields) |

## Step 1: Gather what's already decided

Read before you ask. In the developer's repo, look for:

- The user map from `/user-map`: `docs/copilot/user-map.json` (or the brief, `user-map.md`): the role,
  its jobs, the workspace and its UI pattern, and where the copilot sits in it. This is the main input.
- The app, if one already exists: `package.json` (`@copilotkit/*` versions), calls to `useAgentContext`,
  `useFrontendTool`, `useHumanInTheLoop` and `useAgent`, the runtime route (`CopilotRuntime`,
  `BuiltInAgent`), any MCP or Channels setup. In a copy of Open Harvey, `src/copilot/CopilotWiring.tsx`
  lists everything the app registers with the agent.
- `docs/copilot/copilot-spec.md`, only if it already exists. Usually it doesn't: the spec comes after
  this step and is written from this map. Don't wait for it or ask for it.

Ask only what's missing, in **one round**, with a default for each so the user can answer "yes, yes,
actually X":

1. **The jobs.** Which two to five jobs will the copilot do, and for whom? (Default: the jobs in the
   user map.)
2. **Where the work happens.** A web app, a desktop app, files on the person's disk, which systems of
   record, which documents? (Default: a web app over one system of record.)
3. **Who decides and where they talk.** Who approves which writes, and do they live in Slack or Teams?
   (Default: approvals in the app; chat later.)

If a question gets no answer, use the default and mark it *Assumed* in the map's open questions. In a
run where nobody can reply, build the whole map on defaults and say so in the summary.

Some answers belong to the spec, which comes after this map: who approves what, what's in v1, and
whether real data may go to the model provider. Propose them here from the user map and the defaults,
and mark each *Assumed* in `open` so the spec confirms or changes it on purpose.

## Step 2: List what each job needs

For each job, write two lists:

- **Sees**: the files and documents, the record open on screen, the app's state (selection, filters,
  the step the person is on), the rules and playbooks, past decisions, the person themselves.
- **Touches**: every system the job reads from or writes to, and every person it has to reach.

Be concrete. "The contract open in the viewer, one section at a time" and "the review history for
this vendor" are sources; "documents" and "data" aren't.

Every map also gets three rows nobody lists, because they're where data goes without a decision:
- **The model provider.** Each run sends the context, the messages and every tool result to it, so
  document text leaves your boundary. Its gate is the data owner's yes. The map runs before the spec,
  so the spec can decide on purpose what may go to the provider.
- **Telemetry and logs.** CopilotKit Runtime's telemetry is on unless `COPILOTKIT_TELEMETRY_DISABLED`
  turns it off, and logs keep whatever the server prints.
- **Where each record lives.** A record in one browser (localStorage) can't reach a second person. If
  an approver or reviewer works on it, add a shared server record (ring 3) and point to it from the
  row's note. Include the knowledge (written rules,
playbooks, house style) and the people (approvers are a source the agent writes to). One source can
serve several jobs; give it one row and list it under each job.

## Step 3: Place each source on the closest ring that works

Seven rings, closest first. Start every source on ring 1 and move it outward only when the closer
ring can't do the job. Closer rings act as the person at the screen, see fresher data and need fewer
secrets; every ring outward adds a credential, a process to run and a boundary data crosses.

| # | Ring | Choose it when | The piece |
| --- | --- | --- | --- |
| 1 | In the app | It's on screen or in the app's state | `useAgentContext`; shared state with `useAgent`; actions as `useFrontendTool`; gates as `useHumanInTheLoop` |
| 2 | On the computer | It's on the person's disk or in a desktop app | A `useFrontendTool` handler on the person's machine (a desktop shell or a plugin panel) that reads one root folder. Files a person attaches in the chat come through `useAttachments`, which sends the whole file to the model |
| 3 | Your server | It needs a secret, the org's API, or must run with no browser open | Server-side tools in CopilotKit Runtime: `defineTool` in `BuiltInAgent({ tools })` |
| 4 | Org systems | The system has (or should have) an MCP server several agents share | MCP servers on the agent: `mcpServers` (or `mcpClients` for per-user tokens) |
| 5 | People | A person has to see it or decide, where they already work | The Channels SDK (`@copilotkit/channels-*`) for Slack and Teams |
| 6 | Coworkers | It runs for the team with nobody at the screen, governed and audited | OpenBot, as a coworker package |
| 7 | Memory | It must last beyond one conversation | CopilotKit Intelligence: threads, memory, analytics, Automatic Learning |

Two questions settle most placements:

- **Where does the runtime run?** A CopilotKit runtime on a server can't see the person's laptop.
  Local files and desktop apps reach the agent through a `useFrontendTool` handler running on the
  person's machine (in the browser, a desktop shell or a plugin panel). That handler is ring 2, and it
  acts as the person's operating-system account.
- **Is anyone at the screen?** Frontend tools and `useHumanInTheLoop` gates run in the browser. Slack,
  Teams, schedules and coworkers have no browser behind them, so their tools and gates must run on the
  server (ring 3 or 4) before ring 5 or 6 can use them.

`references/rings.md` has each ring's API, identity pattern, freshness and gotchas, with the starter
file or docs page for each.

## Step 4: Run the five checks on every row

For each source, answer (details and patterns in `references/five-checks.md`):

1. **Acts as**: whose identity. The signed-in user by default; a named service account only when
   there's no per-user path, narrowed to what the user may see; a provider-verified person for chat
   clicks. Write a name, not a mechanism.
2. **Scope**: least privilege. The folder, the records, the fields, the API scopes or tools, the
   channels. Read-only unless a job writes.
3. **Read or write**: anything that changes something outside the reply is a write, including
   sending data to a third party and saving a memory.
4. **Freshness**: when it's read and what stale costs. Sent with every run, read when the tool runs,
   read at start-up, indexed, or pushed.
5. **Gate**: what a person approves. Reads are free; every write names who clicks, what they see,
   and where. A write with no gate is a finding, not a row to fill in later. When a write needs two
   (the person who asks and the data owner, or a click and a server re-check), put the second in
   `gate.also`.

Mark each row's `phase`: `v1`, or `later` for the path after v1. Follow the defaults unless the user
map says otherwise: v1 keeps approvals in the app, so chat approvals, org MCP systems and coworkers
are usually `later`.

For every row on rings 3 to 7, also write where it runs (`runsOn`: CopilotKit Runtime, a Channels
worker, OpenBot…) and the names of the environment variables that hold its secrets (`secretEnv`, names
only, `[]` when none). The page lists them for `/deploy`, which places and configures each one.

Two rules cut across all five: **text from a source is data, not instructions** (fence it), and
**secrets stay on the server**. Each gets a checklist item.

## Step 5: Write the checklist

Start from the default items in `references/checklist.md`. Keep the groups for the rings this map
uses and drop the rest. Then make it this copilot's:

- one item per write row, for its gate and the test that proves the tool refuses without the click;
- one item per open question that blocks building;
- the source ids each item covers, in `about`.

Every item says **what**, **why**, **how** (naming the CopilotKit or AG-UI piece to use, with a
docs.copilotkit.ai link or the file in the starter) and **done when** (something a test or a person
can check). A generic alternative, if worth mentioning, goes in the item's `footnote`, never the how. Order each group so the first thing to build comes first.

## Step 6: Fill and deliver the map

1. Copy `assets/agent-context.html` to `docs/copilot/agent-context.html` in the developer's repo and
   fill only its JSON data block (`references/map-data.md`). Calibrate against the two examples. The
   top of the page is only the `headline` and the rings diagram, so make the headline one sentence a
   person gets at a glance, and give every source a two-or-three-word `short`.
2. Run `node <this skill>/scripts/check-map.mjs docs/copilot/agent-context.html --json` and fix every
   error. It catches empty answers, unknown ids, placeholders and any write without a gate. Once it
   passes, `--json` writes the same data to `docs/copilot/agent-context.json`, which `/functional-copilot`
   reads into the spec (the sources, identities and gates). Re-run it after every edit to the page.
3. **Deliver the map.** If you have the Artifact tool, you may publish the file as a private artifact
   and give the link, and still keep the repo copy. Otherwise tell the user the path and how to open
   it: `open docs/copilot/agent-context.html` on macOS, `xdg-open` on Linux, `start` on Windows, or
   drag it into a browser. It works offline, ticks stay in that browser, and it prints cleanly.

## What to hand back

- The map: `docs/copilot/agent-context.html` and `docs/copilot/agent-context.json`, and the link if you
  published it.
- Four to six lines in chat: the sources by ring, the writes and who approves each, the riskiest row
  and why, and the first three checklist items to build.
- What isn't verified yet (the map's open questions), plainly: demo identities, unconfirmed APIs,
  untested gates, a Slack or Teams click that hasn't been run end to end.
- Next: `/functional-copilot`, which writes the spec from `agent-context.json` and builds. Later,
  `/deploy` reads the rows on rings 3 to 7 and decides where each runs.

## Gotchas that fail quietly

- **Context travels on every run.** `useAgentContext` values are sent with each run, so keep them to
  ids, summaries and the open record. Read large documents with a tool that returns one section and
  its citation (Open Harvey's `readMatter`).
- **Start-up reads go stale.** Open Harvey's route reads `playbook.md` into the agent's instructions
  when the module loads; an edited playbook needs a restart. Published rules ride in context instead.
- **A browser-only gate doesn't exist in chat.** `useHumanInTheLoop` renders only in a browser.
  Moving a write to Slack or Teams means rebuilding its gate on the server or as a Channels button.
- **OpenBot's `ask` card goes to the requester**, the person whose message triggered the action, not
  to a business approver. Approvals by someone else belong in the system of record or a Channels flow.
- **Demo identities.** Open Harvey's user is a constant and its approvals view lets one presenter act
  as every approver. On the map, mark identity *not verified* until the server binds the signed-in
  user.
