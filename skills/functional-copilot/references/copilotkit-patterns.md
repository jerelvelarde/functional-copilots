# CopilotKit patterns for each layer

How the functional agent stack (`blueprint.md`) maps onto CopilotKit and AG-UI in a React app: the
wiring is the agent harness and models layers; the hooks build products and interfaces, domain
capabilities and context. API names are from the V2 surface:
`@copilotkit/react-core/v2` in the browser and `@copilotkit/runtime/v2` on the server. The root
`@copilotkit/runtime` entry is the deprecated V1 runtime and does not export `BuiltInAgent` or
`createCopilotRuntimeHandler`. Checked against 1.84.1, the version both workshop starters pin.
CopilotKit ships often, so confirm every signature against the installed package
(`node_modules/@copilotkit/*/dist/**/*.d.mts`) before relying on it, and copy working usage from the
starter.

## The stack, named

The skill is prescriptive: build on CopilotKit, AG-UI and CopilotKit Intelligence, and use these names
in the spec and the build. All were checked against the installed 1.84.1 packages (Channels 0.12.0).

| Concern | Use | Package and API |
| --- | --- | --- |
| In the app space (UI) | CopilotKit React v2 hooks, mounted in the function's workspace: context, frontend tools, generative UI, human-in-the-loop, the agent and its shared state. A chat or sidebar only where it fits the workspace | `@copilotkit/react-core/v2`: `useAgentContext`, `useFrontendTool`, `useComponent`, `useHumanInTheLoop`, `useAgent`, `useRenderTool`, `useConfigureSuggestions`; `CopilotChat`, `CopilotSidebar`, `CopilotPopup` |
| More generative UI | A2UI surfaces and MCP Apps in the workspace | `@copilotkit/a2ui-renderer`, `@copilotkit/mcp-apps-renderer` |
| Protocol | AG-UI between the UI and any agent backend | the runtime's `BuiltInAgent`, or LangGraph, Mastra, Google ADK, Pydantic AI and others through their AG-UI integrations |
| Runtime | CopilotKit Runtime | `@copilotkit/runtime/v2`: `CopilotRuntime`, `createCopilotRuntimeHandler`, `BuiltInAgent` |
| Context and access | Live app context; server-side tools in the runtime; MCP servers; Slack and Teams; a self-hosted coworker | `useAgentContext`; `defineTool` in `BuiltInAgent`'s `tools`; `BuiltInAgent`'s `mcpServers`; the Channels SDK (`@copilotkit/channels-core`, `-slack`, `-teams`, `-intelligence`); OpenBot as a coworker package |
| Intelligence | Threads, memory, analytics and insights; Automatic Learning (learning spaces, and skills a person publishes); Trajectories | `CopilotKitIntelligence` on the runtime (`intelligence`, `identifyUser`); `learnedSkills` on `BuiltInAgent`; the provider's `learning` prop and `@copilotkit/learning` for Trajectories, **which are off on hosted Intelligence today** |
| Developer tools | The CopilotKit web inspector, for watching AG-UI events, tools and state while you build | `@copilotkit/web-inspector`, toggled with the provider's `enableInspector` (Open Harvey sets it to `false` for the stage) |

Footnote: the same patterns can be built on other stacks (a hand-rolled websocket, another agent UI
library). The skill does not cover them.

## Wiring

| Piece | Where | What it does |
| --- | --- | --- |
| Runtime route | Server: Next.js catch-all `app/api/copilotkit/[[...slug]]/route.ts` | `new CopilotRuntime({ agents: { default: agent } })` served by `createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" })`, all from `@copilotkit/runtime/v2`. The handler's default `mode: "multi-route"` serves `/info`, `/agent/default/run` and more, so the route must be a catch-all; a plain `route.ts` 404s them. (Or set `mode: "single-route"` and `useSingleEndpoint` on the provider.) Outside Next.js: `@copilotkit/runtime/v2/express`, `/v2/hono` or `/v2/node`. |
| Agent | Same file | `new BuiltInAgent({ model, prompt })`: a model id string such as `"openai/gpt-5.4-mini"`, or any AI SDK `LanguageModelV3` object, which is how the starter swaps in its scripted mock. An agent from LangGraph, Mastra, Google ADK, Pydantic AI and others can stand in its place through its AG-UI integration. |
| Provider | A client component wrapping the app (`src/components/LegalApp.tsx` in Open Harvey, `src/components/HeadcountApp.tsx` in the headcount starter) | `<CopilotKitProvider runtimeUrl="/api/copilotkit">` points the React app at the runtime. Everything inside it can register context, tools and UI. |
| Chat | Inside the provider, placed in the workspace | `CopilotChat`, `CopilotSidebar` or `CopilotPopup`, whichever fits the workspace (Open Harvey puts `CopilotChat` at the centre of the matter view), or the workspace's own UI on the same hooks. Import `@copilotkit/react-core/v2/styles.css` explicitly. |
| Inspector | The provider | `enableInspector` shows the CopilotKit web inspector (`@copilotkit/web-inspector`) in development; turn it off for demos and production. |

