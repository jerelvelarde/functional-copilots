# Where the copilot lives: the seven placement rows

The talk's principle: a functional copilot sits inside the app space where the work happens, not in a
chat box beside it. In practice that means three things:

1. **It sees what the user sees.** It knows the open object, the selection and the position (the
   playhead, the passage, the row) without anyone pasting anything.
2. **Its work lands in the workspace's own objects.** Redlines go into the redline column, a proposed
   cut onto a ghost track, a coded invoice into the grid row. It doesn't hand back paragraphs that the
   user then retypes.
3. **Writes wait for a person, in the place they happen.** The gate sits where the change would land
   and shows exactly what will change.

A chat thread can be one of its surfaces (Open Harvey's thread sits at the centre of the matter). It
qualifies as long as the thread is bound to the open matter and its outputs open beside it as
workspace objects.

API names below come from `@copilotkit/react-core/v2` and were checked against the installed 1.84.1
packages (`starters/open-harvey/node_modules/@copilotkit/react-core/dist/v2/*.d.mts`). CopilotKit
ships often, so check any piece not listed here before you write it into a map.

## The functional agent stack (the canonical table)

Pasted word for word from `/functional-copilot`'s `references/blueprint.md`, "The canonical table".
Change it there first, never here. Be prescriptive: every placement row and checklist "how" names the
CopilotKit piece; mention generic alternatives in a footnote at most.

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

Where `/user-map`'s seven placement rows sit in it:

- **Layer 1, products and interfaces:** where it lives, what it renders, and what waits for a person.
- **Layer 2, domain capabilities:** what it can do.
- **Layer 3, context and knowledge:** what it reads and what it learns from.
- **Shared state:** spans layers 1 and 3.

In this skill, Context and access means `/agent-context` (step 2), which maps layers 3 and 4 in depth.

## Row 1: Where it lives (the surface)

**Question:** Which panel or surface does it occupy, and where does its work land?

The surface options, roughly in order of how much they respect the workspace:

| Surface | Use when | Example |
| --- | --- | --- |
| **In the object** (suggestions drawn into the object itself: ghost clips, suggested redlines, a draft grid row) | The work product is the object | A proposed cut on a ghost track |
| **Docked panel beside the inspector or detail pane** | The copilot works on the selection | An editing copilot under the inspector |
| **A thread that is part of the workspace, with outputs opening beside it** | The work is a multi-step plan the user approves and watches | Open Harvey's matter thread with its plan rail |
| **Inline at the selection** (a popover or a slash command in the editor) | Short, local actions on one passage or cell | "Tighten this paragraph" |
| **Command bar** | Quick actions across the app | "Go to every unresolved note" |

A placement usually pairs one surface where the copilot sits (`surface.region`) with the regions where
its work lands (`surface.also`). If the copilot needs a panel that today's software doesn't have, add it
as a region with `"new": true`.

**CopilotKit:** the provider is `CopilotKitProvider` (`runtimeUrl` points at the runtime). The surface
is your own panel built on the v2 hooks
([headless UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui)). Use `CopilotSidebar`,
`CopilotChat` or `CopilotPopup` ([prebuilt components](https://docs.copilotkit.ai/prebuilt-components))
only where a chat fits the workspace. Open Harvey: `src/components/AssistantView.tsx` and
`src/components/OutputPanel.tsx`.

**The host.** There are four routes. Set `meta.route` (`own-app`, `embedded`, `plugin` or `chat`) and
describe the route in `meta.building`.

- **(a) Your own web app, following the same pattern.** This is the default, and it's where
  CopilotKit's React hooks run. Many teams build their own workspace and sync it with the vendor's tool.
  AI editing workspaces such as Kino.ai are in this category, and so is Open Harvey for legal.
- **(b) Your own web app, embedded in the vendor's tool as an app panel.** Many ticketing, CRM and ERP
  tools host an iframe app in a side panel, next to the record the user has open. When the role lives
  in that tool all day, this is often the best placement. The panel gets the open record from the
  host's app API, and CopilotKit runs inside your page as usual. Sign-in inside the iframe and the
  panel's width are the usual snags. Mark it `assumed` until a spike runs CopilotKit in that panel.
- **(c) A native plugin panel inside the software** (an Office add-in, an Adobe UXP panel, a browser
  extension). It's a different host, with its own runtime limits. Treat "CopilotKit runs in that panel"
  as `assumed` until a spike proves it, and make that spike the first checklist item.
- **(d) A chat surface: Slack or Teams, through the Channels SDK.** Use this when the role lives in chat,
  for example IT or ops staff working requests in a channel. The rows below change; see "Route (d)".

## Row 2: What it reads (`useAgentContext`)

**Question:** What must it know without being told? Who the user is, the open object, the selection,
the position, the rules in force.

```ts
useAgentContext({ description: string, value: JsonSerializable }): void   // no deps argument
```

Each entry goes with every run, and the next run sees the new value when app state changes. Register
several small entries (the user, the open object, the selection), not one big blob. Send ids, names,
times and short text, never media or whole documents. Fence text that people typed as quoted data, so
it's never read as instructions (Open Harvey's `quotedText`).

[docs](https://docs.copilotkit.ai/agent-app-context) · Open Harvey: `src/copilot/useAppContext.ts`,
built in `src/lib/app-context.ts`.

## Row 3: What it can do (`useFrontendTool`)

**Question:** What can it do in the app, named in the domain's own verbs? For example `findTakes`,
`runPlanTask`, `codeInvoice` or `assignTicket`.

```ts
useFrontendTool(tool: { name, description, parameters, handler, ... }, deps?: ReadonlyArray<unknown>): void
```

The tool runs in the browser, with the app's data and the user's session. The model picks the tool; your
tested code does the work (calculations, rule checks, routing). **Gotcha:** the handler keeps the closure
from the render that registered it, and omitting `deps` registers it once. So read live state when the
handler runs, from a store getter or a ref, not from a `useState` value captured at registration.

[docs](https://docs.copilotkit.ai/frontend-tools) · Open Harvey: `src/copilot/useReviewTools.ts`, with
its handlers in `src/lib/agent-tools.ts`.

## Row 4: What it renders (`useComponent`)

**Question:** Which pieces of its work does the user need to *see* and check, as UI rather than prose?

```ts
useComponent(config, deps?)   // registers a component as a tool the model calls with typed args
```

`useComponent` renders inline in the chat thread, as cards. To draw the copilot's work *into the
workspace* (a ghost track, a redline row, a highlighted passage), have a frontend tool write it to app
state and let your own component render that state. That is row 6, shared state. Most good placements
use both: a card in the thread that summarises, and the object itself in the workspace. Use
`useRenderTool` to change how existing tool calls appear in the thread (Open Harvey folds them into one
"Working" line).

[docs: display-only](https://docs.copilotkit.ai/generative-ui/your-components/display-only) ·
[interactive](https://docs.copilotkit.ai/generative-ui/your-components/interactive) · Open Harvey:
`src/copilot/useGenerativeUI.tsx` and `src/copilot/useWorkRows.tsx`.

*Footnote:* when the agent should describe the UI instead of calling your component, CopilotKit also
renders A2UI surfaces (`@copilotkit/a2ui-renderer`,
[docs](https://docs.copilotkit.ai/generative-ui/a2ui)) and MCP Apps
(`@copilotkit/mcp-apps-renderer`, [docs](https://docs.copilotkit.ai/generative-ui/mcp-apps)). For a
functional copilot's own workspace objects, `useComponent` is the default.

## Row 5: What waits for a person (`useHumanInTheLoop`)

**Question:** Which actions change a record, send something, spend money, delete something, or reach
another person? Each one waits for a click that shows exactly what will happen.

```ts
useHumanInTheLoop(tool, deps?)   // the tool is a UI; it renders with `respond`, and the run waits
```

`respond` exists only while the call is executing, so guard for it. Common gates are:

- approving a plan before work starts;
- applying a proposal to the real record;
- sending for approval;
- sending outside the company;
- exporting or deleting.

Approvals made by *other* people (an approver approves or sends back) are people's clicks in the app,
not tools the agent can call.

[docs](https://docs.copilotkit.ai/human-in-the-loop) · Open Harvey: `src/copilot/useProposePlan.tsx`
and `src/copilot/useRequestApproval.tsx`.

## Row 6: What both edit (shared state)

**Question:** Which artifact do the user and the copilot both change, and who wins when they disagree?
The usual answer is that the human's edit wins and the copilot re-checks it.

CopilotKit gives two ways to do it ([docs](https://docs.copilotkit.ai/shared-state)). Pick one and
name it:

1. **App-owned state plus context.** This works with any agent and is what both workshop starters use.
   The artifact lives in your store. The agent reads it through `useAgentContext` and writes it through
   a tool such as `updateRedline` or `proposeCut`. When the human commits an edit, post a short message
   and start a run so the copilot reacts. That uses `useAgent()` and `useCopilotKit()`, with
   `agent.addMessage(...)` and then `copilotkit.runAgent({ agent })`. Open Harvey:
   `src/copilot/useTellCopilot.ts` and `src/lib/store.ts`.
2. **AG-UI agent state.** `useAgent()` returns `{ agent }`, which has `agent.state` and
   `agent.setState(...)`. This suits agents that own the workflow, such as LangGraph-style graphs. With
   `BuiltInAgent`, a state change doesn't start a run, which is why Open Harvey chose pattern 1.

## Row 7: What it learns from (CopilotKit Intelligence)

**Question:** Which corrections does this workspace already produce? A send-back with a comment, a
re-trimmed clip, a recoded invoice line, a reopened ticket. And who reviews a lesson before it changes
the copilot's behaviour?

Learning comes from corrections people make, turned into a rule or skill that a named person publishes.
In production that is CopilotKit Intelligence ([docs](https://docs.copilotkit.ai/learning)):

- it stores threads and memory, and gives you analytics and insights;
- Automatic Learning groups threads from one kind of work into a learning space, summarises recurring
  patterns as Insights, and proposes skills that a person reviews before publishing. A published skill
  is a versioned set of instructions the agent loads; the model itself doesn't change;
- Trajectories (browser activity captured with `@copilotkit/learning`) are off on hosted Intelligence
  today. Name them as a later option, not a dependency.

Open Harvey turns repeated send-backs into a proposed rule that the General Counsel publishes
(`src/lib/learning.ts`), with Intelligence behind an off-by-default switch (`src/lib/intelligence.ts`).
`/agent-context` and `/secure-governance` go deeper on this.

## Route (d): the copilot in Slack or Teams

When `meta.route` is `"chat"`, there's no browser behind a message. The page then shows these rows, in
place of the browser hooks. The names were checked in `@copilotkit/channels-core` and
`@copilotkit/channels-ui` 0.12.0 (installed with runtime 1.84.1). For the details, including the
approver-click caveats, see `/functional-copilot`'s `references/channels-and-openbot.md`.

| Row | CopilotKit piece | Notes |
| --- | --- | --- |
| Where it lives | The Channels SDK: `createChannel`, with a Slack or Teams adapter | The conversation it answers in: a channel, a thread or a DM. A Channels worker is a long-running service, not a serverless function. [docs](https://docs.copilotkit.ai/slack), [Teams](https://docs.copilotkit.ai/teams) |
| What it reads | `thread.runAgent({ context })` and `thread.getMessages()`, plus the sender's identity | The thread and who sent it, and the record it's about, loaded on the server by request id. [reference](https://docs.copilotkit.ai/reference/channels) |
| What it can do | `defineTool` in the `BuiltInAgent`'s `tools` (from `@copilotkit/runtime/v2`), or `defineChannelTool` | Tools run on the server and call the same tested functions a web tool would. [docs](https://docs.copilotkit.ai/server-tools) |
| What it renders | Channels UI components (`Message`, `Section`, `Fields`, `Table`, `Actions`, `Button`) posted with `thread.post(...)` | The chat equivalent of `useComponent` cards. |
| What waits for a person | `thread.awaitChoice(ui, { answerableBy })`, or a `Button`'s `onClick` handler that does the write | `answerableBy: "initiator"` (the default) lets only the person who started the turn answer; `"conversation"` lets anyone in it answer, so the handler must check that the clicker is the expected approver. Whether a click resumes a paused agent run is to verify. [docs](https://docs.copilotkit.ai/slack/interactive) |
| What both edit | The record on the server: a `StateStore` or your database, keyed by request id | Web and chat then edit the same record. [docs](https://docs.copilotkit.ai/slack/persistence-and-scaling) |
| What it learns from | CopilotKit Intelligence | Channels threads can go to Intelligence too. [docs](https://docs.copilotkit.ai/intelligence/channels) |

The wireframe still helps: use the inbox-and-thread pattern (`ui-patterns.md`), with the channel, the
thread, the composer and the app's own panel as regions.

The route is where the copilot runs; `meta.shape` is what the work is. They're independent. A copilot
in Slack or Teams is usually a *one request → approval chain* or *Q&A with a write at the end*; a
*workspace assist* lives in the expert tool itself (route a, b or c).

## Checked links and files

Every docs link below returned 200 on 2026-11-05. (A missing docs page returns 404, so they are real
pages.)

| Piece | Docs | Starter file (Open Harvey) |
| --- | --- | --- |
| `useAgentContext` | https://docs.copilotkit.ai/agent-app-context | `starters/open-harvey/src/copilot/useAppContext.ts` |
| `useFrontendTool` | https://docs.copilotkit.ai/frontend-tools | `starters/open-harvey/src/copilot/useReviewTools.ts` |
| `useComponent` | https://docs.copilotkit.ai/generative-ui/your-components/display-only | `starters/open-harvey/src/copilot/useGenerativeUI.tsx` |
| `useComponent` (interactive) | https://docs.copilotkit.ai/generative-ui/your-components/interactive | `starters/open-harvey/src/copilot/useGenerativeUI.tsx` |
| `useHumanInTheLoop` | https://docs.copilotkit.ai/human-in-the-loop | `starters/open-harvey/src/copilot/useProposePlan.tsx`, `useRequestApproval.tsx` |
| Shared state, `useAgent` + `useCopilotKit` | https://docs.copilotkit.ai/shared-state | `starters/open-harvey/src/copilot/useTellCopilot.ts`, `src/lib/store.ts` |
| Chat and custom surfaces | https://docs.copilotkit.ai/prebuilt-components, https://docs.copilotkit.ai/custom-look-and-feel/headless-ui | `starters/open-harvey/src/components/AssistantView.tsx` |
| Which hook when | https://docs.copilotkit.ai/concepts/which-hook | — |
| Generative UI overview | https://docs.copilotkit.ai/concepts/generative-ui-overview | — |
| Learning (Intelligence) | https://docs.copilotkit.ai/learning, https://docs.copilotkit.ai/intelligence/overview, https://docs.copilotkit.ai/intelligence/learned-skills, https://docs.copilotkit.ai/intelligence/memories, https://docs.copilotkit.ai/intelligence/analytics | `starters/open-harvey/src/lib/learning.ts`, `src/lib/intelligence.ts` |
| Web inspector | https://docs.copilotkit.ai/inspector | `starters/open-harvey/src/components/LegalApp.tsx` (`enableInspector`) |
| A2UI and MCP Apps renderers | https://docs.copilotkit.ai/generative-ui/a2ui, https://docs.copilotkit.ai/generative-ui/mcp-apps | — |
| AG-UI agents and the runtime | https://docs.copilotkit.ai/backend/ag-ui, https://docs.copilotkit.ai/backend/copilot-runtime | `starters/open-harvey/src/app/api/copilotkit/[[...slug]]/route.ts` |
| A gate before an approval chain | https://docs.copilotkit.ai/human-in-the-loop | `starters/copilotkit-headcount/src/copilot/useSubmitForApproval.tsx` |
| Hook reference pages | https://docs.copilotkit.ai/reference/hooks/useAgentContext (also `useFrontendTool`, `useComponent`, `useHumanInTheLoop`, `useAgent`) | — |

The starter paths are relative to the workshop repo. When the developer's repo already has the file (a
copy of a starter), use its local path (`src/copilot/useAppContext.ts`). Otherwise keep the workshop path
and say it's in the CopilotKit functional-copilots workshop starter.
