---
name: functional-copilot
description: The root of the functional-copilot suite. Takes an engineer from "we want a copilot for <function>" to a running copilot for one real workflow, and walks the whole process: research (/user-map), context and access (/agent-context), spec and build here, then /deploy and /secure-governance, with learning through CopilotKit Intelligence. Interviews, picks one bounded workflow, writes a spec on the seven-layer functional agent stack for approval (markdown plus an HTML page), then adapts a CopilotKit starter (Open Harvey for playbook reviews, headcount for request-and-approval) inside the function's own workspace. Use it whenever someone wants an AI copilot, assistant or agent for a department, a back-office process (purchase requests, invoice exceptions, contract review, access requests, headcount) or an expert tool (a video editor's or designer's assistant), even if they never say "functional copilot". Not for FAQ or document-search chatbots, configuring a vendor copilot (Microsoft 365), or coding agents.
---

# Functional copilot

A functional copilot is not a chatbot trained on a department's documents. It is a participant in one
real workflow: it knows who is asking, what the rules are, what the systems say, what the end artifact
must look like and who has to approve it, and it improves from the corrections people make.

Your job is to get the engineer from "we want a copilot for <function>" to a running copilot for **one**
workflow, in an afternoon. You are the root of the suite: you walk the whole process and hand off to a
step skill where one exists. Don't skip the spec: most failed copilots were built model-first, and the
spec is where the human-agent workflow gets designed.

**The one hard stop.** Always show the filled spec and wait for an explicit yes before you copy a
starter or write any code. Never build in the same turn the spec is first shown, even if the user said
"just build it" up front. Defaults fill unanswered interview questions; they never stand in for the
spec's yes. In a non-interactive run, where nobody can reply, deliver the spec and stop, and list in
your reply the questions you would have asked, each with the default you used.

**Secrets are the user's.** Name the environment variables a build needs and where they go
(`.env.local`); the user pastes the values. Never read, print or ask for a key, and never open
`.env.local` or another secrets file, even to check that it is set.

## The process

| Step | Where | What it leaves in the user's repo |
| --- | --- | --- |
| 1 Research | `/user-map` | `docs/copilot/user-map.md` and `.html`: the role, its workspace, its jobs and flows, where the copilot sits |
| 2 Context & access | `/agent-context` | `docs/copilot/agent-context.html`: what the agent sees and touches, and as whom |
| 3 Spec & build | Here: Phases 1 to 4 below | `docs/copilot/copilot-spec.md` and `.html`, then the running copilot |
| 4 Deploy | `/deploy` | `docs/copilot/deploy.html` |
| 5 Secure & govern | `/secure-governance` | `docs/copilot/secure-governance.html`, in prototype or production mode |
| Learn | CopilotKit Intelligence | Rules or skills a person publishes (Phase 4) |

The step skills are separate skills in `.claude/skills/` and also run on their own. When one isn't
installed, do that step's minimum here (this skill's references cover it) and say so.

- **Start:** if `docs/copilot/user-map.md` exists, start Phase 1 from it: confirm what it says instead
  of asking again, and ask only what it leaves open. Its Round 1 names the shape ("Shape: …", one of the
  five names in `references/blueprint.md`); confirm it rather than asking. Use the map's other jobs as
  the rows of the spec's "Candidates considered" table. If it doesn't exist and the role or its
  workspace is unfamiliar (an expert or creative tool, a function you can't picture), offer `/user-map`
  first. It is optional: if the user declines, go straight to the interview.
- **Then context and access:** after research, offer `/agent-context` before the spec, so the spec can
  build on what the agent must see and touch, through which connection and as whom. Also optional: if
  the user declines, the spec covers those layers itself.
- **When the repo already has the copilot** (the user map or the code shows it, as when someone runs
  this on Open Harvey itself): the spec confirms what exists and names the changes, and the build builds
  only those, tests first. Leave working parts alone, and extend the scripted mock with the new steps
  rather than cutting it.
- **Hand off:** after the build, steps 4 and 5 come next, in order. Name them in the hand-back with what
  each one will settle for this copilot. They prepare and assess; they don't build. When `/deploy` or
  `/secure-governance` finds a gap in the app (sign-in, a server store, the decision log), the fix is
  build work that comes back here (Phase 3, step 8).

The phases of step 3: interview, spec, build, learning plan.

What to read when (the references are long; don't load what the phase doesn't need):

| Phase | Read |
| --- | --- |
| 1 Interview | `docs/copilot/user-map.md` in the user's repo, if `/user-map` ran. The worked example closest to the user's shape, for calibration: `assets/worked-example-headcount.md` (request → approval) or `assets/worked-example-contract-review.md` (review against a playbook). The user's section of `references/function-catalog.md` (search for its heading) |
| 2 Spec | `docs/copilot/agent-context.html` (or `.json`) in the user's repo, if `/agent-context` ran. `assets/copilot-spec-template.md`, `references/blueprint.md` (the stack), `examples/contract-review-spec.json` (the page's data, filled), `references/channels-and-openbot.md` if chat is in scope |
| 3 Build | `references/starters.md`, the chosen starter's README, `references/copilotkit-patterns.md` |
| 4 Learning | `references/learning-loop.md` |

