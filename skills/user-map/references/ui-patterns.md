# UI patterns: the shapes of functional workspaces

Most functional software follows one of a handful of layouts. Find the pattern that matches the *object
of work* (what the user changes all day), then adapt its regions to the real software and role. Products
are named only to say where you'll see each pattern, and each is described in our own words. Each
pattern has a starter `layout` you can copy and edit.

Contents: timeline editor · document review · grid or ledger · queue with a detail pane · pipeline
board · form with an approval chain · canvas · schedule or dispatch board · dashboard with drill-down ·
inbox and thread.

---

## Timeline editor

**Seen in:** video editing (Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid Media Composer, browser
editors), audio and podcast editing, motion graphics.
**Object:** a sequence of clips on tracks over time. **Selection:** clips, an in-to-out range, the
playhead. **Open:** one sequence, one source clip.
**Regions:** media bins · source monitor · program monitor · timeline · inspector.
**Copilot usually:** a docked panel beside the inspector. It reads the sequence, the playhead and the
selection. Its work lands on the timeline (a ghost track), in bins (a selects bin) and as markers. Gate
anything that changes the real sequence, deletes media, or exports or sends for review.

```json
{ "columns": "1fr 1.3fr 1.3fr 1fr", "rows": "1fr 1fr",
  "areas": ["bins source program inspector", "bins timeline timeline copilot"] }
```

## Document review

**Seen in:** legal contract review, policy and compliance review, procurement terms, grant and claims
review (Word with Track Changes, contract lifecycle tools, document suggestion modes; the workshop's
Open Harvey).
**Object:** one document, passage by passage. **Selection:** a passage or clause. **Open:** the document,
its proposed changes and the checklist or playbook.
**Regions:** queue or matter list · document viewer · changes (redlines) · comments · checklist or
playbook · approvals.
**Copilot usually:** in the matter, with its plan on a rail. Findings are cited to the passage, redlines
land in the changes, and a cite opens the document at the right place. Gate the plan, sending for
approval, and anything that goes to the other side. Open Harvey is the worked example
(`examples/legal-contract-review.json`).

```json
{ "columns": "0.75fr 1.35fr 1.35fr", "rows": "1.1fr 1fr 0.75fr",
  "areas": ["queue thread document", "queue thread changes", "queue checklist approvals"] }
```

## Grid or ledger with filters

**Seen in:** accounting, posting and reconciliation, FP&A, payroll, inventory (ERP and accounting suites,
spreadsheets). AP *exceptions* are usually a queue with a detail pane, with a small grid inside the
detail.
**Object:** rows (transactions, invoices, journal lines) in a period. **Selection:** rows or cells, a
filter. **Open:** one register or report, one period.
**Regions:** filter bar · grid · row detail drawer · totals or summary · period and entity switcher.
**Copilot usually:** a panel beside the row detail drawer that reads the filter and the selected rows.
Its work is a *draft* in the grid (a proposed coding or match, marked as a suggestion) that a person
posts. Gate posting, payment, period close and bulk edits; the gate lists every row it touches. Keep all
the math in tested code.

```json
{ "columns": "2fr 1fr", "rows": "auto 1fr auto",
  "areas": ["filters filters", "grid detail", "totals detail"] }
```

## Queue with a detail pane

**Seen in:** IT service desk, customer support, HR cases, claims, AP exceptions (ticketing and service
management tools).
**Object:** a ticket or case. **Selection:** one ticket, or a batch from the queue. **Open:** the queue
and one ticket's detail.
**Regions:** queue list · ticket detail · conversation or activity · properties sidebar · knowledge.
**Copilot usually:** in the detail pane, next to the conversation. It reads the open ticket, its history
and similar tickets. It drafts the reply and the field changes in place for the agent to edit. Gate
sending to the customer, closing, reassigning, refunds and access grants. A batch action's gate lists
every ticket.

```json
{ "columns": "1fr 1.6fr 0.9fr", "rows": "1fr 1fr",
  "areas": ["queue detail props", "queue convo props"] }
```

## Pipeline board

**Seen in:** sales, recruiting, partnerships, deal desks (CRMs, applicant tracking systems).
**Object:** a record (a deal or candidate) moving through stages. **Selection:** one card. **Open:** the
board and one record.
**Regions:** stage columns · card · record detail · activity timeline · next steps.
**Copilot usually:** in the record detail. It reads the stage, the activity and the notes, then drafts
the next step, the follow-up message or the stage change. Gate stage moves that trigger something (an
offer, a contract), and every outbound message.

