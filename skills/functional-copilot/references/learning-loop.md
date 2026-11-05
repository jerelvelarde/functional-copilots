# Designing the learning loop

A functional copilot should get better from the work people do with it. The safe way to do that is to
turn production behaviour into **skills**: short, versioned instructions that a person reviews before
the agent ever sees them. The model is not retrained; you can read, diff, roll back and audit every
change.

## The loop

1. **Capture.** Every conversation is a thread. Alongside it, record what humans did around the agent.
2. **Find patterns.** Group the corrections. A pattern is worth acting on when it recurs and costs
   something (cycle time, rework, a policy miss).
3. **Propose a skill.** Write the pattern as an instruction scoped to when it applies, with the evidence
   it came from.
4. **Human review.** An owner approves, edits or rejects. Nothing reaches the agent without approval.
5. **Deliver.** The published skill is loaded into the agent's instructions or context.
6. **Measure.** Did the send-back rate or cycle time move? Keep, revise or retire the skill.

## What to record from day one

| Signal | Example | Why it matters |
| --- | --- | --- |
| Send-back with comment | "Add a security and access justification" | The richest signal: an approver telling you the rule |
| Edit to an agent-proposed value | Base $212k changed to $225k | Shows where the agent's defaults are wrong |
| Override or rejection | Manager rejects the suggested location | Shows a missing rule or bad context |
| Abandoned draft | Started, never submitted | Points to friction or missing data |
| Time between steps | 6 days waiting on Finance | Puts a cost on each pattern |

Store the record id, who, what changed (before and after), the comment and a timestamp. Keep sensitive
values out of logs where you can (salary bands are usually fine; personal data is not).

## Skill format

```markdown
---
name: security-access-justification
applies-when: Platform or infrastructure roles, any request type
version: 1
owner: Priya Raman (Finance BP)
evidence: REQ-2026-071, REQ-2026-093, REQ-2026-117 (3 send-backs, 7 to 8 days each before resubmission)
---
Platform and infrastructure roles get production access. Every request for one includes a
"Security and access" section: which systems the person will access, at what level, whether they join
on-call, and who reviews the access. Ask the hiring manager if you do not know.
```

Keep skills small and specific. "Be more careful" is not a skill; "infrastructure roles need an access
section" is.

## In production with CopilotKit Intelligence

