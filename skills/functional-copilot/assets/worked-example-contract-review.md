# Legal copilot: vendor contract review

> From **"Review the Acme Cloud MSA and get it ready to sign"** to a **redline package every approver has
> approved**, for **Senior Counsel**, approved by **the General Counsel** (and the Head of Security and the
> CFO when the rules route to them).

Status: agreed · Owner: workshop presenter · Interview: written for the workshop (fictional)

This is the spec behind Open Harvey (in the workshop repo: `starters/open-harvey/`; file paths below are
inside it), the workshop's *review against a playbook*
example and the session's live demo. Open Harvey is an open-source demo built with CopilotKit, inspired
by the patterns of leading legal AI products. Not affiliated with or endorsed by Harvey. Fictional
company (Northstar Software); the story date is pinned to Thu Nov 5 2026. The full story is
`docs/story.md` in the workshop repo. Compare it with
`worked-example-headcount.md`, the *request → approval* shape: here the artifact is a review, the plan
is approved before any work runs, and the approvers come from rules, not a fixed chain.

## The stack at a glance

| Layer | This copilot | From the starter, or new |
| --- | --- | --- |
| Products and interfaces | Matters, a review table with editable redlines, the contract viewer, approvals, insights, analytics; plan, findings, redline and send cards in the chat | Starter |
| Domain capabilities | Review against the playbook, draft a redline per deviation, re-check edits, route, a question across a collection | **New** for legal |
| Context and knowledge | A 12-rule playbook plus 3 routing rules, six imported past reviews, rules the General Counsel publishes | **New** |
| Data and integrations | Contracts as text with stable passage ids, deal terms as a tested record, one shared store | Starter store; new fixtures |
| Agent harness | `CopilotRuntime` and one `BuiltInAgent` at `/api/copilotkit`, over AG-UI; prompt built from the playbook | Starter |
| Models | `openai/gpt-5.4-mini`, or the scripted mock | Starter |
| Security and governance | Gates in code with tests, a decision log, Intelligence off by default; no sign-in yet | Starter pattern |

## 1. Outcome

- **Outcome:** every deviation from the playbook found and cited, a redline drafted for each, the route
  worked out from the rules, and the package sent for approval only on Senior Counsel's click. Nothing
  goes to the vendor until every approver has approved.
- **Why now:** two lawyers, 41 open vendor contracts. A review takes two days against the playbook, then
  an email chain. (Those three figures come from the workshop's story, `docs/story.md`; the starter's
  data doesn't hold them, so don't carry them into another team's spec.) Of the six reviews before go-live, a third were approved first time, the median was
  10.5 days, and 29 days were lost to send-backs, three of them for the same missing security evidence.
- **Success metric:** first-pass approval rate and days lost to send-backs, before and since go-live.
- **v1 scope:** vendor contracts (MSAs and order forms) against one playbook.
- **Out of scope for v1:** Word and Outlook add-ins, extraction from uploaded files, e-signature,
  connectors and SSO.

### Trigger and work items

- **Shape:** review against a playbook. **Starter:** `starters/open-harvey/`.
- **Trigger:** a contract lands in Senior Counsel's queue; she types the review sentence.
- **Work items:** one contract at a time, reviewed as a 17-task checklist (18 once a learned rule adds a
  task). Optional: one question across a collection of eight contracts, one cell per tool call.

### Today's process and cutover

- **How it runs today:** read against the playbook, a spreadsheet of deviations, an email chain with
  Security and Finance.
- **The copilot will:** replace the reading and the spreadsheet; approvals stay with the same people.
- **The submit writes to:** the app's own store for v1.

### After the final approval

- **Effect:** the redline package goes to the vendor (task 17).
- **In the starter today:** task 17 waits for every approver, then turns "released to send" as a side
  effect of the last approve click (`matterView` in `src/lib/store.ts`). There is no separate send click,
  which breaks the rule that the write after the last approval gets its own gate. A spec built on Open
  Harvey adds that gate in v1.
- **Written to:** v1: nothing leaves the app. Production: *Assumed*, the CLM or an email to the vendor's
  counsel.
- **Executed by:** Senior Counsel's click on a "Send to vendor / Hold" gate after the last approval (to
  add in v1).

### Actors

