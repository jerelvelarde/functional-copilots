# <Function> copilot: <workflow>

> From **<trigger>** to **<artifact>**, for **<requester>**, approved by **<approvers>**.

Status: draft · Business owner: <name> · Spec author: <name> · Last updated: <date> · Interview: <live with <name> / defaults only>

Replace every `<...>`. Mark anything not confirmed by the user as *Assumed* where it appears, and list
it again under "Assumptions and open questions" at the end. Nothing is built until the user has read
this spec and said yes.

Sections 2 to 8 are the seven layers of the functional agent stack, top to bottom, with security and
governance last because it wraps the rest. Sections 3 and 4 are the two layers you swap for each
function; the others mostly say what carries over from the starter.

## The stack at a glance

| Layer | This copilot | Built with (CopilotKit) | From the starter, or new |
| --- | --- | --- | --- |
| Products and interfaces | <the workspace, its panels and cards; Slack or Teams for approvers> | `useComponent`, `useHumanInTheLoop`, `useAgent` in the workspace; `CopilotChat` where it fits; Channels SDK for chat | <starter shell and gates; new panels and cards> |
| Domain capabilities | <the jobs: review, check, compute, route, submit> | `useFrontendTool` (v1) → `defineTool` in the runtime | **New** |
| Context and knowledge | <rules POL-…, history, past send-backs, learned rules> | `useAgentContext`; Intelligence Automatic Learning | **New** |
| Data and integrations | <systems of record; v1 fixtures> | Fixtures (v1) → MCP servers and runtime tools | <starter store pattern; new fixtures> |
| Agent harness | <the agent> | CopilotKit Runtime + `BuiltInAgent` over AG-UI (or an AG-UI agent: LangGraph, Mastra, Google ADK, Pydantic AI) | Starter |
| Models | <model id; scripted mock for the demo> | `BuiltInAgent`'s `model` | Starter |
| Security and governance | <gates in code, separation of duties, identity, decision log> | Gates in tool code; `identifyUser`; Intelligence analytics | <starter pattern; new rules> |

## 1. Outcome

- **Outcome:** <one sentence>
- **Why now:** <what it costs today: cycle time, rework, errors>
- **Success metric:** <metric, today's baseline, target>
- **v1 scope:** <which entities: e.g. 3 apps, 1 team, net-new only>
- **Out of scope for v1:** <list>

### Candidates considered

| Workflow | Checklist hits (frequent, artifact, rules, numbers, cross-team, metric, human gate) | Chosen? Why |
| --- | --- | --- |
| <candidate> | <n of 7: which> | <yes: reason / no: reason> |

### Trigger and work items

- **Shape:** <one request → approval chain / review against a playbook / exception queue / Q&A with a
  write at the end / workspace assist>
- **Starter:** <`starters/copilotkit-headcount/` / `starters/open-harvey/` / parts bin from either>
- **Trigger:** <a sentence a user types / a document that arrives / a system event (e.g. an invoice fails
  three-way match) / a schedule (e.g. month-end) / a webhook>
- **Event source** (if not a sentence): <system, event name, the fields it carries, how it reaches the
  copilot>
- **Work items:** <one request at a time / one document reviewed as a checklist / a queue of items worked
  as a list: typical size, who works it>
- **Batch actions** (queues only): <action, most items per batch, what its gate lists before it runs>

### Today's process and cutover

- **How it runs today:** <form / channel / ticket queue / email>
- **The copilot will:** <replace it / sit in front of it and file into it / feed it>
- **The submit writes to:** <system of record, or the app's own store for v1>

### After the final approval

- **Effect:** <what changes: HRIS record updated, journal posted, access provisioned, PO issued, redlines
  sent / nothing in v1>
- **Written to:** <system of record>
- **Executed by:** <a backend tool in the copilot / a person / the system's own workflow>
- **On whose click, behind which gate:** <who confirms, and what they see before it runs>

### Actors and approval shape

| Actor | Role in the workflow | Where they work |
| --- | --- | --- |
| <requester> | Starts the request, answers questions, edits the draft | <web app / Slack / Teams> |
| <approver 1> | <approves / sends back / rejects>, routed by <rule id> | <surface> |

- **Order:** <sequential / parallel / any one of a group>, with <delegates>
- **Escalation:** <reminder after N days, escalate to whom, what happens on timeout>

### Trigger sentences (become suggestion chips and the demo script)

For an event trigger, write what the user types when they open an item.

1. "<what a real user types>"
2. "<a variation>"
3. "<a follow-up or edge case>"

## 2. Products and interfaces

- **Workspace:** <the screen where the work already happens: a document reader and editor, a request
  form, a queue, a ledger, a timeline>. The copilot's cards, cites and edits land there, and the chat is
  a thread inside it, not a separate page.
- **Generative UI components:**

| Component | When it appears | Editable fields |
| --- | --- | --- |
| <CostBreakdown / Findings / Redlines> | <after calculateCost / after each task> | <none / base, level / redline text> |

- **Shared state:** <one draft: `<type or JSON shape>` / one review: plan, findings, redlines, reasons /
  a list of items: `<item shape>`, each with its own resolution draft>
- **Edits that make the agent re-check:** <field → what it re-checks, and what it must never undo>
- **Human-in-the-loop gates:**

| Action | Who decides | What they see | Options |
| --- | --- | --- | --- |
| Approve the plan (playbook reviews) | Requester | Every task and the rule it checks | Approve plan / Not yet |
| Submit | Requester | Summary, derived values, approver route | Submit / Keep editing |
| Decide | <approver> | <what they need in under a minute> | Approve / Send back / Reject |
| Apply after final approval | <who> | <the exact change to which system> | Apply / Hold |
| Batch action (queues only) | <who> | <every item it will touch> | Apply to all / Pick items / Cancel |