## Interfaces, capabilities and context, piece by piece

All from `@copilotkit/react-core/v2`.

| Building block | Hook | Notes |
| --- | --- | --- |
| Context awareness | `useAgentContext({ description, value })` | Describe who the user is, the open record, the draft, published skills. Sent with every run. Keep it small and current. Takes no deps argument. |
| Frontend tools | `useFrontendTool(tool, deps?)` | A tool the model can call that runs in the browser with the app's data and the user's session. Handlers call your pure functions. |
| Generative UI | `useComponent(config, deps?)` | Registers a component as a tool the model calls with typed args; it renders inline in the chat. |
| Human in the loop | `useHumanInTheLoop(tool, deps?)` | The tool *is* a UI: it renders with a `respond` callback and the run waits until the human answers. Branch on `ToolCallStatus` (`InProgress`, `Executing`, `Complete`). |
| Suggestions | `useConfigureSuggestions(config, deps?)` | Chips that post a sentence into the chat. |
| Programmatic send | `useAgent()` + `useCopilotKit()` | Add a user message and run the agent from your own UI, e.g. after an edit: `agent.addMessage(...)` then `copilotkit.runAgent({ agent })`. |

Server-side counterparts, from `@copilotkit/runtime/v2`, for tools that must run with no browser open
(Slack, Teams, schedules, secrets): `defineTool({ name, description, parameters, execute })` passed in
`new BuiltInAgent({ ..., tools: [...] })`, and `defineTool({ ..., interrupt: true })` with no `execute`
for a server-side human gate (the run pauses; the human's answer becomes the tool result on resume).
See `channels-and-openbot.md` before relying on an interrupt resuming from chat.

## Shared, editable state

The draft is one object that the human edits in the app and the agent edits through a tool. Two
patterns:

1. **App-owned state + context** (works with any agent; both starters' choice): the draft lives in an app
   store; the agent reads it through `useAgentContext` and writes it through an `updateDraft`-style
   frontend tool. When the human commits an edit, send a short programmatic message ("I changed base
   salary to $225,000.") so the agent reacts without being asked.
2. **AG-UI agent state** (when your agent supports it): the agent's state syncs to the UI as snapshots
   and deltas; the UI can set state back. Good for LangGraph-style agents that own the workflow. With
   `BuiltInAgent`, a state change does not start a run, so the agent won't react to an edit on its own
   (the starter's README explains why it chose pattern 1).

Either way, recompute derived values (cost, checks, routing) from pure functions in the UI so they update
instantly, and treat the agent as the one who explains and acts on them.

## A playbook review, pattern by pattern (Open Harvey)

Open Harvey (in the workshop repo: `starters/open-harvey/`) is the reference for the *review against a
playbook* shape. Each pattern below is
in its own file; copy the pattern, not the legal content. Paths are relative to the starter.

| Pattern | Hook or API | Where |
| --- | --- | --- |
| The plan is a card the user approves before anything runs (Approve plan / Not yet) | `useHumanInTheLoop` (`proposePlan`) | `src/copilot/useProposePlan.tsx`; the click in `src/lib/gates.ts` |
| Each checklist task is a tool call that ticks the task in shared state; the tool refuses before the plan is approved and runs tasks in plan order | `useFrontendTool` (`runPlanTask`) | `src/copilot/useReviewTools.ts`, handlers in `src/lib/agent-tools.ts`, the refusal in `src/lib/store.ts` |
| Findings cited to the exact passage; redlines as a blackline of the vendor's own words; the re-check card | `useComponent` (`showFindings`, `showRedlines`, `showRecheck`) | `src/copilot/useGenerativeUI.tsx`, `src/lib/blackline.ts` |
| A human edit to a redline in shared state: the agent hears it, re-checks the rule, and never overwrites it | `useAgent` + `useCopilotKit` (a message after each committed edit, queued while busy); `recheckRedline`, `updateRedline` | `src/copilot/useTellCopilot.ts`, `src/copilot/edit-queue.ts`, `src/lib/store.ts` |
| Routing, risk and every figure from tested pure functions; the model only picks the tool | — | `src/lib/review.ts` (`CHECKS`, `routeApprovals`, `totalContractValue`), `src/lib/plan.ts`, with tests |
| The send-for-approval card shows the route, the rule behind each approver and the reasons | `useHumanInTheLoop` (`requestApproval`) | `src/copilot/useRequestApproval.tsx`, `src/lib/gates.ts` |
| Send-backs become a proposed rule; a named person publishes it; the next plan carries it | — | `src/lib/learning.ts`, `src/components/panels/InsightsPanel.tsx`, `LEARNED_CHECKS` in `src/lib/review.ts` |
| Who is asking, the open matter, the published rules, and the Analytics figures and decision log go with every run; typed text sits under `quotedText` as data | `useAgentContext` | `src/copilot/useAppContext.ts`, built in `src/lib/app-context.ts`; figures from `src/lib/analytics.ts` |
| One question across a collection, one tool call per cell, every quote checked against its passage | `useFrontendTool` (`readCollection`, `fillCollectionCell`) | `src/copilot/useCollectionTools.ts`, `src/lib/collection.ts` |
| The agent's tool calls folded behind one live "Working" line | `useRenderTool` with name `"*"` and `group: true` | `src/copilot/useWorkRows.tsx` |
| A scripted model for demos and tests, picked when there is no key or `COPILOT_MODEL=mock` | a `LanguageModelV3` passed to `BuiltInAgent` | `src/lib/mock-model.ts`, `src/lib/demo-script.ts`, played in `demo-script.test.ts` |
| CopilotKit Intelligence behind an off-by-default switch; gated decisions sent as Trajectory events | runtime `intelligence` + `identifyUser`; provider `learning` prop; `copilotkit.emitTrajectoryEvent` | `src/lib/intelligence.ts`, `src/lib/trajectory-events.ts`, `src/copilot/useDecisionEvents.ts` (see `learning-loop.md`) |

## Gotchas that fail silently

- **`maxSteps` is unset by default, so a run stops after one step.** `BuiltInAgent` passes no stop
  condition unless `maxSteps` is set (it uses 10 only when learned skills are loaded), and the AI SDK then
  stops after one step. With a server tool, the run ends at the tool result and the user gets no reply.
  Set `maxSteps` to the fewest the flow needs: 2 or more with server tools.
- **A missing key means the mock, quietly.** Open Harvey's `chooseModel` (`src/lib/server-data.ts`)
  checks the key for the model's own provider, matching the runtime's `resolveModel`, and runs the
  scripted mock without it; a production build also needs `ALLOW_REAL_MODEL=true`. Look for the "mock"
  label.
- **The headcount starter still checks only `OPENAI_API_KEY`** (`copilotModel`) and has no production
  gate, so another provider silently runs the mock and a production build with a key runs the real model.

- **A handler must read live state when it runs.** `useFrontendTool`, `useComponent` and
  `useHumanInTheLoop` keep the handler (or render function) from the render that registered it. They
  re-register only when a value in `deps` changes (or the tool's name or `available` flag). Omitting
  `deps` is the same as passing `[]` (`deps ?? EMPTY_DEPS` in 1.84.1): one registration, kept. So a
  handler that closes over `useState` or a prop sees the first-render value (often empty): it compiles,
  passes unit tests, and answers "not found" live. Read live state at call time instead: a store getter
  (the starter's `appStore.getState()`) or a ref. Use `deps` for values that change the tool's
  definition, such as its description or parameters, not to keep a handler fresh.
- **Don't build a two-hop render.** A backend tool that tells the model to "now call the component"
  drops renders. Register the component itself as the tool.
- **Make renders replay-safe.** Reopened threads replay recorded results without live status changes;
  key the render off the recorded result or app state, not a transient status.
- **`respond` only exists while the HITL call is executing.** It is `undefined` in `InProgress` and
  `Complete`. Guard for it.
- **Tool results are stored with the thread.** Return what the model needs, never secrets or personal
  data it doesn't need.
- **Suggestion chips are user sentences**, never "Use the X tool to...". Routing guidance belongs in the
  tool description.
- **The chat root may paint its own background**; override it if it clashes with your app.
- **Pin `@ag-ui/client`** (if you import it directly) to the exact version the runtime bundles (1.0.2
  for 1.84.1).

## Testing

- Unit-test every pure function with the spec's worked examples (exact numbers).
- Test that each tool handler reads the current draft when it runs, not a value captured at
  registration: change the store after registering, call the handler, and check it used the new value.
- Walk the spec's demo script on a real model first: it is the only proof the model picks the right
  tools. Say so when you couldn't.
- Keep a short happy path of it on the scripted mock (the starter's `demo-script.test.ts`) for demos
  and CI: it proves the tools, cards and gates without a key.
- Evals beyond the demo script (cases scored on tool calls and the artifact): `/secure-governance`'s
  eval recipe.
