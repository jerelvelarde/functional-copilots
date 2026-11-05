# The story: "Signed by Friday"

One story carries the whole session: the app's data, the demo, the deck and the talk track all follow it.
Everything here is fictional. Northstar Software and every person and vendor are invented for the
workshop. Open Harvey is an open-source demo built with CopilotKit, not affiliated with or endorsed by Harvey. The numbers come from the app's tested code, never from the model.

## The cast

- **Maya Chen**, Senior Counsel at Northstar Software. One of two lawyers, 41 open vendor contracts. She is
  at the keyboard for the whole demo.
- **Dana Kim**, Director of Engineering, Platform Infrastructure. Her team needs Acme Cloud's observability
  platform in place before the Q1 multi-region failover work begins.
- **Rachel Adler**, General Counsel. Approves every position below the playbook, and owns the playbook. Her standing question:
  "Tell me what we're giving up, and why."
- **Jordan Blake**, Head of Security. Reviews any contract that touches customer data.
- **Elena Ortiz**, CFO. Approves the spend on any contract worth more than $500,000.
- **The copilot**, Open Harvey's contract copilot. It lives inside the matter workspace, works from the
  written playbook, cites every finding, and sends nothing without a person's click.

## The setup (the problem everyone in the audience has seen)

Thursday, 9:12 in the morning. Acme Cloud's Master Services Agreement lands in Maya's queue: 14 sections,
about 1,800 words, $240,000 a year for three years. Acme's pricing holds until next Friday. Dana needs it
signed so her team can start the failover work in January.

Maya knows how this usually goes. Two days reading it against the playbook. A spreadsheet of deviations. An
email chain with Security and Finance. Then the wait. What nobody has connected yet: the last three vendor
contracts that touched customer data (Lumen Ridge in April, Cobalt Harbor in July, Fernway in September)
each came back from Security with a note that looked like a one-off, and each one lost a week.

Open Harvey went live on Monday, with this year's vendor reviews imported. Whenever a new send-back
arrives, it checks whether the same reason keeps coming back.

This is the gap a functional copilot fills: not "answer questions about contracts", but take one real
workflow, from the contract landing to signed, with the people who own it in control.

## Act 1: The plan (Maya owns the judgment)

Maya types:

> Review the Acme Cloud MSA and get it ready to sign.

The copilot does not start reading and talking. It proposes a plan: a checklist of 17 tasks, from "Identify
the parties, products and order of precedence" through liability, data protection, security, termination
and insurance, down to "Draft a redline for every deviation", "Route for approval" and "Send the
redline package to Acme (only after every approval)". Each task names the playbook rule it will check.

The plan arrives as a card with **Approve plan** and **Not yet**. Nothing runs until Maya clicks.

*What the audience should notice:* the work is visible before it happens, and a person approves it. This is
the first human-in-the-loop moment, and it costs Maya five seconds.

## Act 2: The run (the copilot shows its work)

Maya clicks Approve plan. The checklist works itself down, task by task, in the Plan tab. Each task goes
from queued to working to done, with what it read (§8.2), the rule it checked (PB-LIAB-01), a one-line
finding, and a citation chip. Click the chip and the contract viewer jumps to the exact passage and
highlights it.

The review table fills as it goes. Seven deviations:

1. **Liability cap** at three months of fees; the playbook wants twelve (high risk).
2. **Auto-renewal** for 36 months with 90 days' notice; the playbook wants 12 months and 30 days.
3. **Payment** net 15; the playbook wants net 45.
4. **No data processing addendum**, though Acme will hold customer personal data (high risk).
5. **Breach notice** within 10 days; the playbook wants 72 hours (high risk).
6. **Acme owns "usage data and derived insights"**; Northstar must own its data and outputs.
7. **No termination for convenience**; the playbook wants 30 days.

The other five checks pass, and the table says so with a citation, because "we checked it" needs proof
too. The copilot drafts a redline for each deviation, written as replacement clause text against Acme's own
words, and works out the route from the rules, not from memory: Rachel (any position below the playbook),
Jordan (data and security terms), Elena (she approves the spend; $720,000 is over the $500,000 line). It
sums up in three lines.

*What the audience should notice:* the long checklist is the agent's plan made visible; every claim points
at a passage; every number and route came from code.

## Act 3: The edit (shared state, and judgment the copilot respects)

Maya has negotiated with Acme before. They will never take twelve months, but they will accept a separate
cap for data breaches. She rewrites the liability-cap redline in the table herself: 6 months of fees, with a
$1,000,000 cap for data-protection breaches.

The copilot notices without being told: "Saw your edit · re-checked." PB-LIAB-01 still deviates, so Rachel
will need a reason. It asks Maya for one. It does not argue, and it does not change her value back.

Maya types:

> Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about.

Then:

> Send it for approval.

An approval card: "Send the Acme review to Rachel Adler, Jordan Blake and Elena Ortiz for approval?" with
the route, the reason she gave, and **Send for approval** / **Keep editing**. Nothing leaves until she clicks,
and nothing goes to Acme until every approver has approved.

*What the audience should notice:* the human and the agent edit the same artifact, each sees the other's
changes, and writes are gated.