| Actor | Role | Where they work |
| --- | --- | --- |
| Maya Chen, Senior Counsel | Requester and reviewer: approves the plan, edits redlines, gives reasons, sends | Web app |
| Rachel Adler, General Counsel | Approves any position below the playbook (PB-APR-01); publishes playbook changes | Web app |
| Jordan Blake, Head of Security | Approves data, security and customer-data terms (PB-APR-02) | Web app |
| Elena Ortiz, CFO | Approves the spend when total contract value is above $500,000 (PB-APR-03) | Web app |
| Dana Kim, Director, Platform | Business owner who needs the vendor; not on the route | — |

- **Order:** route order (General Counsel, then Security, then the CFO). One send-back returns the review
  to Maya. No delegates or escalation in v1 (*Assumed*).

### Trigger sentences

1. "Review the Acme Cloud MSA and get it ready to sign."
2. "Send it for approval."
3. "How are reviews going?"
4. "Check every contract in Vendor contracts 2026 for the security evidence PB-SEC-01 asks for."

## 2. Products and interfaces

- **Workspace:** the matter workspace, a document reader and editor. The contract viewer, the review
  table with editable redlines and the live plan rail are the screen; the copilot's thread sits at its
  centre, one thread per matter.
- **Generative UI** (`useComponent`): findings with risk and a cite chip (`showFindings`), redlines as a
  blackline that strikes the vendor's words and inserts Northstar's (`showRedlines`), the re-check after
  a human edit (`showRecheck`).
- **Panels:** the review table (redlines editable), the contract viewer (a cite opens and highlights the
  quoted words), approvals with the route as the decision record, Insights, Analytics, Playbooks,
  Collections, Agents.
- **Shared state:** one store per matter: the plan and each task's status, findings, redlines (each
  marked as the human's or the agent's), reasons, the submission and each approver's decision; plus the
  published rules.
- **Edits that make the agent re-check:** a redline's text → re-check that rule; if it still deviates, ask
  only for the reason the General Counsel will need. The agent never changes the human's redline back.
- **Gates:**

| Action | Who | Sees | Options |
| --- | --- | --- | --- |
| Approve the plan (`proposePlan`, `useHumanInTheLoop`) | Maya | All 17 tasks and the rule each checks | Approve plan / Not yet |
| Send for approval (`requestApproval`, `useHumanInTheLoop`) | Maya | The route, the rule behind each approver, her reasons | Send for approval / Keep editing |
| Decide | Each approver in route order | The positions below the playbook and Maya's reasons | Approve / Send back / Reject |
| Publish a proposed rule | Rachel (rule owner) | The rule and the send-backs behind it, in the approvers' words | Publish to the copilot / Dismiss |
| Send the package to the vendor (to add in v1) | Maya | The approved package, after every approver | Send to vendor / Hold |

- **Surfaces:** web app only for v1. Slack or Teams approvals are later (*Assumed*) and need the tools and
  gates on the server (see `references/channels-and-openbot.md`).

## 3. Domain capabilities

### Tools

| Tool | Kind | Runs in | Gate? |
| --- | --- | --- | --- |
| readMatter | read | frontend | no |
| proposePlan | write (the plan) | frontend | **yes**: Approve plan |
| runPlanTask | compute; ticks one checklist task | frontend | refuses until the plan is approved; runs in plan order |
| updateRedline | write (draft) | frontend | never overwrites Maya's redline unless she asked |
| recheckRedline | compute | frontend | no |
| setDeviationReason | write (draft) | frontend | no |
| requestApproval | write | frontend | **yes**: Send for approval; refuses while an accepted deviation has no reason |
| readCollection, fillCollectionCell | read; compute one cell | frontend | no |

### Derived values

Today is pinned to 2026-11-05 (`src/data/company.json`).

| Value | Rule | Worked example (Acme Cloud MSA) |
| --- | --- | --- |
| Total contract value | annual fee × initial term in months / 12 | 240,000 × 36 / 12 = **$720,000** |
| Route | any deviation → GC; a data or security deviation → Head of Security; value > $500,000 → CFO | 7 deviations, 3 of them data or security, $720,000 → **Rachel → Jordan → Elena** |
| Findings and risk | one check per rule against the deal terms | **7 deviations**: high §8.2, §6.1, §6.4; medium §3.3, §7.3, §11.2; low §4.2. The other 5 rules pass, each cited |
| Re-check of an edited redline | the rule's minimum against the new text | "six (6) months … $1,000,000 cap for data-protection breaches" → PB-LIAB-01 **still deviates** (12 months wanted) |
| Days lost to security send-backs | sum of days from send-back to evidence received | Lumen Ridge, Cobalt Harbor, Fernway → **22 days** |

