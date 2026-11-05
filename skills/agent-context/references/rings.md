# The seven rings, closest first

Each ring lists what it's for, the CopilotKit or AG-UI piece, whose identity it uses, how fresh its data
is, how its writes are gated, and what fails quietly. Everything here was checked on 2026-11-05 against
the installed packages in `starters/open-harvey/node_modules/@copilotkit/` (`react-core`, `runtime`,
`core` 1.84.1; `channels-*` 0.12.0) and docs.copilotkit.ai. CopilotKit moves quickly: check names
against the developer's installed version before you put them on the map.

## Contents

1. In the app
2. On the computer
3. Your server
4. Org systems (MCP)
5. People (Channels SDK)
6. Coworkers (OpenBot)
7. Memory (CopilotKit Intelligence)
8. Developer tools: the web inspector

---

## 1. In the app

For: the record open on screen, the selection, filters, the step the person is on, anything the app
already holds.

- **Context the agent reads:** `useAgentContext({ description, value })` from
  `@copilotkit/react-core/v2`. `value` is any JSON-serializable value; it is sent with every run, and
  the next run sees the new value when the app's state changes. Write the `description` as a sentence
  the model can act on.
  [Docs](https://docs.copilotkit.ai/shared-state/agent-readonly). Open Harvey:
  `src/copilot/useAppContext.ts` registers five entries built in `src/lib/app-context.ts` (user, matters,
  the active matter, learned rules, analytics).
- **State both sides edit:** `useAgent()` returns the AG-UI `agent`. Read `agent.state` and write with
  `agent.setState(...)`; pass `updates: [UseAgentUpdate.OnStateChanged]` to re-render on changes.
  [Docs](https://docs.copilotkit.ai/shared-state). Use it when the agent's own state *is* what's on
  screen. Otherwise keep your app store and let tools write to it, as Open Harvey does.
- **Actions in the app:** `useFrontendTool({ name, description, parameters, handler })`; the handler
  runs in the browser. [Docs](https://docs.copilotkit.ai/frontend-tools). Handlers should read live
  state when they run (Open Harvey reads `appStore.getState()`), because a registration keeps its first
  handler until a dependency changes.
- **Gate:** `useHumanInTheLoop` registers a tool whose result is the person's choice, shown as a card.
  [Docs](https://docs.copilotkit.ai/human-in-the-loop). Open Harvey: `src/copilot/useRequestApproval.tsx`
  (Send for approval) and `useProposePlan.tsx` (approve the plan). Refuse in the tool's code too, with
  a test: Open Harvey's `runPlanTask` refuses before the plan is approved.

- **Show, don't narrate:** cards the agent renders with `useComponent`; agent-composed UI through the A2UI
  renderer (`@copilotkit/a2ui-renderer`). A chat or sidebar (`CopilotChat`, `CopilotSidebar`) only where
  it fits the workspace; Open Harvey's thread sits in the matter view, beside the document.

Acts as: the signed-in user. The browser sends their auth to the runtime with `<CopilotKitProvider headers={…}>`
(a record or a per-request builder) or `credentials` for cookies; the server resolves who they are (see
ring 3). Freshness: live, every run. Gotcha: everything in context travels on every run. Send ids,
summaries and the open record; read big documents with a tool that returns one section and its
citation (Open Harvey's `readMatter`).

## 2. On the computer

For: files on the person's disk, and documents open in a desktop app.

First ask where the runtime runs. CopilotKit Runtime on a server can't see the laptop, so the bridge is
a **`useFrontendTool` handler running on the person's machine**: it reads what the job needs and returns
it to the agent, and `useAgentContext` sends what's open. Only the host around the hooks changes:

- **The browser.** The person picks or drops a file, and their pick is the scope. In the chat,
  `useAttachments` (`@copilotkit/react-core/v2`) handles files people attach: selection, drag and
  drop, upload. An attachment goes into the message as an input part (inline data, or the URL your
  `onUpload` returns), so the model gets the whole file. When only part of it should leave the
  machine, read it in a `useFrontendTool` handler and return just those sections.
- **A desktop shell** (Electron, for example). The CopilotKit app runs in the window; a
  `useFrontendTool` handler asks the shell's main process to read or write files under one root folder,
  and the main process refuses paths outside it. The IPC and file APIs are the shell's.
- **A plugin panel inside a desktop app.** Many desktop apps (editing, design, office) host extension
  panels: small web views with a scripting API into the open document. Run the CopilotKit app in the
  panel, send the open document and selection with `useAgentContext`, and call the host's scripting
  API from `useFrontendTool` handlers. Check what the host's panel SDK allows (network, file access,
  storage) before you plan on it, and name the host's API as the host's.

Footnote: a local MCP server is the generic alternative. `BuiltInAgent`'s `mcpServers` speaks `http` or
`sse` only (no stdio), so a local server listens on `127.0.0.1` and works only when the runtime runs on
the same machine (inside a desktop shell, or local development); a cloud runtime can't reach it.

Related: `webmcp: true` on a frontend tool also exposes it to browser agents through the WebMCP API,
where the browser supports it. [Docs](https://docs.copilotkit.ai/webmcp). That's the other
direction: the browser's agent calling your app.

Acts as: the person's operating-system account, limited to the folder. Freshness: read when the tool
runs, or an index with its age shown; watch for changes on open. Gate: writes to disk or to the host's
document go through `useHumanInTheLoop`; additive, undoable edits (a marker, a comment) may rely on the
host's undo, and the row says so. Gotcha: uploading a local file's contents to a model or a third-party
API is a write of that data to someone else.

## 3. Your server

For: the organization's APIs, anything that needs a secret, and anything that must run with no browser
open (chat, schedules, coworkers).

- **Server tools:** `defineTool({ name, description, parameters, execute })` from
  `@copilotkit/runtime/v2`, passed as `new BuiltInAgent({ model, tools: [...] })`. `parameters` is a
  Standard Schema such as Zod. [Docs](https://docs.copilotkit.ai/server-tools).
- **Identity:** `execute(args)` receives only the arguments: no user, headers or thread id. To act as
  the user, build the agent per request. `new CopilotRuntime({ agents: ({ request }) => ({ default:
  new BuiltInAgent({ ..., tools: toolsFor(userFrom(request)) }) }) })` lets each tool close over the
  user resolved from that request, and their token for on-behalf-of calls. The runtime's
  `identifyUser: (request) => ({ id, name })` names the user for threads and Intelligence; it doesn't
  block anyone, so reject unauthenticated requests in `createCopilotRuntimeHandler({ hooks: {
  onRequest } })`. [Docs](https://docs.copilotkit.ai/auth).
- **Gate:** `defineTool({ name, description, parameters, interrupt: true })` with no `execute` pauses
  the run with an AG-UI interrupt; the person's answer resumes it. Or keep the gate in the app
  (`useHumanInTheLoop`) and call the server only after the click. Either way, the server re-checks
  that the approver is a real, signed-in person allowed to approve.
- **Steps:** `BuiltInAgent`'s `maxSteps` defaults to 1 (10 when learned skills are available), so a run
  can end at a server tool's result before the model answers. Set `maxSteps` for an agent with server
  or MCP tools.
- **Secrets:** in the server's environment. The browser never holds them.

**Any AG-UI backend.** If the agent is LangGraph, Mastra, Google ADK, Pydantic AI or another framework
behind CopilotKit Runtime through its AG-UI integration, every run still carries the `context` from
`useAgentContext` and the frontend `tools` (they're fields of AG-UI's run input). Server-side tools are
then that framework's tools; give them the same identity, scope and gate.
[AG-UI integration](https://docs.copilotkit.ai/agentic-protocols/ag-ui).

Open Harvey today: no server tools. Every tool runs in the browser, and the route says the agent needs
no backend tools of its own (`src/app/api/copilotkit/[[...slug]]/route.ts`). The server only reads the
playbook into the instructions at start-up (`src/lib/server-data.ts`). Moving a write to chat or to a
real system means moving its tool and its gate here.

## 4. Org systems (MCP)

For: systems that already have an MCP server, or that several agents should share through one.

- **Connect:** `new BuiltInAgent({ mcpServers: [...] })` with `{ type: "http", url, name, options }`
  (Streamable HTTP) or `{ type: "sse", url, name, headers }`. Give every server a `name`: on a tool
  name clash, tools are exposed as `<name>_<tool>`. [Docs](https://docs.copilotkit.ai/mcp-servers).
- **Auth:** a static bearer token, in `headers` (sse) or added by a wrapped `fetch` in `options.fetch`
  (http). For per-user or expiring tokens, pass clients you manage in `mcpClients` (anything with
  `tools()`, for example `createMCPClient` from `@ai-sdk/mcp`). Per-user OAuth for MCP is not built in
  to 1.84.1; if the row needs it, build per-request clients with the user's token and say so.
- **Scope:** the agent gets every tool the server lists. If that's more than the jobs need, use a
  narrower server or an `mcpClients` provider whose `tools()` returns only the ones you allow.
- **Writes:** an MCP tool the agent calls runs on the server with no browser card. Prefer MCP for reads,
  and route each write through a gated tool (an interrupt tool, or a `useHumanInTheLoop` card that
  calls the system after the click). In OpenBot, an `ask` rule gates it (ring 6).
- **MCP Apps:** `new CopilotRuntime({ mcpApps: { servers: [...] } })` renders an MCP server's UI
  resources in the chat, sandboxed, through the MCP Apps renderer (`@copilotkit/mcp-apps-renderer`).

- **Failures are quiet:** a server that fails to connect, or whose `tools()` call fails, is skipped
  for that run with only a console error, and the agent carries on without its tools. Watch for it in
  the logs and the web inspector, and tell the person when a source they rely on is missing.

Acts as: whoever the token belongs to. A shared server token is a service identity; write its name,
and how the server narrows it to what the user may see. Freshness: live per call. Gotcha: OpenBot adds
MCP servers by `https` URL on a public hostname only, so local development needs a tunnel.

## 5. People (Channels SDK)

For: reaching people where they work, in Slack or Teams. Approvers, notifications, a question for the
data owner.

- **Packages:** `@copilotkit/channels-core`, `channels-slack`, `channels-teams`,
  `channels-intelligence` and `channels-ui` 0.12.0 come with runtime 1.84.1. The docs import
  `createChannel` from the umbrella `@copilotkit/channels`, which the starters don't install; add it
  with `--save-exact` if you follow the docs. The docs' tested pair is older (channels 0.11.0 with
  runtime 1.73.3); don't downgrade a starter to match it.
- **The channel:** `createChannel({ identifyUser, store, ... })`. The Slack adapter `slack({ botToken,
  appToken })` uses Socket Mode by default (`signingSecret` only with `socketMode: false`); the Teams
  adapter `teams({ clientId, clientSecret, tenantId })`. Buttons: `channel.onInteraction(id, ctx =>
  ...)`. Cards and tools that run in the channel process: `defineChannelTool`, whose handler gets `{
  thread, user, actor, platform }` and posts with `thread.post(...)`.
  [Reference](https://docs.copilotkit.ai/reference/channels), [Slack](https://docs.copilotkit.ai/slack).
- **Managed Slack and Teams** through Intelligence: `new CopilotRuntime({ intelligence: new
  CopilotKitIntelligence({...}), channels: [channel] })`, served by `createCopilotNodeListener({ runtime
  })` from `@copilotkit/runtime/v2/node`. The plain SSE runtime takes no channels.
  [Docs](https://docs.copilotkit.ai/intelligence/channels).
- **Name the mode on the row; it decides the worker's secrets.** In a managed channel the worker holds
  only `CPK_INTELLIGENCE_API_KEY` and `CHANNEL_CODE`, and the Slack and Teams credentials stay in
  Intelligence ([docs](https://docs.copilotkit.ai/slack/deploy-and-operate)). With a direct adapter
  (`slack({ botToken, appToken })`, `teams({ clientId, clientSecret, tenantId })`) the worker holds the
  provider's tokens itself.
- **Approvals that take days** (checked in channels 0.12.0):
  - A channel can't start a conversation yet: `thread.subscribe()` records the conversation, but
    proactive delivery is "not yet wired". Post the first approval card from your server with the
    provider's own API, and let the button come back through `channel.onInteraction`.
  - `thread.awaitChoice` times out after one hour by default, and only the person who started the
    turn may answer unless you set `answerableBy: "conversation"`. It suits a quick question, not a
    multi-day approval.
  - A bound button stays clickable for 7 days, and the default store is in memory. Give the channel a
    durable `StateStore`, and keep the approval as a record on the request, not as a paused run.
- **A long-running process:** the channel holds a connection open. Run it as a service (Node 22+), not
  a serverless function. Without Intelligence you also own its state, locking and retries.
  [Docs](https://docs.copilotkit.ai/slack/connect).

Acts as: the provider-verified person. `identifyUser` on `createChannel` is required: `"platform"` or
a callback that maps the provider's actor to your user. The actor's kind is metadata, never
authorization. Map it to your directory, and refuse a decision that breaks separation of duties.
[Docs](https://docs.copilotkit.ai/slack/identity-and-memory). Gate: the button click, recorded as an
event on the record (who, decision, comment, time). It is not the requester's run resuming. Freshness:
pushed. Gotcha: chat has no browser, so the tools and gates a web run gets from `useFrontendTool` and
`useHumanInTheLoop` don't exist there. Move them to the server first. Test a real click end to end
before promising it.

## 6. Coworkers (OpenBot)

For: an agent that works for the team with nobody at the screen (a queue, a schedule, a request in
chat), governed by grants, approval rules and an audit trail, on the team's own infrastructure.

- [OpenBot](https://github.com/CopilotKit/openbot) is CopilotKit's open-source (MIT, beta) AI coworker
  template. A tenant package `examples/<name>/` (`agents.yaml`, `skills.yaml`, `channels.yaml`,
  `model.yaml`, `brand.yaml`, `knowledge.yaml`) is selected with `TENANT_PACKAGE_DIR`.
- **Tools** come from MCP servers added by URL (`https`, public hostname). Each server takes a bearer
  token that OpenBot stores and sends on every call (`starters/openbot-headcount/examples/northstar/
  hr-system/token.ts`). Put the rules and arithmetic in the server.
- **Approval rules** per tool: `allow`, `ask`, `hand_off`, `deny`; the strictest matching rule wins.
  Name each tool: `allow` per read, `ask` per write. Avoid `<server>/*` → `allow`, because a write
  added later inherits it silently (the workshop's `connect.ts` files use the wildcard for brevity).
- **Audit:** every call and decision is in Admin → Audit.
- **Limits:** the `ask` card goes to the requester, not a business approver. `knowledge.yaml` takes
  only Drive or OneDrive roots. Slack and Teams come through OpenTag, in preview.
  `OPENBOT_SINGLE_USER=true` is for a laptop only.

Starters: `starters/openbot-headcount/` (HR) and `starters/openbot-legal/` (the Open Harvey story as a
coworker, with the Northstar Legal MCP server). Acts as: the coworker, with only its grants; the MCP
server sees OpenBot's token (a service identity), and OpenBot's audit trail records who asked.

## 7. Memory (CopilotKit Intelligence)

For: what must outlast one conversation. The threads, what the agent remembers about a person or a
project, and what it learns from corrections.

- **Intelligence mode:** `new CopilotRuntime({ agents, intelligence: new CopilotKitIntelligence({
  apiKey, ... }), identifyUser })`. Intelligence requires `identifyUser`, and rejects an empty name.
  Open Harvey's switch, `src/lib/intelligence.ts`, keeps it off by default and turns it on only when
  both `CPK_INTELLIGENCE_ENABLED` and `CPK_INTELLIGENCE_API_KEY` are set, which the user does.
- **Threads:** `useThreads({ agentId })` lists the signed-in user's threads, live, with rename, archive
  and delete (rename and archive need Intelligence). [Docs](https://docs.copilotkit.ai/threads-lifecycle).
- **Memory:** `useMemories()` returns the memories with `addMemory`, `updateMemory`, `removeMemory`.
  A memory has a kind (`topical`, `episodic`, `operational`) and a scope (`user` or `project`). The
  runtime grants access per request with `memory: { access(...) }` → `none`, `read` or `read-write`
  for the user and the project. It needs Intelligence and the memory entitlement.
  [Docs](https://docs.copilotkit.ai/intelligence/memories).
- **Analytics and insights:** how the copilot is used, from the threads.
  [Docs](https://docs.copilotkit.ai/intelligence/analytics).
- **Automatic Learning:** threads from one kind of work are grouped in a learning space (a "learning
  container": `getLearningContainerId` on `CopilotKitIntelligence`); Intelligence proposes skills from
  them, and a person reviews and publishes each one. A published skill is a versioned set of
  instructions loaded into the agent. [Docs](https://docs.copilotkit.ai/learning).
- **Trajectories:** browser activity outside the chat (clicks, page changes, an app's own decision
  events) captured through `@copilotkit/learning` or the provider's `learning` prop.
  **Trajectories are off on hosted Intelligence today**, so don't make a row depend on them there; learn
  from the threads instead. `useLearnFromUserAction()` records a single UI action (a rename, an edit,
  an override). Open Harvey sends its gated decisions as Trajectory events
  (`src/lib/trajectory-events.ts`), and a named person publishes the learned rule.

Acts as: the user resolved on the server by `identifyUser`, never a name from the browser. Scope:
decide what memory may hold (no secrets, no data the policy keeps out), at which scope, and who can
see and delete it. Read or write: saving a memory is a write; the next run reads it as context. Gate:
the off-by-default switch, the per-user `access` grant, and a person's click to publish a learned rule.

## 8. Developer tools: the web inspector

Not a ring, but how you check the map against reality. The CopilotKit web inspector
(`@copilotkit/web-inspector`) shows the AG-UI stream of each run: the context entries, the tools, the
state and the events. It's on by default in development on localhost and off on remote hosts and in
production; set `enableInspector` on `<CopilotKitProvider>` to choose (Open Harvey sets it in
`src/components/LegalApp.tsx`). Use it to confirm every ring 1 row reaches the agent and nothing the
map keeps out does.
