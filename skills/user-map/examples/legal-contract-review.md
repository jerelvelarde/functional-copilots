# User map: Senior counsel in Word and email

*2026-11-05 · made with /user-map · step 1 of 5: /user-map → /agent-context → /functional-copilot → /deploy → /secure-governance, with learning through CopilotKit Intelligence.*

> A contract copilot that works inside the matter: it reads the open contract and the playbook, works the review checklist live, drafts redlines into the review table, and waits for the lawyer's click before the plan runs and before anything goes to an approver.

Evidence: 52 sourced, 7 assumed, 0 confirmed. Anything marked *(Assumed)* has not been checked with a real user yet.

## For /functional-copilot's Phase 1 interview

Start the interview from these answers and ask only what is missing or *(Assumed)*.

**Round 1: the workflow**
- Function: Legal · vendor contracts. Users: Senior counsel, working in Word and email.
- Shape: review against a playbook.
- First job for the copilot (J1): "When a vendor contract lands in my queue, I want to have it checked against our playbook, with every deviation cited and a redline drafted, so I can decide what we accept in minutes, not two days." [1]
- Flow "A vendor contract, from received to ready to sign (today)". Trigger: Acme's MSA arrives by email with a Friday deadline. Outcome: a redline package every approver has approved, sent to the vendor.
- Copilot built in: Open Harvey: a web matter workspace that puts the contract, the redlines and the approvals in one place (starters/open-harvey).
- After the last approval: not mapped yet *(Assumed)*: ask what gets written, in which system, on whose click.

**Round 2: people and rules**
- Handoff: Business owner: Sends the vendor's contract and the deadline to legal. [1]
- Handoff: Senior counsel: Works out who must approve and sends it to the General Counsel, Security and Finance. [1][2]
- Approval: Head of Security: Sends it back: ask for the SOC 2 Type II report and pen-test summary first (the fourth time). [1]
- Handoff: Senior counsel: Sends the approved redline package to the vendor. [1]
- Works with Dana Kim, business owner: sends the contract and the deadline (signed by Friday) [1]
- Works with Rachel Adler, General Counsel: approves any position below the playbook and owns playbook changes (PB-APR-01) [2]
- Works with Jordan Blake, Head of Security: approves data, security and customer-data terms (PB-APR-02) [2]
- Works with Elena Ortiz, CFO: approves the spend above $500,000 total contract value (PB-APR-03) [2]

