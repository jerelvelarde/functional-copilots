# Decision checklist: build your own functional copilot

For attendees of *Building Enterprise-Ready Functional Copilots* (CopilotKit, Thu Nov 5 2026). Keep one workflow
from your own department in mind. Each item is one decision, what the workshop starters do if you change nothing,
and the page to read before you decide.

- Repo: its URL is at the top of the [README](../README.md). Starters: `starters/open-harvey/` (the contract-review demo), `starters/copilotkit-headcount/` (web) and `starters/openbot-headcount/`.
- Sections 1 to 4 are **Build**, 5 is **Deploy** and 6 is **Govern**. The `skills/functional-copilot/` skill
  interviews you through sections 1 to 4 and writes a spec.
- Every link was checked against its topic on 2026-11-04. Where no documentation page covers a decision, the item
  says so.

---

## 1. Pick the first workflow

No CopilotKit page covers choosing a workflow. This section follows the workshop skill's
[picking checklist](../skills/functional-copilot/SKILL.md#picking-the-first-workflow) and the
[functional agent stack](../skills/functional-copilot/references/blueprint.md).

- [ ] **Does the candidate meet most of these seven?** Weekly or more, with a clear start and end. Ends in an
  artifact someone approves. Written rules plus unwritten ones. Numbers tedious to compute by hand. Two or more
  systems or teams. A metric you can measure before and after. A human gate catches a wrong answer before it does
  harm. Avoid document search ("answer any question about policy"), workflows with no approver, and anything that
  moves money or changes records without a person's click.
  - *Starter:* a manager's headcount request at the fictional Northstar Software, ending in an approval-ready business case.
- [ ] **One request at a time, or a queue of items?** A queue (say, failed invoice matches) reuses less of the starter.
  - *Starter:* one request at a time.
- [ ] **Which system changes after the last approval, and on whose click?** That write is a tool too, behind its
  own gate.
  - *Starter:* none. The request ends in a browser store; nothing is written to an HR system.
- [ ] **Who approves, in what order, and what happens when nobody answers?**
  - *Starter:* the department head, then the Finance Business Partner; the CFO joins above $350,000 fully loaded,
    for L7, or outside the plan (POL-APR-01, POL-APR-02). No reminders or escalations.
- [ ] **Which metric, and what is today's baseline?** Cycle time, send-back rate or first-pass approval rate.
  - *Starter:* none. The Insights panel counts send-backs per theme and the days each one added.

## 2. Agent and tools

- [ ] **Does each tool run in the browser or on the server?** Frontend tools run in the user's browser and can
  change app state. Server tools run on your backend, can use secrets and databases, and are the only kind that
  exists when no browser is open (Slack, Teams, schedules).
  - *Starter:* all six business tools are frontend tools (`useFrontendTool`); the agent has no server tools.
  - *Docs:* [Frontend Tools](https://docs.copilotkit.ai/frontend-tools),
    [Server Tools](https://docs.copilotkit.ai/server-tools) (`defineTool`),
    [Which Hook for Which Job](https://docs.copilotkit.ai/concepts/which-hook)
- [ ] **Is every number and rule check a pure function with a test, or does the model do arithmetic in prose?**
  - *Starter:* pure functions with unit tests in `src/lib/headcount.ts`; the OpenBot starter's Northstar HR does the same.
  - *Docs:* no CopilotKit page. Source: [the stack, domain capabilities](../skills/functional-copilot/references/blueprint.md#domain-capabilities).
- [ ] **Do your systems of record have an MCP server, or will you write one?** `BuiltInAgent` takes `mcpServers`
  (connected per run) or `mcpClients` (your own clients, for persistent connections or per-request credentials).
  - *Starter:* the web starter uses no MCP. The OpenBot starter's Northstar HR is an MCP server holding the plan,
    the bands, the cost model and the submit.
  - *Docs:* [MCP Servers](https://docs.copilotkit.ai/mcp-servers), [MCP](https://docs.copilotkit.ai/agentic-protocols/mcp)
- [ ] **`BuiltInAgent`, or your own agent framework over AG-UI?** `BuiltInAgent` runs inside the Copilot Runtime
  and replaces your agent rather than connecting to it; it takes OpenAI, Anthropic or Google models, among others.
  If you already have an agent in LangGraph, Mastra, Google ADK, CrewAI, Pydantic AI, Microsoft Agent Framework,
  AWS Strands or another AG-UI framework, connect that agent to the runtime instead.
  - *Starter:* one `BuiltInAgent` on OpenAI `gpt-5.4-mini` (`COPILOT_MODEL` changes it), and a scripted mock model
    when there is no `OPENAI_API_KEY`.
  - *Docs:* [Quickstart](https://docs.copilotkit.ai/quickstart),
    [Model Selection](https://docs.copilotkit.ai/model-selection),
    [Connect AG-UI agents](https://docs.copilotkit.ai/backend/ag-ui),
    [Write your own AG-UI agent](https://docs.copilotkit.ai/backend/custom-ag-ui-agent),
    [AG-UI supported frameworks](https://docs.ag-ui.com/introduction)

## 3. Agentic UX

- [ ] **What should the agent know without being told?** Context registered with `useAgentContext` goes into the
  agent's system prompt on every run.
  - *Starter:* the current user (a fixed persona), the plan, the draft, the requests and the published skills.
  - *Docs:* [Agent Context](https://docs.copilotkit.ai/agent-app-context)
- [ ] **Which results are components rather than prose, and of which kind?** Controlled (your component as a
  tool), declarative (A2UI composed from your catalog) or open-ended (MCP Apps), chosen per feature.
  - *Starter:* two read-only `useComponent` cards: a cost breakdown (a snapshot) and a live policy check.
  - *Docs:* [Generative UI](https://docs.copilotkit.ai/concepts/generative-ui-overview),
    [Display-only components](https://docs.copilotkit.ai/generative-ui/your-components/display-only)
- [ ] **What does the person edit, and should an edit start an agent turn?** AG-UI shared state (`useAgent`,
  `agent.state`, `agent.setState`) gives app and agent one state object.
  - *Starter:* the draft lives in an app store. The agent writes it with the typed `updateRequest` tool, and each
    human edit is posted to the agent as a message with `runAgent`, queued while the agent is busy. The starter
    README explains why it does not use AG-UI state for this.
  - *Docs:* [Shared State](https://docs.copilotkit.ai/shared-state), [Headless UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui)
- [ ] **Which actions need a person's click, and what does the gate show?** Tool-based gates use
  `useHumanInTheLoop`; graph-paused gates use `useInterrupt` with LangGraph. The docs say the Built-in Agent does
  not support interrupts, so with `BuiltInAgent` the gate is a human-in-the-loop tool. (The 1.84.1
  runtime types do define server interrupt tools, `interrupt: true`; treat that as untested until a
  run pauses and resumes end to end in your setup.)
  - *Starter:* `submitForApproval` shows the summary with **Submit** and **Keep editing**; nothing is submitted until Submit.
  - *Docs:* [Human-in-the-Loop](https://docs.copilotkit.ai/human-in-the-loop),
    [Interactive components](https://docs.copilotkit.ai/generative-ui/your-components/interactive)
- [ ] **Static suggestion chips, or chips the agent generates?** Write them as sentences a user would type.
  - *Starter:* static chips (`useConfigureSuggestions`) that change with the app state.
  - *Docs:* [useConfigureSuggestions](https://docs.copilotkit.ai/reference/hooks/useConfigureSuggestions)
- [ ] **Prebuilt chat (`CopilotChat`, `CopilotSidebar`, `CopilotPopup`), or a headless UI of your own?**
  - *Starter:* `CopilotChat` in its own panel, customised through its slots.
  - *Docs:* [Prebuilt Components](https://docs.copilotkit.ai/prebuilt-components), [Headless UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui)

## 4. Reach people where they work

- [ ] **Do approvers need Slack or Teams in v1? If so, will the tools and the gate run on the server?** A tool
  registered in the browser does not exist in a Slack or Teams message.
  - *Starter:* web only, with the tools and the gate in the browser. What moving them involves:
    [channels-and-openbot.md](../skills/functional-copilot/references/channels-and-openbot.md).
  - *Docs:* [Channels](https://docs.copilotkit.ai/slack), [Server Tools](https://docs.copilotkit.ai/server-tools)
- [ ] **Managed channels through Intelligence, or direct adapters you operate?** With managed channels,
  Intelligence holds the Slack or Teams credentials and receives the events; you still run the agent, the tools,
  the approval logic and a long-running Channels SDK listener. The docs say managed Slack and Teams are generally
  available on cloud-hosted Intelligence. With direct adapters (Slack, Teams, Discord, WhatsApp), your process
  holds the credentials and owns transport reliability.
  - *Starter:* neither.
  - *Docs:* [Channels (Intelligence)](https://docs.copilotkit.ai/intelligence/channels),
    [Microsoft Teams](https://docs.copilotkit.ai/teams),
    [Direct provider adapters](https://docs.copilotkit.ai/reference/channels/sdk/direct-adapters)
- [ ] **Where does workflow state live between a message and a click?** The default `MemoryStore` loses it on
  restart, and the SDK ships no durable Redis or Postgres store, so you implement `StateStore` yourself.
  - *Starter:* not applicable.
  - *Docs:* [Persistence and scaling](https://docs.copilotkit.ai/slack/persistence-and-scaling)
- [ ] **How does an approver's click become a recorded decision?** The docs validate one managed approval path (a
  DeepAgent approval that emits `on_interrupt`) and say not to assume native AG-UI interrupts are portable. With
  `BuiltInAgent`, plan a button handler that calls your decision function. Identify the clicker with
  `identifyUser` from the provider's account id, not from an email or display name. Test a real click end to end.
  - *Starter:* not built.
  - *Docs:* [Interactive messages and approvals](https://docs.copilotkit.ai/slack/interactive),
    [Identity and memory](https://docs.copilotkit.ai/slack/identity-and-memory)
- [ ] **Do you want a governed AI coworker your team runs itself (OpenBot)?** OpenBot is CopilotKit's open-source
  (MIT, beta) coworker template. Any AG-UI endpoint can be a Bot, each Bot gets only the tools and skills granted
  to it, approval rules apply before actions, and every action is audited. It needs a CopilotKit Intelligence
  project (a free plan is available). Its approval card goes to the person whose message triggered the action,
  not to business approvers. Slack and Teams reach it through OpenTag, and that pairing is on a preview branch.
  - *Starter:* `openbot-headcount`: Hana, backed by the Northstar HR MCP server, with an `ask` rule on submit.
    Present it in OpenBot's web app.
  - *Docs:* [OpenBot](https://github.com/CopilotKit/openbot), [OpenTag](https://github.com/CopilotKit/OpenTag),
    [starter README](../starters/openbot-headcount/README.md)
- [ ] **Mobile too?** The React Native package connects to the same runtime and agent.
  - *Starter:* none.
  - *Docs:* [React Native quickstart](https://docs.copilotkit.ai/react-native)

## 5. Deploy

- [ ] **Does the runtime run inside your app, or as its own service?** It is a Fetch handler that runs in the
  Next.js App Router, Express, Hono, plain Node HTTP, Bun, Deno and Cloudflare Workers.
  - *Starter:* inside the Next.js app at `/api/copilotkit`, listening on 127.0.0.1 only.
  - *Docs:* [Copilot Runtime](https://docs.copilotkit.ai/backend/copilot-runtime),
    [Deploy to any runtime](https://docs.copilotkit.ai/runtime-server-adapter)
- [ ] **Serverless or long-running?** The web runtime can run on AWS Lambda (the page covers response
  streaming). A Channels listener is a long-running process, so it does not fit a serverless function.
  - *Starter:* `npm run dev` or `npm start` on your machine.
  - *Docs:* [AWS Lambda](https://docs.copilotkit.ai/deploy/aws-lambda), [Channels](https://docs.copilotkit.ai/slack)
- [ ] **Do you need Intelligence at all?** The open-source SDKs and the TypeScript runtime cover chat, frontend
  tools, shared state, generative UI and AG-UI with no CopilotKit service. Intelligence adds saved threads (AG-UI
  Streams), User Memories, Automatic Learning, Product Analytics and managed Channels. The Python, Go, Ruby and
  C#/.NET runtimes require it.
  - *Starter:* the web starter runs without it, so conversations are not saved. OpenBot requires it.
  - *Docs:* [Open source vs Intelligence](https://docs.copilotkit.ai/concepts/oss-vs-enterprise),
    [CopilotKit Intelligence](https://docs.copilotkit.ai/intelligence/overview)
- [ ] **Cloud-hosted or self-hosted Intelligence?** Self-hosting is available on the Team self-hosted plan or a
  custom Enterprise plan and needs a CopilotKit Intelligence license key. It installs with a Helm chart on
  Kubernetes 1.28 or later, or as an ECS/Fargate bundle in your AWS account. The docs do not say whether managed
  Slack and Teams work on self-hosted Intelligence, so ask CopilotKit before you plan on it.
  - *Starter:* the web starter uses none. OpenBot runs on cloud-hosted Intelligence (free plan, no license token).
  - *Docs:* [Self-host Intelligence](https://docs.copilotkit.ai/intelligence/self-hosting),
    [Self-host on ECS/Fargate](https://docs.copilotkit.ai/intelligence/self-hosting-ecs),
    [Plans](https://docs.copilotkit.ai/intelligence/plans)
- [ ] **Where will you host the app, the runtime and any agent sandbox?** Any host that runs your server will do;
  options include Render, AWS and Oracle Cloud. An agent on AWS Bedrock AgentCore connects through a server-side
  runtime. If the agent runs code, give it a sandbox such as Daytona or E2B.
  - *Starter:* localhost only. The OpenBot starter runs on Docker, with a public https tunnel for its MCP server.
  - *Links:* [Render: deploy a Node Express app](https://render.com/docs/deploy-node-express-app),
    [AWS AgentCore](https://docs.copilotkit.ai/deploy/agentcore),
    [Oracle Cloud Infrastructure docs](https://docs.oracle.com/en-us/iaas/Content/home.htm),
    [Daytona recipe](https://docs.copilotkit.ai/cookbook/daytona), [E2B docs](https://docs.e2b.dev/)

## 6. Govern

### Security

- [ ] **Is there authentication in front of the runtime endpoint?** Send the user's token with the provider's
  `headers` prop and validate it in the runtime handler's `onRequest` hook, returning 401 when it fails. Never
  trust the browser's claim about who the user is.
  - *Starter:* none. Anyone who can reach `/api/copilotkit` can run the agent on your model key, which is why it
    listens on 127.0.0.1.
  - *Docs:* [Authentication](https://docs.copilotkit.ai/auth)
- [ ] **What data reaches the model, and should it?** Registered context goes into the system prompt, and the docs
  do not cover redaction. Scope data to the signed-in user on the server.
  - *Starter:* the rules, the cost model and the full dataset (every team's budget, every band) run in the
    browser. Text people typed reaches the agent as `quotedText`, labelled as data, never instructions.
  - *Docs:* [Agent Context](https://docs.copilotkit.ai/agent-app-context). PII and prompt-injection screening is
    documented for LangGraph (Python) only: [Guardrails & DLP](https://docs.copilotkit.ai/langgraph-python/guardrails)
- [ ] **Do all keys stay on the server, and is telemetry on or off?** The runtime reads the model key from its
  environment, and anything that needs a secret is a server tool. The runtime sends usage telemetry by default.
  - *Starter:* `OPENAI_API_KEY` in `.env.local`, read by the runtime route. Telemetry is on;
    `COPILOTKIT_TELEMETRY_DISABLED=true` turns it off.
  - *Docs:* [Quickstart](https://docs.copilotkit.ai/quickstart), [Server Tools](https://docs.copilotkit.ai/server-tools),
    [Open-source Telemetry](https://docs.copilotkit.ai/telemetry)
- [ ] **If you turn on User Memories or Trajectories, is what they store acceptable?** Removing a memory retires
  it rather than erasing it. Trajectories (early access) records clicks, form edits, page changes and requests.
  - *Starter:* uses neither.
  - *Docs:* [User Memories](https://docs.copilotkit.ai/intelligence/memories), [Captured data](https://docs.copilotkit.ai/intelligence/captured-data)

### Guardrails

- [ ] **Is every write behind a gate that shows its exact effect, and checked again on the server?** The governed
  actions guide checks policy on the server (allow, deny or require approval), uses stable ids so an approval
  cannot be replayed, and logs each proposal, verdict, decision and result.
  - *Starter (web):* the Submit gate, but the submit writes to `localStorage` with no server re-check.
  - *Starter (OpenBot):* an `ask` rule on submit. Northstar HR computes the figures of record itself and refuses
    missing inputs, and every call is in **Admin → Audit**.
  - *Docs:* [Governed Action Approval UI](https://docs.copilotkit.ai/human-in-the-loop/governed-actions),
    [OpenBot](https://github.com/CopilotKit/openbot)
- [ ] **Does every rule have an id the copilot cites, as in "Fits the Q1 plan (POL-HC-02)"?**
  - *Starter:* yes: `POL-<AREA>-<NN>` ids in `starters/shared-data/policies.md`, shown in the policy card.
  - *Docs:* no CopilotKit page. Source: [skill, Phase 2](../skills/functional-copilot/SKILL.md#phase-2-write-the-copilot-spec).
- [ ] **Is separation of duties a tested rule with an id, checked against the server's identity of the user?**
  The requester never approves; the preparer is not the approver.
  - *Starter:* not enforced. The Approvals inbox lets you act as any approver in one browser.
  - *Docs:* no CopilotKit page covers separation of duties. For identity:
    [Authentication](https://docs.copilotkit.ai/auth) (`onBeforeHandler`, `identifyUser`),
    [Identity and memory](https://docs.copilotkit.ai/slack/identity-and-memory)
- [ ] **In OpenBot, does every tool have its own approval rule?** `allow` for each read tool and `ask` for each
  write; a wildcard `allow` lets through any write added later. Before any rule, OpenBot's safety floor hands back
  to the person any action whose words match credentials, security settings or payments, and the tool never runs.
  - *Starter:* `northstar-hr/*` is `allow` and `submit_headcount_request` is `ask` (a wildcard, for brevity).
  - *Docs:* [OpenBot](https://github.com/CopilotKit/openbot),
    [starter limits](../starters/openbot-headcount/README.md#limits-to-know-before-presenting)

### Evals

- [ ] **How will you know a model, prompt or tool change did not break the workflow?** No CopilotKit page covers
  evals as of 2026-11-04. Product Analytics reports activity, error rates, tool calls and tokens, not whether
  answers were right. The Inspector shows AG-UI events, tools and context in development builds; its threads and
  learning panes need Intelligence.
  - *Starter:* `npm test` runs unit tests for every number and rule and plays the demo script against the scripted
    mock. A passing mock says nothing about whether a real model picks the right tools, so run the same script on
    a real model too. The Inspector is off (`enableInspector={false}` in `src/components/HeadcountApp.tsx`).
  - *Docs:* none for evals. Related: [Product Analytics](https://docs.copilotkit.ai/intelligence/analytics),
    [Inspector](https://docs.copilotkit.ai/inspector)

### Learning

- [ ] **Will you record corrections from day one, and learn from them automatically or by manual review?**
  Record send-backs with comments, edits to values the agent proposed, and overrides
  ([skill, learning loop](../skills/functional-copilot/references/learning-loop.md#what-to-record-from-day-one)). Automatic Learning
  reads completed threads and proposes skills when a pattern repeats. It runs daily (02:00 UTC by default) once
  there are 15 eligible threads (the default), or on a manual run. A scheduled run does not approve skills, and
  learning does not change the model.
  - *Starter:* records send-backs and approver comments in the browser store. Learning is simulated with a keyword
    classifier and a hand-written template, so the demo runs the same every time.
  - *Docs:* [Automatic Learning](https://docs.copilotkit.ai/learning)
- [ ] **Who reviews a proposed skill before it reaches the agent?** A person approves or rejects each one, and only
  published skills are delivered. The model then decides when to load a skill, and your own instructions take
  precedence over it.
  - *Starter:* publishing is a person's click in the Insights panel, and published skills go into context on
    every turn. In OpenBot, a package skill applies only when a person picks it with `/`.
  - *Docs:* [Skill delivery](https://docs.copilotkit.ai/intelligence/learned-skills)