```json
{ "columns": "1fr 1fr 1fr 1.4fr", "rows": "1fr 1fr",
  "areas": ["s1 s2 s3 record", "s1 s2 s3 activity"] }
```

## Form with an approval chain

**Seen in:** headcount, purchase and access requests, expenses, discounts (HR and procurement suites,
service catalogs; the workshop's headcount starter).
**Object:** one request with derived values. **Selection:** a field. **Open:** the request, the policy
and the route.
**Regions:** request form · computed summary (cost, totals) · policy panel · approval route ·
attachments.
**Copilot usually:** beside the form. It fills and checks fields, explains the rule behind each check,
and computes the route from the rules. Gate submitting, each approver's decision, and the final write to
the system of record. See `starters/copilotkit-headcount/`.

```json
{ "columns": "1.5fr 1fr", "rows": "1fr 1fr",
  "areas": ["form summary", "form route"] }
```

## Canvas

**Seen in:** design, marketing creative, diagrams, slides (design tools, whiteboards).
**Object:** frames and layers on a canvas. **Selection:** layers or a frame. **Open:** one file or page.
**Regions:** canvas · layers · properties inspector · assets.
**Copilot usually:** in the inspector column, acting on the selection. It proposes variants as new
frames beside the original, never overwriting it. Gate replacing the original, publishing and sharing
externally.

```json
{ "columns": "0.8fr 2.4fr 1fr", "rows": "1fr 1fr",
  "areas": ["layers canvas inspector", "assets canvas inspector"] }
```

## Schedule or dispatch board

**Seen in:** field service, logistics, shift planning, interview scheduling.
**Object:** jobs or shifts on a calendar or Gantt, often with a map. **Selection:** a job, a person, a
time slot. **Open:** a day or a week.
**Regions:** unassigned list · schedule · map · job detail.
**Copilot usually:** a panel beside the job detail. It proposes assignments as tentative blocks on the
schedule. Gate committing the schedule and notifying people.

```json
{ "columns": "0.9fr 2fr 1fr", "rows": "1fr 1fr",
  "areas": ["unassigned schedule detail", "unassigned schedule map"] }
```

## Dashboard with drill-down

**Seen in:** RevOps, supply chain planning, operations reviews, analytics.
**Object:** a metric and the rows behind it. **Selection:** a chart segment or filter. **Open:** one
dashboard.
**Regions:** filters · KPI tiles · chart · drill-down table.
**Copilot usually:** anchored to the chart. It reads the filters and the selected segment, explains the
change, and drafts the follow-up (an alert, a task, a plan change). Gate anything that writes back to a
plan or notifies people. All figures come from queries, never from the model.

```json
{ "columns": "1fr 1fr 1fr", "rows": "auto auto 1fr",
  "areas": ["filters filters filters", "kpis chart chart", "table table table"] }
```

## Inbox and thread

**Seen in:** sales follow-up, recruiting outreach, customer success, vendor communication (email and
messaging clients, shared inboxes).
**Object:** a thread with a contact. **Selection:** a message or a thread. **Open:** the inbox and one
thread.
**Regions:** inbox list · thread · composer · contact sidebar.
**Copilot usually:** in the composer and the contact sidebar. It drafts the reply in place and shows the
contact's record. Gate every send. Chat surfaces such as Slack or Teams follow this pattern too; see
`/agent-context` for reaching them.

```json
{ "columns": "1fr 1.8fr 0.9fr", "rows": "1.6fr 1fr",
  "areas": ["inbox thread contact", "inbox composer contact"] }
```

---

## When the workspace mixes patterns

Many apps combine two. A support tool is a queue with an inbox inside the detail pane; a legal tool is a
queue of matters with document review inside. Map the pattern where the *first job's* work happens, and
mention the other in `pattern.summary`.

## Layout notes

- `areas` is a CSS grid-template-areas list: one string per row, one word per cell, and the same number
  of cells in every row. Repeat a word to span cells. Every word must be a region `id`. Use `.` for an
  empty cell.
- Keep it to four to seven regions. The point is the shape of the workspace, not every panel.
- Give a new copilot panel its own cell, and mark it `"new": true`.