- **Surfaces:**

| Surface | Who | What happens there |
| --- | --- | --- |
| Web app | <requester> | <full workflow> |
| <Slack / Teams> | <approvers> | <approval card for their decision, recorded on the request> |

- **Chat path:** <CopilotKit Channels SDK / OpenBot coworker / web only for v1>. Server work it needs:
  <tools moved to the backend, the draft stored server-side, the gate rebuilt, a long-running channel
  worker / none (web only)>. Tools registered in the browser don't exist in Slack or Teams, and
  OpenBot's `ask` card goes to the requester, not to approvers (the skill's
  `references/channels-and-openbot.md` lists the work).

## 3. Domain capabilities

### Tools

| Tool | Kind (read / compute / write) | Runs in (frontend v1 / backend) | Human gate? |
| --- | --- | --- | --- |
| <getX> | read | frontend (fixtures) → backend (real API) | no |
| <runPlanTask / checkX> | compute | frontend | no (only after the plan's approval) |
| <submitX> | write | frontend | **yes** |
| <applyX> (after final approval) | write | backend | **yes** |

### Derived values (each worked example becomes a unit test)

Costs, taxes and totals, but also routing tables, risk tiers, due dates and expiry dates. Pin "today" in
the example so the test never depends on the clock.

| Value | Rule or formula | Worked example |
| --- | --- | --- |
| <name> | <formula or table> | <inputs, with today = YYYY-MM-DD → exact output> |

### The plan (playbook reviews only)

| # | Task | Section or record it reads | Rule |
| --- | --- | --- | --- |
| 1 | <task> | <§ / field> | <rule id or none> |

## 4. Context and knowledge

### Rules

Include separation-of-duties rules here, with ids, like any other rule.

| Id | Rule | Source | Enforced in |
| --- | --- | --- | --- |
| <POL-XX-01> | <rule> | <policy doc / approver habit / *Assumed*> | <function name> |

- **Rule owner:** <who publishes changes to the rules>
- **Unwritten rules (from past send-backs):** <the comments approvers keep making that no policy says>
- **Context the agent always has:** <user, team, open record, current draft or review, approval state,
  published rules, the figures behind any analytics>
- **Quoted data:** <free text people type (comments, reasons, edits) reaches the agent labelled as data>

## 5. Data and integrations

| System of record | What the copilot reads or writes | v1 source |
| --- | --- | --- |
| <HRIS / ERP / CLM / IdP / ...> | <fields> | <seed fixture shaped like the real system / API / MCP server> |

- **Extraction step** (unstructured documents only): <who extracts the fields, who checks them; v1: a
  hand-written record tested against the source text>
- **Model provider:** <provider and model> receives <what the agent reads: e.g. contract sections,
  salaries>. That data leaves your systems, so name who must agree (<Legal, Security>) and the terms
  (retention, no training) before real data goes to it. Runtime telemetry: <off / on>.

## 6. Agent harness

- **Runtime and agent:** <CopilotRuntime + one BuiltInAgent at `/api/copilotkit` / a LangGraph, Mastra or
  other AG-UI agent>
- **Where the run pauses:** <browser gates via `useHumanInTheLoop` / server interrupts for chat>
- **How the agent hears human edits:** <a short message after each committed edit, queued while busy>

## 7. Models

- **Model:** <provider/model id>, key in `.env.local` (the user sets it; the copilot never reads it)
- **Demo and tests:** the scripted mock (`COPILOT_MODEL=mock`, or no key) plays the demo script below

## 8. Security and governance

- **Gates in code:** <each refusal a tool enforces, e.g. no task before the plan is approved, nothing
  sent without a reason, the final write waits for every approver>, each with a test
- **Separation of duties:** <who may never approve what> → rule <id>, enforced in <function>, with a test
- **Data handling:** <what the copilot must never show, store in a tool result, or log>
- **Identity:** <how the requester is verified; whose permissions tools run with; how each approval is
  bound to the signed-in user on the server>. v1 demo: <e.g. no sign-in, the presenter acts as every
  approver: not enforced>
- **Audit trail:** <the decision log: who, role, action, comment, when; where it goes; how long it is
  kept>
- **Before production:** <sign-in on the runtime endpoint, server-side checks, hosting, SSO and roles>

## 9. Learning loop

Agreed with the rest of this spec; the build doesn't reopen it. It grows section 4.

With CopilotKit Intelligence: Trajectories are off on hosted Intelligence today; a first learning run
needs 15 threads; a person publishes every skill.

- **Persisted:** <threads, drafts, decisions>
- **Signals recorded from day one:** <send-backs with comments, edits to proposed values, overrides>
- **Stored in:** <table, log or thread metadata>, with record id, who, before and after, comment,
  timestamp
- **Seed evidence:** <the 5 to 10 past send-backs collected in the interview, or *Assumed* examples>
- **First candidate rule or skill:** <the unwritten rule approvers keep enforcing>
- **Review owner:** <who approves and publishes it>
- **Learning path:** <in-app review of proposed rules / weekly manual review / CopilotKit Intelligence
  Automatic Learning behind an off-by-default switch>

## Demo script

| You type or do | The copilot should |
| --- | --- |
| "<trigger sentence>" or <the event arrives> | <proposes a plan / asks for X, checks Y, renders Z> |
| <an edit in the UI> | <recomputes, notices, re-checks rule id, never undoes the edit> |
| <Submit> | <shows the gate; nothing happens until the click> |
| <a send-back, then publish the proposed rule> | <the next request carries the rule without being asked> |
| <final approval> | <shows the apply gate; nothing is written until the click> |

## Assumptions and open questions

- <assumption made during the interview, and who can confirm it>