## Phase 1: Interview (two or three rounds, not an interrogation)

Ask in **at most three rounds**, grouping related questions and offering a default for each, so a busy
engineer can answer "yes, yes, actually X". Skip anything the user already told you or that you can read
from their repo. After the third round, stop: write the remaining unknowns into the spec as explicit
assumptions (mark them *Assumed* where they appear) and move on. If a question gets no answer, use its
default and mark it *Assumed*; if nobody answers at all, write the spec on defaults and say so at the
top. Defaults only fill in answers. The spec still needs its yes (see the hard stop above).

**Round 1: the workflow.**
1. **Function and workflow.** "Which department, and which one workflow?" If they say "an HR copilot",
   help them narrow using their section of `references/function-catalog.md` and the picking checklist
   below. A good first workflow is *frequent, bounded, rule-heavy, approval-gated and measurable*.
   If the workflow spans many entities (apps, vendors, cost centres), pick the two or three for v1.
2. **Trigger, work items and outcome.** "What starts it, and what exists at the end?" A trigger can be a
   sentence someone types, a document that arrives (a contract, an invoice), or a system event: an
   invoice that failed matching, a late shipment, a schedule (month-end), a webhook. Is it one request at
   a time, one document reviewed against a checklist, a queue of many items worked as a list, or work
   inside an expert tool where each change is a proposal the person accepts (workspace assist: a video
   editor's selects or rough cut)? Push for an artifact: "an approval-ready headcount request", "a redline package every approver signed off",
   "a coded invoice ready to pay", not "answers".
3. **Today's process and the final write.** How does it run now (form, channel, ticket queue), and will
   the copilot replace it, sit in front of it, or feed it? This decides what the submit writes to. Then
   ask what happens after the last approval: which system changes (HRIS record, posted journal,
   provisioned access, PO, a package sent to a vendor), who or what makes that change, and on whose click.

**Round 2: people and rules.**
4. **Actors and approval shape.** Who requests, who approves, in what order (sequential, parallel, any
   one of a group, or routed by rule), with what delegates, and what happens when nobody answers.
5. **Rules.** Where are the policies or the playbook written down, and who owns changes to them? Collect
   them as numbered rules with ids: keep the policy's own ids if it has them (a playbook's `PB-LIAB-01`),
   otherwise use `POL-<AREA>-<NN>`. Then ask for **five to ten real past send-backs or
   rejection comments**: what approvers actually push back on is often missing from the written policy,
   and those comments seed the learning loop.
6. **Guardrails.** Separation of duties, data the copilot must never show or store, identity checks,
   audit requirements.

**Round 3: systems and numbers.**
7. **Systems and data.** Which systems of record hold the facts (HRIS, ERP, CLM, IdP, CMDB, ticketing).
   For the first build, seed realistic fixtures shaped like those systems; real integrations come later
   behind the same tools. If the inputs are documents, ask how the fields get extracted and who checks
   them.
8. **Derived values.** Anything the copilot computes: costs and taxes, but also routing tables, risk
   tiers, due dates and expiry dates. Each needs a rule or formula and one worked example with real
   inputs. That example becomes the first unit test, so pin "today" in it rather than using the clock.
   In an existing repo, look for the test before you mark an example "test to add".