CopilotKit Intelligence's **Automatic Learning** runs this loop for you
([docs](https://docs.copilotkit.ai/learning)):

- Threads (and optionally captured browser activity, called Trajectories, off on hosted Intelligence
  today) are assigned to a
  **Learning container** (a Learning Space in the dashboard) for one kind of work.
- Once a container has enough eligible threads (15 by default), scheduled or manual runs summarise
  recurring patterns as **Insights** and propose **Skills**.
- A person reviews each proposed skill with its supporting threads and approves or rejects it. Only
  approved, published skills are delivered.
- Framework adapters (BuiltInAgent, LangGraph, Mastra, Google ADK, Microsoft Agent Framework) deliver
  published skills to the agent, which loads them when relevant. Or download them with
  `npx copilotkit@latest skills download <container-id>`.
- Delivery is switched on per container: publish the skill, then enable skill delivery in the
  container's Skills tab.
- On `BuiltInAgent`, opt in with its `learnedSkills` option (present in runtime 1.84.1), which fetches
  the published skills before each run.
- Delivered skills reach the model as tools (`copilotkit_load_skill`, `copilotkit_read_skill_file`), so
  the model decides whether to load one. The workshop starters instead put published rules in the
  agent's context on every turn (and Open Harvey also enforces them in code), which is more predictable
  for a demo.

Without Intelligence, run the same loop by hand: export corrections weekly, group them, write the
skill, have the owner review it in a pull request, and load approved skills into the agent's context.
Both starters' Insights panels show this loop end to end with seed data.

## The loop in Open Harvey

Open Harvey (in the workshop repo: `starters/open-harvey/`) runs the whole loop in the app, and it is the pattern to copy:

1. **Capture.** Every gated action lands in the store with who, role, when and the comment (one gap in
   the starter today: a resubmission after a send-back replaces the earlier round, so the decision log
   loses the send-back and Analytics can count the review as approved first time; check this before
   trusting the first-pass figure): plan
   approved, sent for approval (with the reasons), each approver's decision in their own words, each
   redline a person rewrote (before and after), each rule published. `decisionLog` in
   `src/lib/analytics.ts` reads them for the Analytics decision log.
2. **Find patterns.** The history of past reviews was imported at go-live. Each new send-back is matched
   against it (`src/lib/learning.ts`: a keyword classifier, so it runs the same every time); three or more
   with the same reason make a proposal.
3. **Propose.** Insights shows the proposed rule (PB-SEC-01) beside the send-backs behind it, in the
   approvers' words, with the days they cost.
4. **Human review.** Playbook changes belong to the General Counsel, so only her click publishes it, and
   the published rule records her as publisher. Dismiss is the other option.
5. **Deliver.** Publishing switches on a prepared check (`LEARNED_CHECKS` in `src/lib/review.ts`), so the
   learned rule holds as surely as the written ones, and the next plan carries a task for it.
6. **Measure.** Analytics shows send-back reasons before and since go-live from the same functions.

A published rule changes new work only: the contract already approved keeps its plan. That keeps every
past decision explainable.

## Switching on CopilotKit Intelligence (off by default)

Open Harvey's switch is the pattern for any copilot that should feed Automatic Learning without making
the demo depend on it. Read `src/lib/intelligence.ts` and the starter README's "Connect to CopilotKit
Intelligence" before copying it.

- **Off by default, two settings to turn on.** `CPK_INTELLIGENCE_ENABLED=true` and
  `CPK_INTELLIGENCE_API_KEY`, both in `.env.local`, so a stray key never switches it on. An optional
  `CPK_INTELLIGENCE_LEARNING_CONTAINER_ID` names the Learning Space (Open Harvey's default is
  `vendor-contract-review`; it must exist in the Intelligence project). Off, the runtime is exactly
  `{ agents: { default: agent } }`, nothing is recorded, and nothing leaves the machine but the model
  calls.
- **On, the runtime runs in Intelligence mode** (`runtimeOptions`): threads are stored in the project,
  every run joins the Space, and the user is resolved on the server (`identifyUser`), never from the
  browser.
- **The browser records a Trajectory** through the provider's `learning` prop (`@copilotkit/learning`),
  and the Trajectory joins the same Space. **Trajectories are off on hosted Intelligence today**, so on a
  hosted project, threads are what reach Automatic Learning. Wire the events anyway so they flow once
  Trajectories are on, and don't promise the Trajectories timeline in a demo.
- **Decisions become developer events.** Clicks alone can't say that an approver sent a review back or
  why, so each gated decision goes to the Trajectory as a named event built from the same entries as the
  decision log (`src/lib/trajectory-events.ts`, sent with `copilotkit.emitTrajectoryEvent` by
  `src/copilot/useDecisionEvents.ts`): `review.plan_approved`, `review.sent_for_approval` with the
  reasons, `review.approved` and `review.sent_back` with the approver's words, `redline.edited` before
  and after, `playbook.rule_published`. Decisions already in the store on reload are not sent again.
  Name yours after your workflow's decisions the same way.
- **It fails loud.** At startup the server reads the Space with the key and the app shows the result: a
  wrong key or unreachable service is an error, a missing Space a warning, a Trajectory capture failure
  is shown too. Never swallow these.

**Keys are the user's to handle.** Tell the user which variable names go in `.env.local` and let them
paste the values themselves. Never read, print, echo or ask for the value of a key, and never open
`.env.local` or any other secrets file to check it; to confirm the switch works, ask the user what the
app's startup line or Intelligence strip says.