**Round 3: systems and numbers**
- Main software: Microsoft Word with Track Changes: Where the contract is read and redlined: every insertion and deletion is marked with who made it, and each can be accepted or rejected. [5][6]
- Also: Email: Where the contract arrives and where approvals and send-backs happen today, as a chain with Security and Finance. [1]
- Also: A spreadsheet of deviations: Where findings get listed by hand while reading. [1]
- Also: The written playbook: The positions Northstar accepts, one rule per clause, owned by the General Counsel. [2]
- Measured on: Days from contract received to signature (the imported history's median is 10.5 days) [1]
- Measured on: Reviews approved the first time they're sent (a third, before go-live) [1]
- Measured on: Days lost to send-backs (29 across six reviews) [1]
- Where the time goes (A vendor contract, from received to ready to sign (today)): Reading against the playbook (about two days) and send-backs (about a week each). In the six imported reviews: a 10.5-day median to signature, a third approved first time, and 29 days lost to send-backs, three of them for the same missing security evidence. These are the workshop's fictional figures.

## The workspace: Document review

The document is the centre. Changes are proposed against the other side's own words and shown as strike-and-insert; comments sit beside the passage they're about; a checklist (the playbook) says what to check. Today the approvals live outside the document, in email. [2][5]

- Object of work: One contract, passage by passage (§8.2 Limitation of liability)
- Selection: A passage or clause in the document; in the copilot app, a row of the review table
- Open at once: One contract, its redlines, and the playbook it's checked against
- Regions: Matter queue · Document viewer · Redlines · Review checklist · Approvals · Copilot thread

## Jobs to be done

- **J1 (first)** When a vendor contract lands in my queue, I want to have it checked against our playbook, with every deviation cited and a redline drafted, so I can decide what we accept in minutes, not two days. [1]
- **J2** When a position falls below the playbook, I want to route it to the right approvers by rule, with my reason attached, so I can get sign-off without an email chain. [1][2]
- **J3** When an approver sends a review back, I want to see what they asked and whether it has happened before, so I can fix it once and stop it coming back. [1]
- **J4** When the business asks what our contracts say about something, I want to get one answer across the portfolio, with each contract's words quoted, so I can answer without opening every contract. *(Assumed)*
- **J5** When the same unwritten rule keeps coming up, I want to add it to the playbook once the General Counsel agrees, so I can stop relearning it on every contract. [1]
- **J6** When the business owner asks for a date, I want to see where the contract stands and who it waits on, so I can give a real date, not a guess. *(Assumed)*

## Key flows

**A vendor contract, from received to ready to sign (today)** (Acme's MSA arrives by email with a Friday deadline → a redline package every approver has approved, sent to the vendor)

1. Business owner (email): Sends the vendor's contract and the deadline to legal. *Minutes* · **handoff** [1]
2. Senior counsel (in Document viewer): Reads all 14 sections against the playbook. *About two days* [1]
3. Senior counsel (spreadsheet): Lists each deviation, its rule and its risk by hand. *Part of those two days* [1]
4. Senior counsel (in Redlines): Drafts a redline for every deviation in tracked changes. *Hours* *(Assumed)*
5. Senior counsel (email): Works out who must approve and sends it to the General Counsel, Security and Finance. *Same day* · **handoff** [1][2]
6. Approvers (email): The review waits for three people to read it. *Days* · **wait** [1]
7. Head of Security (email): Sends it back: ask for the SOC 2 Type II report and pen-test summary first (the fourth time). *About a week lost* · **approval** [1]
8. Senior counsel (email): Sends the approved redline package to the vendor. *Minutes* · **handoff** [1]

Where the time goes: Reading against the playbook (about two days) and send-backs (about a week each). In the six imported reviews: a 10.5-day median to signature, a third approved first time, and 29 days lost to send-backs, three of them for the same missing security evidence. These are the workshop's fictional figures.


## Where the copilot lives

Built with CopilotKit: the React v2 hooks in the app, AG-UI to the agent (`BuiltInAgent` or any AG-UI agent), the CopilotKit Runtime on the server, CopilotKit Intelligence for threads, memory and learning, and the web inspector while you build.

- **Surface:** Copilot thread; its work lands in Review checklist, Redlines, Document viewer, Approvals. The copilot is a colleague on the matter, not a separate chat. Its thread sits in the matter workspace with the plan on a rail beside it; opening the review table or the contract puts it next to the thread, so the lawyer edits a redline and watches the copilot re-check it in one glance. Its work lands in the workspace's own objects: ticks in the checklist, rows and redlines in the review table, cite chips that open the document on the passage, a route in Approvals. [3][4]
- **Not this:** A legal chatbot in a side panel that can't see which matter is open, wants clauses pasted in, answers in paragraphs, and leaves the lawyer to copy its suggestions into Word.
- **Reads (`useAgentContext`):**
  - Who is asking (Maya, Senior Counsel) and every open matter [3]
  - The open matter: its plan, findings, redlines, reasons and approvals [3]
  - The rules a person published (PB-SEC-01 after Rachel's click) [3]
  - The Analytics figures and the decision log [3]
  - Text people typed, fenced as quoted data so it is never read as instructions [3]
- **Does (`useFrontendTool`):**
  - `readMatter`: Opens a matter's contract and its deal terms. [3]
  - `runPlanTask`: Works one checklist task and ticks it in shared state; refuses before the plan is approved and runs tasks in plan order. [3]
  - `updateRedline`: Drafts or revises a redline, never over the lawyer's own edit. [3]
  - `recheckRedline`: Re-checks an edited redline against its rule. [3]
  - `setDeviationReason`: Records the lawyer's reason for a position below the playbook. [3]
  - `readCollection · fillCollectionCell`: Answers one question across a collection of contracts, one cited cell per call. [3]
- **Renders (`useComponent`):**
  - `showFindings`: Findings cited to the exact passage; each cite chip opens the document viewer on it. [3]
  - `showRedlines`: Redlines as a blackline of the vendor's own words. [3]
  - `showRecheck`: The re-check card after a human edit: the rule, and whether it still deviates. [3]
  - `useRenderTool "*"`: Every tool call folded into one live "Working" line instead of a wall of tool output. [3]
- **Waits for a person (`useHumanInTheLoop`):**
  - `proposePlan`: The 17-task plan as a card: Approve plan or Not yet. Nothing runs before the click. [2][3]
  - `requestApproval`: Send for approval to Rachel, Jordan and Elena, with the rule behind each approver and Maya's reason. Nothing is sent until the click; nothing goes to the vendor until every approver approves. [2][3]
  - `Approvals panel · Publish`: Approve, send back, and Rachel's Publish to the copilot are people's clicks in the app, not tools the agent can call. [2][3]
- **Shared state (`useAgent`, or app state through `useAgentContext` + `useFrontendTool`):**
  - The review table: one row per finding, with a redline both the lawyer and the copilot edit. The store keeps a human edit and the copilot can't overwrite it. [3]
  - A human edit is posted to the copilot as a quiet event and starts a run; if the agent is busy it waits in a queue, latest text wins. [3]
- **Learns from (CopilotKit Intelligence: Automatic Learning):**
  - Approver send-backs with their comments: Jordan's SOC 2 ask matches three past send-backs, so Insights proposes PB-SEC-01 and Rachel publishes it; the next plan carries it. [1][3]
  - In production, CopilotKit Intelligence's Automatic Learning groups real threads into a learning space, surfaces Insights and proposes skills a person reviews and publishes. Open Harvey keeps it behind an off-by-default switch. [3]

## Build checklist

- [ ] C1 Put the open matter in the copilot's context: useAgentContext (`starters/open-harvey/src/copilot/useAppContext.ts`)
- [ ] C2 Make the review plan a card the lawyer approves: useHumanInTheLoop (`starters/open-harvey/src/copilot/useProposePlan.tsx`)
- [ ] C3 Turn each checklist task into a tool that ticks it: useFrontendTool (`starters/open-harvey/src/copilot/useReviewTools.ts`)
- [ ] C4 Draw findings and redlines as the workspace's own objects: useComponent (`starters/open-harvey/src/copilot/useGenerativeUI.tsx`)
- [ ] C5 Share the redline, and let the copilot hear the lawyer's edit: useAgent + useCopilotKit (`starters/open-harvey/src/copilot/useTellCopilot.ts`)
- [ ] C6 Gate the send for approval: useHumanInTheLoop (`starters/open-harvey/src/copilot/useRequestApproval.tsx`)
- [ ] C7 Keep routing and every figure in tested code: useFrontendTool (`starters/open-harvey/src/lib/review.ts`)
- [ ] C8 Record send-backs and turn repeats into a rule a person publishes: CopilotKit Intelligence (`starters/open-harvey/src/lib/learning.ts`)
- [ ] C9 Watch the context and the tool calls in the web inspector while you build: CopilotKit web inspector (`starters/open-harvey/src/components/LegalApp.tsx`)

## Check with real users before building

- [ ] A commercial or in-house counsel who reviews vendor contracts every week
- [ ] The General Counsel who owns the playbook and approves deviations
- [ ] A security or finance approver who receives routed reviews

1. Do you read the contract first or the checklist first? (decides whether the plan or the document opens first)
2. Which deviations would you never want a copilot to draft a redline for?
3. Where do approvals reach you today, and would you approve in the app, or only in email or Slack?
4. What would make you trust a cited finding without re-reading the clause?
5. How is your week really split between reading, redlining, chasing approvals and answering questions?

## Sources

1. The story: "Signed by Friday", this workshop: docs/story.md. The cast, today's process (two days reading, a spreadsheet of deviations, an email chain, send-backs a week each) and the fictional figures.
2. Open Harvey: contract-review copilot (demo spec), this workshop: docs/legal-demo-spec.md. The playbook rule ids, the routing rules, the approvers and the 17-task plan.
3. Open Harvey starter: copilot hooks and panels, this workshop: starters/open-harvey/src/. Every hook, tool and component name on this map, and which file each lives in.
4. Open Harvey product and design notes, this workshop: starters/open-harvey/PRODUCT.md. The copilot as a colleague on the matter, with its thread at the centre and its plan on a rail.
5. Track changes in Word, Microsoft Support: https://support.microsoft.com/en-us/office/track-changes-in-word-197ba630-0f5f-4a8e-9a77-3712475e806a. Tracked changes mark who inserted or deleted what, and each change can be accepted or rejected.
6. Open Harvey: the feature inventory, this workshop: docs/open-harvey-features.md. Review and redlining inside Word is how the category works today; the review table's blackline is the in-app equivalent.

Next: /agent-context (2 Context & access), then /functional-copilot (3 Spec & build). Both start from this brief.

Full map: `legal-contract-review.html` (open it in a browser).