9. **Where people work, and the metric.** Which screen does the work happen in today (a document editor,
   a ledger, a request form, a ticket view, an editing timeline)? Do approvers live in Slack or Teams?
   Which metric (cycle time, send-back rate, first-pass approval rate) and today's baseline.

### Picking the first workflow

Score candidates quickly; pick the one that hits the most, and note the candidates and why one won (the
spec has a slot for it):

- Happens weekly or more, with a recognisable start and end
- Ends in an artifact someone approves or acts on
- Governed by written rules plus some unwritten ones
- Needs numbers that are tedious to compute by hand
- Touches two or more systems or teams (that is where time goes)
- Has a metric you can measure before and after
- A wrong answer is caught by a human gate before it does harm

Steer away from "answer any question about policy" and FAQ chatbots (that is search), from workflows
with no approver, and from anything where the agent would move money or change records without a human
click.

## Phase 2: Write the copilot spec

Write the spec twice, from the same answers: as markdown and as a page the developer keeps open.

1. **Markdown:** copy `assets/copilot-spec-template.md` to `docs/copilot/copilot-spec.md` in the user's
   repo, next to the other steps' files, and fill every section. The step skills read it there.
2. **HTML page:** write the same spec as JSON in the shape of `examples/contract-review-spec.json`, then
   run `node <this skill>/scripts/fill-spec.mjs <spec.json> docs/copilot/copilot-spec.html`. The script
   checks the spec (all seven layers, rule ids, gates, the route, no credential-shaped values) and writes
   `assets/copilot-spec.html` with the data in it: one self-contained page, offline, light and dark,
   phone width, printable, with the hard stop at the top and checklists whose ticks stay in the browser.
   Fix every error it prints. Without Node, copy `assets/copilot-spec.html` and replace the contents of
   its `<script type="application/json" id="data">` block with the JSON. Keep the JSON next to the page
   (`docs/copilot/copilot-spec.json`) so a revision is one edit and one run.

`examples/contract-review-spec.html` is Open Harvey's spec filled in; open it to see the result.

**From the context map.** If `docs/copilot/agent-context.json` or `.html` exists (step 2), fill the spec's
context and knowledge layer (section 4) and data and integrations layer (section 5) from it: the sources
the agent sees, the systems it reads and writes, the connection for each, whose identity it acts as, and
which writes wait for a person. Confirm it with the user rather than asking again, and note anything the
spec changes. Three things in the map are decisions the spec makes on purpose:
- **Each source's `phase`** ("v1" or "later") scopes v1: "later" rows go to "Not in v1".
- **The model provider row and the telemetry row** fill the spec's "Model provider" line in section 5:
  who must agree before real data goes to the model, and whether telemetry is off.
- **A record held in one browser** (the map flags it) is a v1 decision. A pilot with real approvers
  needs a shared server record (build step 8); a one-laptop demo can leave it for later, said so.

If the map doesn't exist, the spec covers those layers itself.

The spec follows the **functional agent stack** in `references/blueprint.md`: seven layers
(products and interfaces, domain capabilities, context and knowledge, data and integrations, agent
harness, models, and security and governance around all of them). Five are built once and carry over from
the starter; the two you swap per function, **domain capabilities** and **context and knowledge**, hold
most of the spec's real decisions. The stack is prescriptive: CopilotKit, AG-UI and CopilotKit
Intelligence, with each layer's piece named in `references/copilotkit-patterns.md` ("The stack, named")
and in the spec's stack table. The points people most often get wrong:

- **Put the copilot where the work happens.** A functional copilot lives inside the function's own
  workspace, not in a chat box beside it. Legal works in a document reader and editor (Open Harvey's
  contract viewer, review table and plan rail); a video copilot sits in the editing timeline; finance in
  the ledger or the request. Name that workspace in the spec (section 2) and design the cards, cites,
  edits and gates into it with the React v2 hooks; the chat (`CopilotChat`, `CopilotSidebar`) is a
  thread inside the workspace, used only where it fits.
- **Name the shape.** One request → approval chain, a review against a playbook, an exception queue, Q&A
  with a write at the end, or workspace assist. The shape picks the starter and decides how much of it carries over (the
  table is in `references/blueprint.md`, under Domain capabilities).
- **Logic lives in code, not in the prompt.** Calculations, rule checks, risk levels and approver routing
  are pure functions with unit tests. The model chooses *when* to call them and explains the result. It
  never does arithmetic in prose. This is what makes the copilot auditable.