### The plan

1 Parties, products, order of precedence · 2 Term, renewal, notice (PB-REN-01) · 3 Fees and payment
(PB-PAY-01) · 4 Limitation of liability (PB-LIAB-01) · 5 Indemnities (PB-IND-01) · 6 Data protection and
DPA (PB-DATA-01) · 7 Security incident notice (PB-DATA-02) · 8 Security standards and audits · 9 IP,
usage data, outputs (PB-IP-01) · 10 Confidentiality (PB-CONF-01) · 11 Termination (PB-TERM-01) ·
12 Assignment (PB-ASSIGN-01) · 13 Insurance (PB-INS-01) · 14 Governing law (PB-LAW-01) · 15 Draft a
redline for every deviation · 16 Route for approval (PB-APR-01/02/03) · 17 Send the redline package
(only after every approval). Built by `buildPlan` in `src/lib/plan.ts`; a published rule adds its task.

## 4. Context and knowledge

### Rules

| Id | Rule | Source | Enforced in (`src/lib/review.ts`) |
| --- | --- | --- | --- |
| PB-REN-01 | Renews for at most 12 months; cancel with at most 30 days' notice | `playbook.md` | `CHECKS` |
| PB-PAY-01 | Net 45 or longer | `playbook.md` | `CHECKS` |
| PB-LIAB-01 | Cap at least 12 months of fees | `playbook.md` | `CHECKS`, `RECHECKS` |
| PB-IND-01 | Vendor defends IP claims, outside the cap | `playbook.md` | `CHECKS` |
| PB-DATA-01 | Signed DPA before customer personal data is processed | `playbook.md` | `CHECKS` |
| PB-DATA-02 | Security incident notice within 72 hours | `playbook.md` | `CHECKS` |
| PB-IP-01 | Northstar owns its data and outputs; aggregated, de-identified metrics only | `playbook.md` | `CHECKS` |
| PB-CONF-01, PB-TERM-01, PB-ASSIGN-01, PB-INS-01, PB-LAW-01 | Confidentiality, termination for convenience on 30 days, assignment, insurance, governing law | `playbook.md` | `CHECKS` |
| PB-APR-01/02/03 | Routing to the GC, Head of Security and CFO | `playbook.md` | `routeApprovals`, `totalContractValue` |
| PB-SOD-01 *(Assumed)* | The requester is never on the route and never decides | Separation of duties, not in the playbook | to add: a pure function with a test |
| PB-SEC-01 *(learned)* | Data processors: request the SOC 2 Type II report and latest pen-test summary before signing | 4 send-backs, published by Rachel | `LEARNED_CHECKS` |

- **Rule owner:** Rachel Adler, General Counsel.
- **Unwritten rule (from past send-backs):** "Ask for their SOC 2 Type II report and latest pen-test
  summary", sent back three times before go-live (Lumen Ridge Apr 9, Cobalt Harbor Jul 14, Fernway Sep 22).
- **Context the agent always has** (`useAgentContext`, built in `src/lib/app-context.ts`): Maya, the
  matters, the open matter's plan, findings, redlines and approvals, the published rules, and the
  Analytics figures and decision log.
- **Quoted data:** redlines, reasons and approvers' comments reach the agent under `quotedText`.

## 5. Data and integrations

| System | Read or write | v1 source |
| --- | --- | --- |
| Contracts | Sections with stable passage ids (§8.2) | `src/data/contracts/*.md` |
| Deal terms | One field per term, its passage id and the exact quoted words | `src/data/contracts/*.terms.json`, tested word for word in `contract.test.ts` |
| Review history | Past reviews, decisions, comments, resubmission dates | `src/data/review-history.jsonl` (six reviews) |
| Collection | Eight vendor contracts against six questions | `src/data/collection/` |
| Reviews, approvals, rules | Everything the people and the agent decide | The app's store (`src/lib/store.ts`), saved in the browser |

- **Extraction step:** the terms record stands in for a model extracting terms and a person checking them.

## 6. Agent harness

- **Runtime and agent:** one route, `src/app/api/copilotkit/[[...slug]]/route.ts`: a `CopilotRuntime` with
  one `BuiltInAgent`, its prompt built from the playbook (`src/lib/agent-instructions.ts`). Every business
  tool is a frontend tool, so the agent has no server tools of its own.