## Act 4: The people (approvals stay with people)

Rachel opens her inbox: "Rachel, Maya needs your approval on the Acme Cloud review." She sees the one position
below the playbook (the 6-month cap, with the $1M data-breach cap and Maya's reason), and approves.

Jordan opens it and sends it back:

> Ask Acme for their SOC 2 Type II report and latest pen-test summary before we sign. We need this whenever
> a vendor holds customer data.

It is the fourth time Security has asked for this, and the playbook still doesn't say it.

Maya opens Analytics. Before go-live, the six imported reviews: a third approved first time, a median of
10.5 days to signature, and 29 days lost to send-backs, three of them for the same missing security
evidence. Since go-live: this one review so far. Below that is the decision log: Maya approved the plan, Maya sent it,
Rachel approved, Jordan sent it back, each with a name and a time.

*What the audience should notice:* the decision log, the named approvers and the send-back reason are all
recorded, and Analytics reads them from the same tested functions. This is what "enterprise-ready" means
in practice.

## Act 5: The lesson (learning, with a person deciding)

Jordan's send-back is the first new one since Open Harvey went live, and it matches three in the imported
history. Insights groups them and surfaces the pattern in the approvers' own words: three before today
(Lumen Ridge, Cobalt Harbor, Fernway, each costing a week before resubmission), plus the one Jordan just
sent. It proposes a playbook rule, **PB-SEC-01 "Security evidence for data processors"**: for any vendor
that processes customer data, request the SOC 2 Type II report and the latest penetration-test summary
before signing.

Playbook changes belong to the General Counsel. Rachel reads the proposal and clicks **Publish to the
copilot**. Nothing changed in the copilot's behaviour until that click.

*What the audience should notice:* an unwritten rule surfaced from real corrections, in the approvers'
own words, and a person reviewed it before it took effect. In the starter, a simple classifier finds the
pattern and publishing switches on a prepared check. In production, CopilotKit Intelligence's Automatic
Learning does this analysis across real threads.

## Epilogue: The next contract

That afternoon, Brightwater Metrics sends an order form. Maya types:

> Review the Brightwater Metrics order form.

The new plan has a task nobody asked for: "Request the SOC 2 Type II report and pen-test summary
(PB-SEC-01 v1, learned)". The request goes out with the first redlines. It passes Security the first time.
Maya sends Acme the same request with the approved redline package, and Acme signs on Friday.

**Closing line:** The copilot didn't replace anyone's judgment. It remembered it.

## Optional: the whole portfolio

If there is time, Maya asks one more question across all of this year's vendor contracts:

> Check every contract in Vendor contracts 2026 for the security evidence PB-SEC-01 asks for.

The copilot opens the collection's review table and fills the Security evidence column one contract at a
time, quoting and citing each. Lumen Ridge, Cobalt Harbor and Fernway hold customer data, and none of
their contracts requires the evidence. Each sent it only after Security sent the review back: 22 days lost.
Brightwater's request already went out with its redlines, and Acme's goes out with the resubmission.
The other three vendors hold no customer data, so the rule doesn't apply to them.

*What the audience should notice:* one question, eight contracts, every answer cited. The rule Rachel
published this morning now covers the whole portfolio.

## Honest notes for Q&A

- The deal terms in the starter are a hand-written terms file, tested word for word against the contract
  text. It stands in for an extraction step; the copilot's checks, routing and learning run on it in code.
- In the starter, publishing PB-SEC-01 switches on a prepared check. In production, CopilotKit Intelligence's
  Automatic Learning proposes the rule from real threads, and a published skill is instructions the agent
  loads on every run, reviewed by a person before it goes live.
- The demo runs on a scripted model so it is repeatable; the same app runs on a real model with a key.

## How the story maps to the session

| Story beat | Session section | What it proves | CopilotKit piece |
| --- | --- | --- | --- |
| Setup | What a functional copilot is | One workflow, one function: "Legal has Harvey; every function needs its own" | — |
| Act 1: the plan | Agentic UX | Plans before actions; a person approves | `useHumanInTheLoop` |
| Act 2: the run | Build (live demo) | A long checklist worked live; cited findings; code does the math | frontend tools, `useComponent`, app context |
| Act 3: the edit | Agentic UX (live) | One shared artifact; the agent hears the human's edit; gated writes | shared state, `useHumanInTheLoop` |
| Act 4: the people | Govern | Named approvers, routing by rule, audit trail, Analytics from tested figures | approvals in the app, `useAgentContext`; Channels/OpenBot for chat |
| Act 5: the lesson | Learning | Corrections become a reviewed rule | Intelligence Automatic Learning |
| Epilogue | The stack and close | The same seven-layer stack fits any function: five layers you build once, two you swap | the starter and the skill |
| Optional: the portfolio | Learning (if time) | One question across eight contracts, one cited cell per tool call | frontend tools (`readCollection`, `fillCollectionCell`) |

## The same blueprint, another function

The headcount copilot (`starters/copilotkit-headcount/`) tells the same story for HR and Finance: Dana's
request for a senior engineer, Finance's cost model, the CFO line, and a learned "Security and access"
section. Use it as the second example when someone asks "does this work outside legal?"