- **Rules have ids, and the copilot cites them** ("Fits the Q1 plan (POL-HC-02)", "§8.2 deviates from
  PB-LIAB-01"). Approvers trust what they can check.
- **Plan before work, for reviews.** The agent proposes the checklist and a person approves it; each task
  is a tool call that refuses to run before that click (`useHumanInTheLoop` for the plan card,
  `useFrontendTool` for each task).
- **Reads are free, writes are gated.** Anything that submits, sends, pays, approves or changes a record
  goes through a human-in-the-loop step that shows exactly what will happen (`useHumanInTheLoop` in the
  browser; a server-side interrupt tool when no browser is open). That includes the write after the last
  approval, which gets its own gate. A `useHumanInTheLoop` card appears only during an agent run, so when
  the event before a gate is a click outside the chat (the last approval in an approvals panel), either
  have that click ask the copilot to continue (Open Harvey's `useAskCopilot`) or make the gate a plain
  button in the workspace that calls the same tested refusal function.
- **Render, don't narrate.** Every artifact the human must check or edit (cost breakdown, cited findings,
  redlines, the draft itself) is generative UI (`useComponent`), and the important one is editable, with
  the agent seeing the edit, re-checking, and never undoing it.
- **Separation of duties is a rule with an id**, enforced in a function and tested like the others,
  not a sentence in the governance section.
- **Record corrections from day one.** Send-backs with comments, edits to values the agent proposed,
  overrides. These are the raw material for CopilotKit Intelligence's Automatic Learning; see
  `references/learning-loop.md`.

**Get the yes.** Show the page, not only the markdown: tell the user the path and how to open it (`open
docs/copilot/copilot-spec.html` on macOS, `xdg-open` on Linux, or double-click it), or publish it if you
have the Artifact tool. Point them at the assumptions first and the "Before you say yes" checklist, then
stop and wait for an explicit yes. When they say yes, set `"status": "approved"` with `approvedBy` and
`approvedOn` in the JSON, change the markdown's Status line to match, and run the script again, so the
page shows who approved it. The yes covers the whole
spec, including the chat path (section 2) and the learning loop (section 9), so Phases 3 and 4 don't
reopen them. If they ask for changes, revise both files and show the page again. It takes two minutes to
read and saves an hour of rebuilding.

## Phase 3: Build from the starter

Only after the spec's yes. The workshop repo ships two CopilotKit starters that implement every layer:
shared state, human-in-the-loop cards, gates in code, replay-safe cards, a learning panel and a scripted
mock model. Paths below are in the workshop repo; its URL is in the workshop README, and if you don't
have it, ask the user rather than guess. If the user's repo already is the copilot, skip steps 1 to 3
and build only the spec's changes (see "When the repo already has the copilot" above). Pick the starter
whose shape matches the spec:

- **`starters/open-harvey/`** for *review against a playbook*: a plan the user approves, a long
  checklist the agent works live, cited findings in a review table, editable redlines, routed approvals,
  a playbook that learns. Contract review, vendor onboarding, security questionnaires, claims or
  compliance checks.
- **`starters/copilotkit-headcount/`** for *request → compute → rule check → approval chain*: one
  editable request with derived numbers. Headcount, discounts, purchase requests, access requests.

`references/starters.md` lists, per starter, what to keep and which files hold the domain content to
rewrite. Below, `<starter>` is the folder you picked.

1. **Get the starter** (`references/starters.md`, "Getting the starter"): copy it without
   `node_modules/`, `.next/`, `.impeccable/` or any `.env*.local`, then `npm install`. Into an existing
   app, follow "Into an existing app" there instead of creating a second app.
2. **Check the shape.** If the spec's shape matches the starter's, the starter is a template. If it
   doesn't (a queue of exceptions, Q&A with a write at the end, workspace assist), the starter is a
   parts bin: keep the
   wiring, the tool, card and gate patterns and the mock-model seam, and expect to replace the store and
   the panels. For a queue, the store holds a list of items, each with its own resolution draft, and each
   batch action has its own gate that lists every item it will touch.
3. **Replace the domain content**: the fixtures, rules, checks, plan, panels, learning classifier,
   instructions, chips and the mock's script. The per-starter file lists and the traps (the headcount
   starter's `sync-data` script, its Insights panel crashing on unknown ids) are in
   `references/starters.md`.
4. **Write the rules and calculations first, test first.** Put the user's worked examples into unit
   tests, then implement the pure functions until they pass. Run the tests before touching the UI.
5. **Build it into the workspace.** The function's main view (the document, the request, the queue, the
   timeline) is the screen. The copilot's findings, cites and proposed edits land in that view, the human
   edits there, and the chat thread sits inside it rather than on a separate page. In an existing app,
   mount the provider around the workspace people already use instead of adding a copilot page.