- **Where the run pauses:** the plan card and the send card (`useHumanInTheLoop`).
- **How the agent hears human edits:** each committed redline edit is posted as a message and the agent
  is run (`src/copilot/useTellCopilot.ts`), queued while it is busy (`src/copilot/edit-queue.ts`).

## 7. Models

- `openai/gpt-5.4-mini` by default (`COPILOT_MODEL` overrides it), key in `.env.local`. The scripted mock
  (`src/lib/mock-model.ts` playing `src/lib/demo-script.ts`) runs the demo with no key, pacing the
  checklist so the audience can watch it work.

## 8. Security and governance

- **Gates in code:** `runPlanTask` refuses before the plan is approved; `updateRedline` refuses to
  overwrite Maya's redline; sending refuses while an accepted deviation has no reason; task 17 waits for
  every approver (but then completes on the last approval, with no send click of its own: see "After the
  final approval"). The clicks are in `src/lib/gates.ts`, each tested.
- **Separation of duties:** PB-SOD-01 (*Assumed*): the requester is never on the route and never decides.
  Not in the starter: write it as a tested function. In the demo the presenter acts as every approver
  ("Acting as"), so a decision-time check can't fire from the UI.
- **Identity:** no sign-in. With Intelligence on, the user is resolved on the server, never from the
  browser. In production, bind every approval to the signed-in user on the server.
- **Audit trail:** the decision log (`decisionLog` in `src/lib/analytics.ts`): every gated action, who,
  role, when and the comment.
- **Before production:** the runtime endpoint has no auth and listens on localhost only; put it behind
  the app's sign-in. Runtime telemetry is on by default (`COPILOTKIT_TELEMETRY_DISABLED=true` turns it off).

## 9. Learning loop

- **Persisted:** reviews, redlines with who wrote them, every decision with its comment, published rules.
- **Signals:** send-backs in the approvers' own words, human redline edits (before and after), plan
  approvals, sends, published rules.
- **Seed evidence:** the six imported reviews, three of them security send-backs.
- **First candidate rule:** PB-SEC-01 "Security evidence for data processors" (proposed once a fourth
  matching send-back arrives).
- **Review owner:** Rachel Adler publishes; nothing changes the agent's behaviour until her click, and a
  published rule changes new plans only.
- **Learning path:** in the app, Insights groups send-backs (`src/lib/learning.ts`, a keyword classifier
  and a template) and publishing switches on a prepared check (`LEARNED_CHECKS`). In production,
  CopilotKit Intelligence's Automatic Learning, behind an off-by-default switch (`src/lib/intelligence.ts`,
  `CPK_INTELLIGENCE_ENABLED`): threads reach Automatic Learning, a first learning run needs 15 eligible
  threads, and a person publishes every skill. The switch also wires each gated decision as a Trajectory
  event (`src/lib/trajectory-events.ts`, sent by `src/copilot/useDecisionEvents.ts`), but Trajectories
  are off on hosted Intelligence today, so the demo doesn't rely on them.

## Demo script

| You type or do | The copilot should |
| --- | --- |
| "Review the Acme Cloud MSA and get it ready to sign." | Read the matter; propose the 17-task plan as a card. Nothing runs before the click |
| Approve plan | Work the checklist live; fill the review table with 7 cited deviations and 5 cited passes; draft a redline for each; route Rachel → Jordan → Elena |
| Rewrite the §8.2 redline to 6 months of fees with a $1,000,000 data-breach cap | "Saw your edit · re-checked": PB-LIAB-01 still deviates; ask only for the reason. Never change the value back |
| "Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about." then "Send it for approval." | Show the send card with route, rules and reason. Nothing is sent until the click |
| Approve as Rachel; send back as Jordan ("Ask Acme for their SOC 2 Type II report and latest pen-test summary before we sign…") | Insights proposes PB-SEC-01 from four send-backs; publish it as Rachel |
| "Review the Brightwater Metrics order form." | The 18-task plan includes "Request the SOC 2 Type II report and pen-test summary (PB-SEC-01 v1, learned)" without being asked |

## Assumptions and open questions

- The production send to the vendor (task 17) and where it writes are *Assumed*.
- Separation of duties and identity are not enforced in the starter (*Assumed* rule: the requester is
  never on the route).
- Approvers in Slack or Teams are *Assumed* later work.
- No delegates or escalation in v1 (*Assumed*).
