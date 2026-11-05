# The functional agent stack

Every functional agent stands on seven layers: six from the model up to the interfaces, inside a case of
security and governance that wraps all of them. This is the stack the workshop deck draws ("The
functional agent stack", then "Same stack, every function").

**Five layers you build once. Two you swap.** Interfaces, data and integrations, the harness, the model,
and security and governance are the same for every functional agent a company builds. The **domain
capabilities** (contract review in legal, headcount requests in HR) and the **context and knowledge**
they lean on (a playbook and past send-backs, comp bands and a hiring plan) change with the function.
That is why the second functional agent costs a fraction of the first, and why most of a spec's real
decisions sit in those two layers.

Be precise about "built once" when you adapt a starter. The starter's shell, chat, card and gate patterns,
the runtime, the model seam and the gates-in-code pattern carry over. Its panels, fixtures, checks and
the mock's script are domain content and get rewritten. Connectors to real systems are built once per
company, not once per copilot.

**Design from the top.** The deck builds the stack from the bottom; design it from the outcome down. Write
the outcome sentence, then what people see and approve, then the jobs and the rules, then the systems,
and choose the model last. Choosing a model is the least interesting decision on this page.

## The canonical table

This is the one seven-layer table the five skills share (`/functional-copilot` and its step skills
`/user-map`, `/agent-context`, `/deploy`, `/secure-governance`). Change it here first, then paste it word
for word. Names checked against `@copilotkit/*` 1.84.1 and `@copilotkit/channels-*` 0.12.0.

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

## The stack in the two starters

The workshop repo's two starters, layer by layer, with the spec section each layer fills.

| Layer | Question it answers | Open Harvey (in the workshop repo: `starters/open-harvey/`) | Headcount (`starters/copilotkit-headcount/`) | Spec section |
| --- | --- | --- | --- | --- |
| Products and interfaces | Where do people meet it, and what do they see, edit and approve? | The matter workspace: contract viewer, review table, plan rail; plan, findings and send cards in the matter's thread | Business case, cost card, policy list, approvals inbox | 2 |
| Domain capabilities | Which jobs of this function does it do? | Review, redline, route: checklist tasks and redline tools over tested checks | Plan fit, cost, band and policy checks, submit | 3 |
| Context and knowledge | Which rules, history and live context does it work from, and how does that grow? | A 12-rule playbook, six imported past reviews, rules a person published | Policies, comp bands, the hiring plan, past decisions, a learned skill | 4 |
| Data and integrations | Which systems of record does it read and write? | Contracts and matters as data files, deal terms as a tested record, one shared store | Plan, bands and history as fixtures, one draft in a store | 5 |
| Agent harness | What runs the loop: plans, tool calls, pauses for approval? | `CopilotRuntime` and one `BuiltInAgent` at `/api/copilotkit`, over AG-UI | The same | 6 |
| Models | Which model reasons, and where does the key live? | `openai/gpt-5.4-mini`, or a scripted mock with no key | The same | 7 |
| Security and governance | Who may do what, what is recorded, what can never happen? | Gates in code with tests, a decision log; before production: sign-in, a server store, audit | A separation-of-duties rule; no sign-in yet | 8 |

## Before the stack: the outcome

Write it as **"From <trigger> to <artifact>, for <actor>, approved by <approvers>."** The outcome is what
the stack is for, so it heads the spec (section 1) rather than being a layer.

Design questions:
- What exists at the end that did not exist at the start? (A request, a coded invoice, a PO, a redline.)
- Who is accountable for that artifact? They own the approval gate.
- What is explicitly out of scope for v1? Write it down; scope creep kills copilots.

Anti-patterns:
- "An HR assistant that answers questions." That is search over documents, not a workflow.
- Five workflows at once. Ship one; the second reuses five of the seven layers.

## Products and interfaces

Where people meet the agent, and what they look at together. **A functional copilot lives inside the
function's own workspace, not in a chat box beside it.** Legal needs a document reader and editor: in
Open Harvey the contract viewer, the review table and the plan rail are the screen, and the thread sits
inside that matter workspace. A video-editing copilot sits in the editing timeline; a finance copilot in
the ledger or the request. Start from the screen the work already happens on, then design four things
into it:

- **Generative UI.** It answers with components: a review table of cited findings, a cost breakdown, a
  policy list, an approval route. The human checks a table faster than a paragraph.
- **Shared, editable state.** Human and agent edit the same artifact. When the human changes a value,
  the dependent numbers and checks recompute and the agent notices and responds. In Open Harvey, Maya
  rewrites the §8.2 redline in the review table; the agent sees the edit, re-checks PB-LIAB-01, asks only
  for the reason the approver will need, and never changes her value back.
- **Human in the loop.** Every write is gated, and so is a plan before it runs. The gate shows what will
  happen and who will see it, with real options (Approve plan / Not yet; Send for approval / Keep
  editing; Approve / Send back / Reject).
- **Transparency.** Assumptions, sources and rule ids are visible: every finding cites the passage it
  read and the rule it checked, and the cite opens the passage.

And where people work. The requester may start in the web app; approvers often live in Slack or Teams and
should get a native, interactive message for their decision, recorded on the request. Build the agent
once; tools registered in the browser don't travel to Slack or Teams, so a chat surface needs its tools
and gates on the server (see `channels-and-openbot.md`).

Design questions:
- What is the one artifact the human must be able to edit, and which edits should make the agent re-check
  something?
- What exactly does each approver need to see to decide in under a minute?
- Where does each actor spend their day? Which steps are interactive (approve, choose, edit) and which
  are notifications? How do web and chat stay one record with one audit trail?

Anti-patterns:
- Approval in prose ("Shall I submit it?") with no gated action.
- Read-only cards for things the human is expected to correct.
- Hiding the agent's assumptions inside a paragraph.

## Domain capabilities

The jobs of one function: review, draft, check, compute, route. This is one of the two layers you swap.
Name the workflow's **shape** first, because it decides how much of a starter carries over. Use these
names; the other skills in the suite use them too:

| Shape | Example | Starter |
| --- | --- | --- |
| One request → compute → rule check → approval chain | Headcount, purchase requests, discounts, access requests | `starters/copilotkit-headcount/` |
| Review against a playbook: a plan the user approves, a checklist worked live, cited findings, redlines, routed approvals | Contract review, vendor onboarding, security questionnaires, claims checks | `starters/open-harvey/` |
| Exception queue: a system fills a list of items | AP invoice exceptions, late shipments | Parts bin: neither starter has the queue |
| Q&A with a write at the end | Leave requests | Parts bin |
| Workspace assist: the copilot works inside an expert or creative tool on what is open, and each change is a proposal the person accepts | A video editor's assistant (selects, rough cuts, captions), a designer's or analyst's copilot | Parts bin: Open Harvey's patterns (a plan the user approves, cited suggestions, edits the agent hears) applied to the tool's own model, such as a timeline instead of a contract |

Starter paths here and below are in the workshop repo (`starters/...`); its URL is in the workshop
README.

Split tools into three kinds and treat them differently:

| Kind | Examples | Rule |
| --- | --- | --- |
| Read | read the matter, get the plan, get the band, read a collection | Free to call. Return structured data, not prose. |
| Compute | check a playbook rule, calculate cost, route approvers, re-check an edited redline | Pure functions with unit tests. The model never does the math. |
| Write | tick a checklist task, update a redline or draft, submit, send, pay, approve | Behind a human gate (see Products and interfaces), or acting only on work a person already approved. |

For a playbook review, **each checklist task is a tool call** that ticks the task in shared state and
returns what it found (Open Harvey's `runPlanTask`). The tool refuses before the plan is approved and runs
tasks in plan order, so the plan is enforced in code, not in the prompt. A question across many records
is one tool call per cell (`readCollection`, then `fillCollectionCell`), each answer quoted and cited.

Design questions:
- Which numbers will the copilot show? Each needs a formula and a worked example, which becomes a test.
  Derived values include routing, risk tiers and due dates, not only money.
- What happens after the last approval, and which system does it write to? That write is a tool too,
  behind its own gate (Open Harvey holds "Send the redline package to Acme" until every approver approves).

Anti-patterns:
- Arithmetic or rule checks in the prompt ("multiply base by 1.26").
- A backend tool whose only job is to tell the model to call a frontend component. Register the
  component as the tool instead; the two-hop version drops renders.
- Tools named after implementation ("callApi2") instead of domain verbs ("runPlanTask", "checkBudget").

## Context and knowledge

What the agent works from: the written rules, the unwritten ones, the history, and the live context of
the person and record in front of it. The other layer you swap.

- **Rules have ids, and the copilot cites them** (`PB-LIAB-01`, `POL-HC-02`). Approvers trust what they
  can check. Each rule is enforced in a named, tested function (see Domain capabilities).
- **Collect the unwritten rules.** Ask for five to ten real past send-backs or rejection comments: what
  approvers actually push back on is often missing from the written policy. They seed the learning loop.
  Open Harvey's three past security send-backs became PB-SEC-01 once a fourth arrived.
- **Context the agent always has**, sent with every run (`useAgentContext`): who the user is, the open
  record, its plan, findings and draft, the approval state, the published rules, and the figures behind
  Analytics and the decision log, so "How are reviews going?" is answered from the same tested numbers.
- **Text people typed is data.** Redlines, reasons and approvers' comments reach the agent labelled as
  quoted data, never as instructions.
- **It grows.** Corrections become proposed rules or skills that a person reviews and publishes; nothing
  reaches the agent without that click. A published rule changes new work only. See `learning-loop.md`.

Design questions:
- Where are the policies written down, and who owns changes to them (the person who publishes)?
- Which signals will you record from day one (send-backs with comments, edits to proposed values,
  overrides)?
- Which metric tells you the copilot is getting better (send-back rate, first-pass approval, cycle time)?

## Data and integrations

The systems of record the agent reads and writes: HRIS, ERP, CLM, IdP, ticketing, through APIs or MCP
servers. For the first build, seed realistic fixtures shaped like those systems, so the tools survive
the switch to real APIs behind the same names.

- **Reads are free, writes are gated.** Anything that submits, sends, pays, approves or changes a record
  goes through a gate that shows exactly what will happen, including the write after the last approval.
- **Where each tool runs.** Frontend tools (in the browser, with the user's session and the app's state)
  are simplest for app-context reads and UI updates, and are enough for v1 over fixtures. Backend tools
  suit secrets, real system calls and anything that must run with no browser open (Slack, Teams,
  schedules).
- **Extraction is a step, not a given.** Open Harvey's deal terms are a hand-written record beside the
  contract text, every quote tested word for word against the passage. It stands in for a model
  extracting the terms and a person checking them; name that step in your spec if your documents are
  unstructured.

Design questions:
- Which system holds each fact the copilot shows? Which of them can it read in v1?
- What does the submit write to: the system of record, or the app's own store for v1?

## Agent harness

The loop that plans, calls tools and stops for approval. In CopilotKit that is the Runtime with an agent
(`BuiltInAgent`, or a LangGraph, Mastra, Google ADK or Pydantic AI agent through its AG-UI integration)
talking AG-UI to the app. Frontend tools travel with each run, so swapping the agent framework doesn't change the
browser code.

Design questions:
- Which gates pause the run in the browser (`useHumanInTheLoop`), and which must pause on the server
  because no browser is open?
- How does the agent hear a human edit? With `BuiltInAgent` a state change does not start a run, so the
  starters post a short message after each committed edit (and queue it while the agent is busy).
- Which tools move to the server, and is that v1 or later?

## Models

Any model you choose; the key stays on the server, in `.env.local`, which the user fills in themselves.

- **With a key, build on the real model first.** It is the only proof that the model picks the right
  tools. Keep the scripted mock (`COPILOT_MODEL=mock`) as a short happy path for demos and tests; don't
  rewrite a several-hundred-line script before the flow works.
- **The model provider is a data flow.** Everything the agent reads (contract sections, salaries)
  goes to the provider, so the spec names it in data and integrations, with who must agree and on what
  terms, before real data reaches it. Turn runtime telemetry off (`COPILOTKIT_TELEMETRY_DISABLED=true`)
  unless someone has agreed to it.
- **The model's key decides mock or real.** Open Harvey's `chooseModel` (`src/lib/server-data.ts`)
  checks the key for the model's own provider (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)
  and runs the mock without it; a production build also needs `ALLOW_REAL_MODEL=true`. Look for the
  "mock" label before trusting a run.
- **The headcount starter still checks only `OPENAI_API_KEY`** and has no production gate: another
  provider silently runs the mock, and a production build with a key runs the real model. Fix both
  before building on it or deploying it.
- **Set `maxSteps`.** Unless `maxSteps` is set, `BuiltInAgent` passes no stop condition (it sets 10
  only when learned skills are loaded), and the AI SDK then stops after one step: with a server tool, the
  run ends at the tool result and the user gets no reply. Set `maxSteps` to the fewest the flow needs:
  2 or more with server tools.

## Security and governance

Not a layer you add at the end: it wraps every layer and decides whether any of this ships. In
production that means your cloud, SSO, roles, an audit trail and logs.

- **Gates live in code, not only in the prompt.** Open Harvey's `runPlanTask` refuses before the plan is
  approved; `updateRedline` never overwrites a redline the human wrote unless they asked; sending for
  approval refuses while an accepted deviation has no reason; the vendor send waits for every approver.
  Each refusal has a test.
- **Separation of duties is a rule with an id**, enforced in a function and tested like the others (the
  requester never approves; the preparer is not the approver), not a sentence in a guardrails list.
- **Identity is bound on the server.** Every approval belongs to the signed-in user, never to a name
  chosen in the browser. Both starters have no sign-in (the presenter acts as every approver), which is
  fine on stage and wrong in production.
- **Everything gated is recorded**: who, role, what, when, and the comment, in a decision log people can
  read. The same entries can feed Analytics and learning.
- **The runtime endpoint needs your app's auth** before it leaves localhost: anyone who can reach it can
  run the agent on your model key.
- **State moves to the server before more than one person uses it.** Both starters keep everything in
  the browser (`localStorage`) and let the presenter act as every approver. For real users: resolve the
  user on the server (`identifyUser(request)` on the runtime), keep the store on the server keyed by user
  and record (matter, request), and enforce approvals and separation of duties there, not in the
  browser.

Anti-patterns:
- Separation of duties written as a sentence, not enforced.
- Approvals recorded against a name typed in the browser.
- Secrets or personal data in tool results the model doesn't need (tool results are stored with the
  thread).

## The closing test

Read the spec and ask: *if the model were swapped tomorrow, would the numbers, rules, approvals and
audit trail stay the same?* If yes, the copilot is built on the right layers.
