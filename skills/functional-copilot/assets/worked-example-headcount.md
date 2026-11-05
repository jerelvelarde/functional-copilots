# People Ops copilot: headcount request

> From **"I need approval to hire a senior engineer in New York next quarter"** to an **approval-ready
> business case**, for **a hiring manager**, approved by **the department head and Finance** (and the
> CFO when the cost or level calls for it).

Status: agreed · Owner: workshop presenter · Interview: written for the workshop (fictional)

This is the spec behind the headcount starter (in the workshop repo: `starters/copilotkit-headcount/`), the workshop's
*request → approval* example. Fictional company (Northstar Software), FY2027. Data in
`starters/shared-data/`. The contract-review example (`worked-example-contract-review.md`) shows the
other common shape, a review against a playbook.

## The stack at a glance

| Layer | This copilot | From the starter, or new |
| --- | --- | --- |
| Products and interfaces | Business case, cost card, policy list, approvals inbox; Slack or Teams for approvers later | Starter |
| Domain capabilities | Plan fit, comp band, cost model, policy checks, submit | **New** for HR and Finance |
| Context and knowledge | `POL-*` policies, comp bands, the FY2027 plan, nine past decisions, a learned "security and access" skill | **New** |
| Data and integrations | Headcount plan, comp bands, policy and approval history as JSON fixtures | Starter store; new fixtures |
| Agent harness | `CopilotRuntime` and one `BuiltInAgent` at `/api/copilotkit`, over AG-UI | Starter |
| Models | `openai/gpt-5.4-mini`, or the scripted mock | Starter |
| Security and governance | Submit gate, chain order, a decision record; no sign-in yet | Starter pattern |

## 1. Outcome

- **Outcome:** a complete, in-policy headcount request with cost, plan fit and approver chain, submitted
  only when the manager clicks Submit.
- **Why now:** requests bounce. In the last six months, Platform requests were sent back three times for
  the same missing section, each costing 7 to 8 days before resubmission.
- **Success metric:** first-pass approval rate and request-to-approval cycle time. Baseline: not in the
  fictional data beyond the three Platform send-backs (7 to 8 days each before resubmission). Target:
  *Assumed*, no send-back for a missing security and access section.
- **v1 scope:** one team (Platform), net-new and backfill requests, the FY2027 plan.
- **Out of scope for v1:** opening the req in the ATS, offer letters, backfill detection from the HRIS.

### Trigger and work items

- **Shape:** one request → approval chain. **Starter:** `starters/copilotkit-headcount/`.
- **Trigger:** a sentence the hiring manager types. **Work items:** one request at a time.

### Today's process and cutover

- **How it runs today:** *Assumed*: a request form, then email to each approver.
- **The copilot will:** sit in front of it and file into the app's own approvals inbox.
- **The submit writes to:** the app's own store for v1.

### After the final approval

- **Effect:** nothing in v1. Approved requests are not written back to the plan.
- **Production:** *Assumed*: update the headcount plan and open the req in the ATS, by a backend tool,
  on the recruiting coordinator's click, behind its own gate.

### Actors

| Actor | Role | Where they work |
| --- | --- | --- |
| Dana Kim, Director, Platform | Requester | Web app |
| Marcus Lee, VP Engineering | Department head approval | Slack or Teams |
| Priya Raman, Finance BP | Finance approval | Slack or Teams |
| Elena Ortiz, CFO | Added above $350k fully loaded, for L7, or out of plan | Email or Teams |

- **Order:** sequential: department head, then Finance BP, then the CFO when added. No delegates in v1.
- **Escalation:** none in v1 (*Assumed*).

### Trigger sentences

1. "I need approval to hire a senior engineer in New York next quarter."
2. "What would a Staff engineer in Austin cost us instead?"
3. "Can I still open another Platform req in Q2?"

## 2. Products and interfaces

- **Workspace:** the hiring manager's request view: the business case and the team plan, with the
  approvals inbox for approvers. The copilot's cards and edits land in the business case.