6. **Swap tools, components and approval gates** to match the spec. Keep the tool names close to the
   domain verbs ("runPlanTask", "checkBudget"); the model routes on names and descriptions. Put each
   refusal the spec lists (no task before the plan's approval, nothing sent without a reason) in the
   tool's code with a test. Handlers must read live state when they run (the starters read
   `appStore.getState()`), because a registration keeps its first handler until a dep changes; see
   `references/copilotkit-patterns.md`. Tools over seeded fixtures can run in the browser for v1;
   anything that needs secrets or must run with no browser open (real system calls, Slack or Teams)
   moves to backend tools (see "Slack or Teams" below). The write after the last approval is its own
   gated step, not a side effect of the final approve click.
7. **Separation of duties and identity.** Neither starter has sign-in: the user is a constant, and the
   approvals view lets the presenter act as every approver, for the demo. That is fine on stage and wrong
   in production. Write each separation-of-duties rule from the spec as a pure function with a test (the
   requester never approves; the preparer is not the approver). In production, bind every approval to
   the signed-in user's identity on the server, never to a name chosen in the browser. Until the build
   does that, list identity as not verified in the hand-back. In a one-presenter demo the "Acting as"
   switch makes one person every approver, so a decision-time check can't fire from the UI; a passing
   test is not protection in the demo, so say so.
8. **Move the store to the server before more than one person uses it.** Both starters keep state in the
   browser (`localStorage`) and let one person act as everyone. For real users: resolve the user on the
   server with `identifyUser(request)` on the runtime, keep the store on the server keyed by user and
   record (the matter or request), and enforce approvals and separation of duties there. A demo for one
   presenter can skip this; say so in the hand-back.
9. **Rewrite the agent instructions and suggestion chips** for the new workflow. Chips are sentences a
   user would type, never "use the X tool".
10. **Run it on a real model first, and keep the mock short.** With a key, build on the real model: it
    is the only proof that the model picks the right tools. Ask the user to put their key in
    `.env.local` (`cp .env.example .env.local`, then they fill it in). Two traps fail silently:
    - **The model's key decides mock or real.** Open Harvey's `chooseModel` (`src/lib/server-data.ts`)
      checks the key for the model's own provider (`OPENAI_API_KEY` for `openai/...`,
      `ANTHROPIC_API_KEY` for `anthropic/...`, `GOOGLE_API_KEY` for `google/...`) and runs the scripted
      mock without it; a production build also needs `ALLOW_REAL_MODEL=true`. Look for the "mock" label
      before trusting a run.
    - **The headcount starter still checks only `OPENAI_API_KEY`** (`copilotModel`) and has no
      production gate: another provider silently runs the mock, and a production build with a key runs
      the real model with no sign-in. Fix both before you build on it or deploy it.
    - **`maxSteps`.** Unless it is set, `BuiltInAgent` passes no stop condition (10 only when learned
      skills are loaded), and the run stops after one step: with a server tool, it ends at the tool result
      with no reply. Set `maxSteps` to the fewest the flow needs, 2 or more with server tools.

    Then cut the scripted mock (`src/lib/mock-model.ts` playing `src/lib/demo-script.ts`) down to a short
    happy path of the spec's demo script, for demos and tests: `demo-script.test.ts` plays it with no key
    and no network. Don't rewrite the starter's several-hundred-line script before the flow works. With no
    key at all, build on the mock and say plainly that the real-model loop is not verified.
11. **Verify:** typecheck, tests (including the mock demo script), build, then run it and walk the
    spec's demo script end to end on the real model. For evals beyond the demo script (cases scored on
    tool calls and the artifact), use `/secure-governance`'s eval recipe (`references/evals.md` in that
    skill).

