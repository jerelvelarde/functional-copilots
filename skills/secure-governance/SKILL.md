---
name: secure-governance
description: Governance checklist for a CopilotKit or AG-UI copilot or agent before real people use it - the approvals on its writes, the identity it acts as, its audit trail and what it learns. Fills an HTML page with a prototype/production switch and a status per item. Prototype mode is the fastest safe path to production - useHumanInTheLoop gates, no open runtime endpoint, secrets out of the code, a scripted demo mode, a decision log, and Intelligence for threads, analytics and learning. Production adds SSO, roles and approval routing, audit and retention, personal data, prompt injection, tool allowlists, rate and spend limits, evals, incident response, and review and rollback of learned skills. Use it whenever someone asks if their copilot or agent is safe to pilot or ready for production, wants approvals or an audit trail for an agent, asks whose identity it acts as or who reviews what it learns, or has just finished /deploy. Not the built-in /security-review for general code, and not for apps with no agent.
---

# Secure governance

Step 5 of `/functional-copilot`, the root of the suite: 1 Research (`/user-map`) → 2 Context & access
(`/agent-context`) → 3 Spec & build → 4 Deploy (`/deploy`) → **5 Secure & govern
(`/secure-governance`)** → Learn, through CopilotKit Intelligence.

You read the developer's app, check it against a sixteen-item checklist for the mode they're in, and
fill a page they keep open while they close the gaps. Each item says what, why, how in CopilotKit or
AG-UI, and "done when". The page has a prototype/production switch, a status for every item, and an
honest table of what CopilotKit Intelligence covers today.

**Two modes.**
- **Prototype** (P1 to P6) is the fastest safe path to production, the minimum that keeps a pilot safe:
  approval gates on every write, no open endpoint, secrets out of the code, a scripted mode for demos,
  a decision log. It leans on CopilotKit Intelligence for threads, analytics and learning instead of
  building them.
- **Production** (P1 to P6, plus R1 to R10): identity and SSO, roles and approval routing, the audit
  trail and retention, data handling, prompt injection, tool allowlists, rate and spend limits, evals
  and red-team tests, incident response, and governance of what the copilot learns.

## The rules

- **Assess, don't fix, in this run.** Governance changes belong to the app's owner, and the page is the
  plan. Don't edit the app's code. After the hand-back, offer to fix the first gap; do it only on a yes.
- **Evidence or it isn't done.** Every "done" names the file, test or setting that shows it. Some things
  can't be seen in code, like a provider budget, a data agreement or a runbook kept elsewhere. Ask, or
  mark the item partial and say "can't be checked from the code". A generous status is worse than none:
  someone will ship on it.
- **A "done when" that needs the app running can't be met by reading code.** That covers the web
  inspector's tool list, a signed-out request, a real-model run and a resubmission test you didn't
  run. Mark the item partial and say what to run, unless the developer shows you the result.
- **Be honest about Intelligence.** Use the coverage table in `references/checklist.md`. Today:
  - Hosted Intelligence stores threads.
  - Product Analytics reports use, errors and tokens, not correctness.
  - Decision capture (Trajectories) sits behind the server flag `learning.trajectories`, which is off on
    the hosted project, so capture requests return `TRAJECTORIES_UNAVAILABLE`. Treat it as not live
    unless the developer shows you it working in their project.
  - Automatic Learning's first run needs 15 eligible threads in a learning space (the API calls it a
    learning container), and a person approves every proposed skill.
  - Intelligence does not do SSO for your app, roles, rate limits, evals or incident response. Never
    write that it does.
- **Secrets are the user's.** Never open `.env`, `.env.local` or any secrets file, even to check a key
  is set, and never print a key. When you search for key-shaped strings, list file names only (`grep -l`).