- **Generative UI:** cost breakdown (FY impact and annual run-rate shown separately), policy check list
  with rule ids, approval chain.
- **Shared state:** one draft, `HeadcountRequest`: `{ id, teamId, roleTitle, level, location,
  startQuarter, type, baseSalary, justification, aboveMidpointReason, securityAccess }`
- **Edits that make the agent re-check:** base salary → band, cost, approver chain; location → tier,
  office rule, band; start quarter → plan fit, months in FY.
- **Gates:**

| Action | Who | Sees | Options |
| --- | --- | --- | --- |
| Submit | Dana | Summary, FY impact, approver chain, any warnings | Submit / Keep editing |
| Decide | Each approver in turn | Business case, policy results | Approve / Send back with comment / Reject |

- **Surfaces:**

| Surface | Who | What happens |
| --- | --- | --- |
| Web app | Dana | Full workflow with the editable business case |
| Slack or Teams | Marcus, Priya | An approval card for their decision, recorded on the request (target; v1 approves in the web app's inbox) |

- **Chat path:** web only for v1. Next: CopilotKit Channels SDK for the same agent, after the tools and
  the submit gate move to the server; each approver's click is recorded as a decision on the request, not
  a resumed run. (`starters/openbot-headcount/` packages Dana's side as an OpenBot coworker. Its `ask`
  card goes to Dana, not to Marcus or Priya, so it is not the approvers' path.)

## 3. Domain capabilities

### Tools

| Tool | Kind | Runs in | Gate? |
| --- | --- | --- | --- |
| getHeadcountPlan | read | frontend | no |
| getCompBand | read | frontend | no |
| calculateCost | compute | frontend | no |
| checkPolicy | compute | frontend | no |
| updateRequest | write (draft only) | frontend | no: the draft is visible and editable |
| submitForApproval | write | frontend | **yes** |

### Derived values

| Calculation | Formula | Worked example (L5, New York, Q1 FY2027) |
| --- | --- | --- |
| Fully loaded annual | base + bonus + equity + 18% benefits + 8% taxes | 212,000 + 31,800 + 45,000 + 38,160 + 16,960 = **343,920** |
| FY2027 impact | annual × months in FY / 12 + one-time (15,000 + 4,000) | 343,920 × 11/12 + 19,000 = **334,260** |
| Budget left after | budget − committed − FY impact | 9,600,000 − 9,180,000 − 334,260 = **85,740** |
| Edit: base 225,000 | same | annual **362,250** (CFO added), FY impact **351,063** |

## 4. Context and knowledge

### Rules

| Id | Rule | Source | Enforced in (starter `src/lib/headcount.ts`) |
| --- | --- | --- | --- |
| POL-HC-01 | Required fields, two-sentence justification | `policies.md` | `evaluateRequest` |
| POL-HC-02 | Net-new must fit the quarter's plan (approved minus opened ≥ 1) | `policies.md` | `checkPlanFit` |
| POL-HC-03 | A backfill (someone who left in the last 90 days) skips the plan check, but still goes to the Finance BP | `policies.md` | `checkPlanFit` |
| POL-HC-04 | Start ≥ 60 days after approval; default start is the quarter's second month | `policies.md` | `startDate`, `latestApprovalDate` |
| POL-COMP-01 | Base within band; above midpoint needs a reason | `policies.md` | `getCompBand`, `bandPosition` |
| POL-COMP-02 | Location tier; team must have an office there or Remote (US) | `policies.md` | `hasOffice` |
| POL-FIN-01 | FY impact fits remaining budget | `policies.md` | `checkBudgetFit` |
| POL-FIN-02 | Cost model: base + bonus + equity + 18% benefits + 8% taxes; one-time recruiting and equipment | `policies.md` | `calculateCost` |
| POL-APR-01/02 | Dept head → Finance BP; add CFO above $350k, L7 or out of plan | `policies.md` | `routeApprovers`, `cfoReasons` |
| POL-APR-03 | Approve, reject or send back with a comment; a sent-back request keeps its id | `policies.md` | `recordDecision` (`src/lib/store.ts`) |
| *(unwritten)* | Platform roles need a security and access justification | approver habit (3 send-backs) | learned skill (section 9) |

- **Rule owner:** Finance (Priya Raman) for cost and budget rules, People Ops for the rest (*Assumed*).
- **Context the agent always has:** Dana, her team (Platform), the FY2027 plan, the current draft,
  published skills.

## 5. Data and integrations

| System | Read or write | v1 source |
| --- | --- | --- |
| Headcount plan | Approved net-new per quarter, open reqs, budget | `headcount-plan.json` |
| Comp bands | Band by level and location tier | `comp-bands.json` |
| Policy | Rules with ids | `policies.md` |
| Approvals | Decisions and comments | In-app inbox, seeded from `approval-history.jsonl` |

## 6. Agent harness

- **Runtime and agent:** `CopilotRuntime` with one `BuiltInAgent` at `/api/copilotkit`; every business tool
  is a frontend tool, so the agent has no server tools of its own.
- **Where the run pauses:** the Submit card (`useHumanInTheLoop`).
- **How the agent hears human edits:** a short message after each committed edit to the business case,
  queued while the agent is busy.

## 7. Models

- `openai/gpt-5.4-mini` by default (`COPILOT_MODEL` overrides it), key in `.env.local`. The scripted mock
  plays the demo script below with no key.

## 8. Security and governance

- **Gates in code:** nothing is submitted without the Submit click; approvers decide in chain order.
- **Separation of duties:** the requester never approves; each approver decides once, in chain order.
  Not enforced in the starter: its inbox lets the presenter act as every approver, for the demo.
- **Data handling:** salary bands are fine in tool results; no personal data beyond names and titles.
- **Identity:** in production, tools run in the signed-in manager's session, scoped to her team, and
  each approval is bound to the signed-in approver on the server. The starter has no sign-in: Dana is
  a constant (`CURRENT_USER`).
- **Audit trail:** every decision is recorded with approver, decision, comment and timestamp.

## 9. Learning loop

- **Persisted:** threads, drafts, every decision with its comment.
- **Signals:** send-backs with comments, edits to agent-proposed values.
- **Seed evidence:** nine past decisions in `approval-history.jsonl`, three of them Platform send-backs.
- **First candidate skill:** `security-access-justification` (evidence: REQ-2026-071, -093, -117).
- **Review owner:** Priya Raman (Finance BP) with Jordan Blake (Security).
- **Learning path:** the starter's Insights panel in the workshop; CopilotKit Intelligence Automatic
  Learning in production.

## Demo script

| You type or do | The copilot should |
| --- | --- |
| "I need approval to hire a senior engineer in New York next quarter." | Infer L5, New York, Q1 FY2027; ask net-new or backfill and for the justification |
| "Net-new. It unblocks the multi-region failover work planned for Q2. Without it, on-call stays on four people and failover slips to Q4." | Check plan (1 Q1 slot left, POL-HC-02), band, cost; render the business case, cost card, policy list |
| Change base to 225,000 in the business case | Recompute; flag above-midpoint reason (POL-COMP-01); add the CFO (POL-APR-02) |
| Ask it to submit | Show the gate; nothing is sent until Submit |
| Approve as Marcus, send back as Priya ("What production access does this role get? Security will ask.") | Request returns with the comment; Insights shows the pattern |
| Publish the proposed skill, then "I need approval to hire a senior SRE in Austin in Q2." | The business case includes "Security and access" without being asked |

## Assumptions and open questions

- Today's process (form plus email) is *Assumed*; the fictional data doesn't say.
- The post-approval write (plan update, ATS req) is *Assumed* and out of scope for v1.
- No delegates or escalation in v1 (*Assumed*); confirm with Priya Raman.
- Rule ownership split between Finance and People Ops is *Assumed*.