Open Harvey's README has a "From demo to production" table (in the workshop repo): each shortcut the
starter takes, what production needs instead, and the CopilotKit piece for it. Use it to fill the
hand-back's "not verified yet" list.

`references/copilotkit-patterns.md` maps each layer to the CopilotKit and AG-UI APIs, with Open Harvey's
patterns file by file and the gotchas that fail silently. Check API names against the installed package
rather than memory; CopilotKit moves quickly.

### Slack or Teams

The spec already chose the path (section 2); build what it says. Know what it costs first: the
starters' tools, cards and gates all run in the browser (`useFrontendTool`, `useComponent`,
`useHumanInTheLoop`), and their agent has no backend tools of its own. A Slack or Teams message has no
browser behind it, so the same agent would arrive there with no tools and no gate. Details in
`references/channels-and-openbot.md`:

- **CopilotKit Channels SDK** reaches Slack and Teams with the same runtime and the same agent, once the
  tools and the approval gate run on the backend: the read and compute tools registered on the server
  (`defineTool` in the `BuiltInAgent`'s `tools`, calling the same pure functions); the draft stored on
  the server, keyed by request id; the gate rebuilt as a server interrupt tool or a Channels button
  handler; chat cards for what the web shows with `useComponent`; a long-running channel worker with a
  durable state store (managed Slack and Teams also need the runtime in Intelligence mode); and each
  approver's decision recorded as a new event on the request record, not as the requester's run
  resuming. Two things are **to verify**, so test them end to end before the spec promises them:
  whether an approval click resumes a paused `BuiltInAgent` run (the Channels docs validate that only
  for a DeepAgent approval), and how a card reaches an approver who didn't start the conversation (a
  choice is answerable by its initiator by default; DMs to approvers need a target you build).
- **OpenBot** is the self-hosted AI-coworker route: CopilotKit's open-source coworker template, with
  granted tools and skills, approval rules before writes and an audit trail, running on the team's own
  infrastructure. Its `ask` card goes to the requester whose message triggered the action, not to
  approvers, so it is not an approver-approval path today; business approvals stay in the system of
  record or a Channels flow. Its Slack and Teams path (through OpenTag) is in preview. The workshop's
  `starters/openbot-headcount/` is a tenant package to adapt.

## Phase 4: Plan the learning loop

The learning loop was agreed with the spec (section 9); don't reopen it. Make it concrete
(`references/learning-loop.md`): check that the build records the signals the spec names, with who,
before and after, comment and time; that the rewritten `learning.ts` turns the interview's send-backs
into the first proposed rule or skill; and that publishing it is a named person's click, after which new
work carries it. A signal the spec names that the build doesn't record is a defect: fix it if it is in
v1's scope, otherwise list it in the hand-back with the fix. If the spec uses CopilotKit Intelligence's
Automatic Learning, copy Open Harvey's
switch: off by default, on only with two settings in `.env.local` that the user sets, and failures shown,
not swallowed. Be exact about what it gives today: threads reach Automatic Learning, a first learning run
needs 15 eligible threads, and a person publishes every skill. Trajectories (`@copilotkit/learning`, the
decision events) are off on hosted Intelligence today, so wire them if the spec wants them, but don't
promise them in a demo.

## What to hand back

- `docs/copilot/copilot-spec.md` and `docs/copilot/copilot-spec.html` (with its JSON), filled and approved, with
  the assumptions listed; the page's build checklist is the developer's to tick
- The adapted app, with unit tests for every rule (separation of duties included), derived value and
  gate refusal passing
- A demo script: 3 to 7 sentences or clicks and what should happen after each, run on the real model,
  with its happy path playing against the mock in `demo-script.test.ts`
- The learning plan: signals recorded, first proposed rule or skill, who publishes it, and whether the
  Intelligence switch is wired (off by default)
- A short list of what is not verified yet: the real-model loop if it wasn't run, identity and
  separation of duties in production, the store still in the browser, the UI if it wasn't opened, real
  integrations, the post-approval write, and any Slack or Teams approval click
- Next steps in the suite: 4 `/deploy` for hosting, 5 `/secure-governance` for production mode and
  evals (and 2 `/agent-context` first, if it was skipped and the copilot reaches real systems or
  channels)