- **Prescribe the CopilotKit stack.** Every "how" and every `next` names the CopilotKit or AG-UI piece
  to use:
  - the React v2 hooks (`useAgentContext`, `useFrontendTool`, `useComponent`, `useHumanInTheLoop`,
    `useAgent`) and shared state;
  - AG-UI;
  - CopilotKit Runtime (`CopilotRuntime`, `createCopilotRuntimeHandler`, its hooks and server tools);
  - MCP servers, the Channels SDK and OpenBot;
  - Intelligence: threads, memory, analytics, learning spaces, published skills, and Trajectories
    through `@copilotkit/learning`;
  - the web inspector.

  Anything outside CopilotKit (an SSO provider, a gateway, a provider agreement) goes in the item's
  "Outside CopilotKit" footnote, never instead of the CopilotKit piece. The page shows the suite's
  canonical seven-layer table, word for word from `/functional-copilot`'s `references/blueprint.md`
  ("The canonical table"). Don't edit it here; it changes there first.
- **Don't invent APIs.** Every "how" in the checklist was checked against `@copilotkit/*` 1.84.1 and
  docs.copilotkit.ai on 2026-11-05. If the app needs something the checklist doesn't name, check the
  installed package (`node_modules/@copilotkit/*/dist/**/*.d.mts`) or the docs first, and say which.
- **Real products are for description only.** If you mention Premiere Pro, Kino.ai, Slack or Teams, do it
  in your own words. No logos, screenshots or copied UI text on the page.

## Step 1: Pick the mode (one round, with defaults)

Read what earlier steps left before you ask anything:
- `docs/copilot/copilot-spec.md` from `/functional-copilot` (its page is `docs/copilot/copilot-spec.html`):
  the function, workflow, approvers and writes;
- `docs/copilot/*.html` from `/user-map`, `/agent-context` and `/deploy`: the role, the systems and
  people, and where the app runs.

**The mode comes from whose data it is, not from what the request calls it.** The company's real
records mean production mode, even for a three-person pilot. That covers its contracts, its people
and their pay, its customers and its invoices. Prototype mode is only for fictional, sample or public
data. Look at the data before you read the request's words:
- what the app loads (`src/data`, fixtures, the database it connects to);
- what the spec and the context map say goes in;
- what the request mentions.

When a "pilot" will see real records, use production mode, and say why in the first line of the
summary.

Then ask once, offering a default for each so "yes, yes" is a full answer:
1. **What data.** Whose records will it see: fictional, the company's own, or personal or regulated
   data? This decides the mode. Default: what the app and the spec show. If those don't say and the
   workflow is a real business process, assume real data and production mode.
2. **Who uses it.** Named pilot users, or everyone in the function?
3. **Where it runs.** A laptop, an internal host, or the public internet?

If nobody can answer (a non-interactive run), use the defaults and say so in the page's summary.

## Step 2: Inventory the app

`references/assessing.md` has, item by item, where to look and the searches to run. Collect:
- the runtime route and its hooks;
- the agent's configuration (`BuiltInAgent` options, or the AG-UI agent it connects to);
- every tool, marked read or write: frontend tools, `useHumanInTheLoop` gates, server tools, MCP;
- where the user's identity comes from;
- where decisions are stored, and for how long;
- how keys reach the server;
- any learning or publish flow;
- the tests.

Read files; don't run the app unless the developer asks. A minute in the code beats an hour of guessing.

## Step 3: Assess each item for the mode

Read `references/checklist.md`. In prototype mode assess P1 to P6. In production mode assess all
sixteen. For each item, give:

| Field | What to write |
| --- | --- |
| `status` | `done`: every "done when" is met, with evidence. `partial`: some are met, or they hold only in a narrower setting (safe on localhost only). `gap`: none are met. `na`: it doesn't apply, and `here` says why (no learning loop, so R10 is `na`). |
| `here` | Two to four plain sentences about this app: what exists, what's missing. Name files and functions. |
| `evidence` | Paths, written as `file` or `file (symbol)`. Required for `done`. |
| `next` | One concrete next step, for anything not `done`. |

Calibrate against `examples/open-harvey.json`: a real assessment of the workshop's contract-review
starter, with the statuses argued from its code. Open Harvey is a demo, so its production column is
mostly partial and gap. That is the honest answer, not a failure of the skill.

## Step 4: Fill the page

Write the data to a JSON file outside the repo (a temp or scratch folder), in this shape:

```json
{
  "app": "Open Harvey", "function": "Legal",
  "workflow": "Vendor contract review against Northstar's playbook",
  "date": "2026-11-05", "mode": "prototype",
  "headline": { "prototype": "One short sentence for the top.", "production": "One short sentence." },
  "summary": { "prototype": "Two or three sentences.", "production": "Two or three sentences." },
  "next": { "prototype": ["Top three steps, item id in brackets (P2)"], "production": ["..."] },
  "intelligence": { "threads": "...", "analytics": "...", "trajectories": "...", "learning": "...",
                    "skills": "...", "audit": "...", "yours": "..." },
  "items": { "P1": { "status": "done", "here": "...", "evidence": ["src/..."], "next": "..." } },
  "unverified": ["What you could not check, in plain words"],
  "disclaimer": "Optional: the app's own disclaimer, word for word"
}
```

If the app names a real product or is inspired by one (Open Harvey is), copy its disclaimer into
`disclaimer` word for word. The footer always adds the suite's own line: "Open-source example built
with CopilotKit. Products named here are described for illustration; not affiliated with or endorsed by
them."

The top of the page is meant to be screenshotted, so keep it calm. It shows the mode, the `headline`
(one plain sentence of about fifteen words: the verdict, then the one thing to do next) and the items
still open, which the page lists itself. Everything else sits below it.

`intelligence` is optional: one line per row on where this app stands, e.g. "wired, off by default".
Fill `summary` and `next` for both modes if you assessed both; the switch shows whichever is chosen.

Then run the filler, which checks ids and statuses, refuses a `done` without evidence, and writes the
page:

```bash
python3 <this skill>/scripts/fill.py /tmp/secure-governance.json docs/copilot/secure-governance.html
```

With no Python, copy `assets/secure-governance.html` and replace the contents of its
`<script type="application/json" id="data">` block by hand. Escape every less-than sign in the JSON as
the JSON escape for it: a backslash, then `u003c`. Not `&lt;`: a script block isn't HTML-decoded, so
the page would show `&lt;` as it stands.

The page is one self-contained file: inline CSS and JS, no network calls, black and white like Open
Harvey (status shown by fill, outline and weight), light and dark, phone width, and it prints cleanly.
Checkboxes are the developer's own ticks against "done when", saved in localStorage when the browser
allows it.

## Step 5: Publish it or write it

- **With the Artifact tool:** publish the filled file as it is (it's already self-contained) and give
  the link. Still write `docs/copilot/secure-governance.html` so it lives with the code.
- **Without it:** write `docs/copilot/secure-governance.html` in the developer's repo and tell them
  how to open it: `open docs/copilot/secure-governance.html` on macOS, `xdg-open` on Linux, or drag
  the file into a browser. `#production` or `#prototype` at the end of the URL picks the mode.

## Step 6: Hand back in chat

Keep it short. The page carries the detail.
1. The mode, and why: whose data it is. Then the counts (for example "production: 1 done, 11 partial,
   4 gaps").
2. The three next steps from the page, each with its item id.
3. **Who decides identity.** This is the last step of the suite, so nothing after it will settle
   identity. Name the person who decides two things: the identity provider, and that every write runs
   as the signed-in person, never a shared account.
   - That person is the workflow's business owner, with IT or security. Use the name from the spec if
     it has one, otherwise the role.
   - Put the same name in R1's `next`.
   - Until they decide, R1 stays a gap.
4. Two lines on Intelligence: what it covers for this app today, and what is still theirs.
5. What you couldn't verify.
6. One offer: fix the first gap now, on their yes.

## Files

| File | What it is |
| --- | --- |
| `references/checklist.md` | The sixteen items in full (what, why, how, docs, done when) and the Intelligence coverage table. The same text is the template's `catalog` block |
| `references/assessing.md` | Item by item: where to look in an app, the searches to run, and the traps |
| `references/evals.md` | The eval recipe for R8: demo-script cases on the real model, scored on tool calls and the artifact |
| `assets/secure-governance.html` | The page template. Opened as is, it shows the whole checklist as "not assessed" |
| `scripts/fill.py` | Fills the template from a data JSON and validates it (Python standard library only) |
| `examples/open-harvey.json` | The data for Open Harvey, the calibration example |
| `examples/open-harvey-prototype.html`, `examples/open-harvey-production.html` | The filled page for Open Harvey, opening in each mode |

If you change an item, change it in both `references/checklist.md` and the template's `catalog` block,
then refill the examples.
