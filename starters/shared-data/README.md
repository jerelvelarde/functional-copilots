# Shared data: the Northstar headcount story

One fictional company, used by both starters, the skill's worked example and the deck, so every
surface tells the same story with the same numbers.

| File | What it holds |
| --- | --- |
| `company.json` | Fiscal year, the six people in the story, the cost model, approval thresholds |
| `headcount-plan.json` | FY2027 approved net-new reqs per team and quarter, open reqs, personnel budgets |
| `comp-bands.json` | Base salary bands by level (L3 to L7) and location tier |
| `policies.md` | The written policy, rule by rule (`POL-HC-01` ...), so the copilot can cite it |
| `approval-history.jsonl` | Past decisions. Holds a pattern that is **not** in the written policy (see below) |

## The demo request

Dana Kim, Director of Engineering for Platform Infrastructure, types:

> I need approval to hire a senior engineer in New York next quarter.

What the copilot should work out:

| Step | Result | Rule |
| --- | --- | --- |
| Missing fields | Asks for request type and justification; infers L5, New York, Q1 FY2027 | POL-HC-01 |
| Plan fit | Platform has 2 approved net-new for Q1, 1 already opened (REQ-2027-014): **1 left** | POL-HC-02 |
| Location | New York is Tier 1 and Platform has a New York office | POL-COMP-02 |
| Band | L5 Tier 1: $185,000 to $240,000, midpoint **$212,000** | POL-COMP-01 |
| Start date | Feb 1 2027, so **11 months** in FY2027 | POL-HC-04 |
| Fully loaded annual | 212,000 + 31,800 bonus + 45,000 equity + 38,160 benefits + 16,960 taxes = **$343,920** | POL-FIN-02 |
| FY2027 impact | 343,920 x 11/12 = 315,260, plus 19,000 one-time = **$334,260** | POL-FIN-02 |
| Budget | 9,600,000 budget - 9,180,000 committed = **$420,000** remaining: fits, $85,740 left | POL-FIN-01 |
| Approvers | Marcus Lee (VP Engineering), then Priya Raman (Finance BP). No CFO: $343,920 is under $350,000 | POL-APR-01/02 |

### The live edit

Dana raises the base to **$225,000** in the business case (a competing offer). The copilot should
notice, without being asked:

- Above the midpoint, so it asks for a one-line reason (POL-COMP-01).
- Fully loaded annual becomes 225,000 + 33,750 + 45,000 + 40,500 + 18,000 = **$362,250**, over
  $350,000, so **Elena Ortiz (CFO) joins the approval chain** (POL-APR-02).
- FY2027 impact becomes 362,250 x 11/12 + 19,000 = **$351,063** (rounded). Still inside the $420,000.

## The learning beat

`approval-history.jsonl` shows Platform requests being **sent back** three times for the same reason:
the role gets production access, and approvers want a *security and access justification*. That rule is
not in `policies.md`. Each send-back came back within 4 to 6 days and cost 7 to 8 days before the request was resubmitted (22 days across the three).

This is what "learning later" finds: a recurring correction from real usage becomes a proposed skill
("Infrastructure and platform roles include a security and access justification: which systems, what
access level, who reviews it"). A person reviews and publishes it, and the next request includes the
section before anyone has to ask.

A second, smaller pattern: Finance asks for FY impact and annual run-rate to be shown separately.
