---
name: user-map
description: Maps the people and the workspace before anyone builds a functional copilot. Covers the role, the software they work in and its UI pattern (timeline editor, document review with tracked changes, ledger grid, ticket queue with a detail pane), their jobs to be done, their key flows with handoffs and approvals, and exactly where the copilot lives in that workspace, mapped to CopilotKit (useAgentContext, useFrontendTool, useComponent, useHumanInTheLoop, shared state). Researches the web when it can, cites sources, marks the rest Assumed, and writes a self-contained HTML user map plus a markdown brief for /functional-copilot. Use it whenever someone is about to build a copilot, assistant or agent for a role or department (editors, lawyers, accountants, support agents, IT, ops), asks who the users are, what they do all day or where the AI should sit in the UI, or wants user research, personas or jobs to be done for an AI feature, even if they never say "user map". Not for building the copilot itself.
---

# User map

`/functional-copilot` › **1 Research · `/user-map`**. `/functional-copilot` is the root of the suite,
and this skill is its research step. The path ahead:

2. context and access, in `/agent-context`;
3. spec and build, in `/functional-copilot`;
4. `/deploy`;
5. `/secure-governance`.

Then learning runs through CopilotKit Intelligence. The page's header shows the same breadcrumb.

A functional copilot has to live inside the app space where that function's work happens. Lawyers work
in documents, so a legal copilot needs a document viewer and a redline editor. Editors work on a timeline,
so an editing copilot lives in the editing workspace. A chat box beside the app, which can't see what the
user has open, isn't a functional copilot. This skill does the study a developer should do before they
build one. It looks at who does the work, which software they do it in, how that software is laid out,
what they're trying to get done, and how the work flows. It ends by saying where the copilot sits in that
workspace and which CopilotKit piece builds each part of it.

The developer names a role or department and the software it works in. You give back a **user map**. It
flows role → software → UI pattern → jobs to be done → flows → copilot placement, and it ends with a build
checklist and a plan to check the map with real users.

## What you produce

All three files go in the developer's repo, under `docs/copilot/`:

| File | What it is |
| --- | --- |
| `user-map.json` | The map as data. It's the source of truth: edit it and rebuild. |
| `user-map.html` | The page the developer keeps open while they build. It's one self-contained file that works offline, in light and dark, at phone width, and printed. Its checklist ticks are saved in the browser. |
| `user-map.md` | A short brief laid out like `/functional-copilot`'s three interview rounds, so its Phase 1 can start from it. |

The build script writes the HTML and the markdown from the JSON, so the two always agree.

## Rules that hold throughout

- **Every claim carries its evidence.** Each item in the map is `sourced` (it cites a numbered source
  that you actually read), `assumed` (your best judgement, not yet checked), or `confirmed` (a real user
  or the developer said so, with `by`). If you can't point to a source, it's `assumed`. Times,
  percentages and pain points are usually assumed: say so rather than dress them up. A map that is
  honestly two-thirds Assumed is useful. A confident map that's wrong is worse than none.
- **Describe real products in your own words.** You can name Premiere Pro, Word, NetSuite, Zendesk,
  Kino.ai, Slack or Teams to describe them. Don't add logos or screenshots, don't trace their UI, and
  don't copy their interface text or marketing copy. Give regions their generic names (timeline, media
  bins, detail pane); you can add the product's own name for a panel as a description. The wireframe is
  a schematic of the pattern, never a picture of the product.
- **Name the CopilotKit pieces, prescriptively.** The copilot is built on CopilotKit:
  - **In the app:** the React v2 hooks: `useAgentContext`, `useFrontendTool`, `useComponent`,
    `useHumanInTheLoop`, and `useAgent` for shared state.
  - **Between the app and the agent:** AG-UI, with `BuiltInAgent` or any AG-UI agent (LangGraph,
    Mastra, Google ADK, Pydantic AI and others) behind the CopilotKit Runtime.
  - **Threads, memory and learning:** CopilotKit Intelligence.
  - **While building:** the CopilotKit web inspector.

  Every placement row and every checklist "how" names the CopilotKit piece to use. Mention generic
  alternatives in a footnote at most. The names and their checked docs links are in
  `references/placement.md`, "The functional agent stack". Don't draw a stack of layers of your own:
  `/functional-copilot` owns the seven-layer table, and the other skills paste it word for word.
- **Never invent a CopilotKit API.** The placement rows use the pieces in `references/placement.md`.
  Those were checked against the installed 1.84.1 packages and docs.copilotkit.ai. If you need anything
  beyond them, check it in `node_modules/@copilotkit/*/dist/**/*.d.mts` or on docs.copilotkit.ai first.
  If you can't check it, write it as a question rather than as a fact.
- **Placement is a proposal until users confirm it.** Mark it `assumed` unless the copilot already
  exists, as it does for Open Harvey in the legal example.
- **Secrets are the user's.** This skill needs no keys. Never read, print or ask for one.
- **Stay in your lane.** Don't write a spec, scaffold an app or write code: that's
  `/functional-copilot`. Write only the three files under `docs/copilot/`.

## What to read when

| Step | Read |
| --- | --- |
| 1 Intake | Nothing yet. Skim the developer's repo if there is one. |
| 2 Research | `references/research.md` |
| 3 Map | `references/ui-patterns.md` (find the pattern), `references/placement.md` (the seven placement rows) |
| 4 Checklist | `references/placement.md`, "Checked links and files" |
| 5 Build | `references/map-schema.md`; for calibration, the closer of `examples/legal-contract-review.json` and `examples/video-editor.json` |

## Step 1: Intake (one short round, or none)

If the developer already named the role and the software, don't ask anything. Write down your
assumptions for the rest and go. Otherwise, ask one round, with a default for each question so that
"yes, yes, X" is a full answer:

1. **Role and team.** Who does the work? For example, "the video editors on our post team" or "AP
   clerks in finance ops". If they name a department, ask which role in it. The default is the
   department's most common hands-on role.
2. **The software.** What do they spend the day in? The default is the most common tool for that role,
   which you'll confirm in research.
3. **Where the copilot will be built.** There are four routes:
   - **(a)** The developer's own web app, which follows the same pattern. This is the default, and it's
     where CopilotKit's React hooks run.
   - **(b)** Their own web app, embedded in the vendor's tool as an app panel. Many ticketing, CRM and
     ERP tools host an iframe app in a side panel. For a role that lives in a vendor tool all day, this
     is often the right answer.
   - **(c)** A native plugin panel inside the software (an add-in, extension or UXP panel).
   - **(d)** A chat surface, when the role lives in Slack or Teams (an IT agent working requests in a
     channel, say). The copilot answers in the conversation through the Channels SDK, so its placement
     rows change: it reads messages, its tools run on the server, it posts cards, and its human gate is
     a button with `answerableBy`. The rows are in `references/placement.md`, "Route (d)".

   Routes (b) and (c) change what the copilot can read and do. Whether CopilotKit runs in that host is
   unverified until a spike proves it, so mark it `assumed` and make the spike the first checklist
   item. Set `meta.route` to `own-app`, `embedded`, `plugin` or `chat`, and describe the route in
   `meta.building`.
4. **Optional:** a workflow they already have in mind, and whether they can reach two or three real users.

If they have a repo, look at it. Its components and routes are the real workspace, so name its regions
after what's actually on screen. When the repo *is* the role's workspace, it outranks the vendor's docs.

### When the copilot already exists in the repo

Sometimes the developer's app already has the copilot in it, as a copy of Open Harvey does. Then this map
checks the copilot against the role instead of proposing one. Set `meta.exists` to `true`; the page then
calls step 07 a verify checklist. The rest follows:

- **`meta.app`** is the software the role works in *today*. If they already work in this app, that's the
  app. The tools from before it (Word, email, a spreadsheet) go under `around`, marked `assumed` unless a
  file says so.
- **`"new": true`** marks a panel the role's workspace didn't have before the copilot. Measure it against
  `meta.app`. If `meta.app` is the app that already has the copilot, nothing is new.
- **Placement** is `sourced` from the repo's files, because it exists. Whether people actually use it,
  how long things take, and how often are still `assumed`.
- **Flows from before the app** use `place` for the old tool (email, Word) and stay `assumed` unless
  something records them.
- **The checklist** becomes a list of checks. Each "done when" is something to confirm in the running
  app. Add an item for every gap you find between the role and what the app does, because that's what
  `/agent-context` and `/functional-copilot` pick up next.
- **Checklist files** use the repo's own paths when it has the file (`src/copilot/useAppContext.ts`), and
  the workshop starter's paths otherwise.

## Step 2: Research

Follow `references/research.md`. In short:

- **With web search:** look up how the software is laid out (its vendor's help or learning pages), what
  the role does and is measured on (practitioner guides, job descriptions, professional bodies), and how
  the work flows and where it waits (workflow guides, the review and approval tools around it). Open
  every page you cite; a search snippet isn't a source. Three to eight sources is typical. Spend about
  fifteen minutes, not an hour.
- **Without web search:** use what you know, plus the developer's repo and docs. Set `meta.research` to
  `"no-web"`. Everything that doesn't come from a file you read is `assumed`. Tell the developer this up
  front.

## Step 3: Map the four things

1. **The software and its UI pattern.** Find the closest pattern in `references/ui-patterns.md`, then
   adapt its regions to this software and this role. Name the *object of work* (the sequence, the
   contract, the invoice, the ticket), what the user *selects*, and what is *open at once*. Lay the
   regions out as a rough schematic grid (`layout.areas`). If the copilot needs a panel the software
   doesn't have, add it as a region with `"new": true`. Regions describe the workspace the role uses
   today, sourced from the vendor's docs. If the developer's app will recreate it, say so in
   `pattern.summary`; don't mark the vendor's regions `assumed` just because the new app isn't built.
2. **Jobs to be done.** Write four to seven jobs as *When …, I want to …, so I can …*, in the user's
   words. `want` and `so` each start with a verb, because the page adds "I want to" and "so I can";
   for example `want`: "find every take where she mentions the launch". Mark exactly one
   `first`: the job the copilot should take on first. A good first job is frequent, bounded, rule-heavy,
   and ends in an artifact someone approves or acts on. It also has a before-and-after you can measure,
   and it fails safe because a person checks the result. (These are `/functional-copilot`'s criteria, so
   the two skills agree.) Then name the first job's **shape** in `meta.shape`, using `/functional-copilot`'s
   five names:
   - **one request → approval chain**;
   - **review against a playbook**;
   - **exception queue**;
   - **Q&A with a write at the end**;
   - **workspace assist**: the copilot works inside an expert or creative tool on what is open, and each
     change is a proposal the person accepts, like a video editor's selects or rough cut.

   The shape is what the work is. The route (question 3) is where the copilot runs. They're
   independent: a workspace assist usually runs in the app or a plugin panel, and a chat-route copilot
   is usually an approval chain or Q&A with a write.
3. **Key flows.** Map one or two flows, and the first must serve the first job. Each step says who does
   it, where (a region, or a `place` outside the workspace such as email), what happens, and roughly how
   long it takes. Give each step a `kind`: `work`, `handoff` (the work changes hands), `approval` (a
   person decides, including a send-back) or `wait` (nothing moves). End each flow with `timeGoes`, one
   honest line on where the time actually goes. The copilot belongs where that time goes.

   End the first flow at **the write after the last approval**, and record it in the flow's `write`:
   - `what` changes: a package sent to the vendor, a posted journal, provisioned access, an HRIS record;
   - in which `system`;
   - `who` or what makes the change, on whose click.

   `/functional-copilot` treats this as a core question, because it decides what the copilot's final
   gate writes to. If no source shows it, mark it `assumed` and make it the first question in
   `validate.ask`.
4. **Where the copilot lives.** Fill the seven rows in `references/placement.md`. Each row names
   concrete things for this workspace, and the template shows the CopilotKit piece for each row:
   - where it lives;
   - what it reads (`useAgentContext`);
   - what it can do (`useFrontendTool`);
   - what it renders (`useComponent`);
   - what waits for a person (`useHumanInTheLoop`);
   - what both of them edit (shared state);
   - what it learns from (CopilotKit Intelligence).

   Add a `notThis` line that describes the chat-box-beside-it version of this copilot, so the difference
   is concrete.

## Step 4: The build checklist

Write six to nine items. Each one turns a placement row into something to build. Each item has four
parts:

- **what:** an imperative, such as "Put the sequence, the playhead and the selection in context";
- **why:** the reason, in this role's terms;
- **how:** the CopilotKit or AG-UI piece and how it's used here;
- **done when:** something the developer can test by hand.

Give each item its `piece`, a `docs` link from the checked list, and the file in a starter that shows
the pattern. Open Harvey's files (`starters/open-harvey/`) are the pattern reference for every shape:
context, task tools, cards, gates, hearing a human edit, learning. For a request that goes through an
approval chain, `starters/copilotkit-headcount/src/copilot/useSubmitForApproval.tsx` is the closer gate.
Add one item for the web inspector, which saves the most time while wiring. The template saves each tick
in the browser.

## Step 5: Write the JSON and build the page

1. Write `docs/copilot/user-map.json` using the fields in `references/map-schema.md`. Use an example for
   structure and tone, picked by evidence posture rather than by domain:
   - `examples/legal-contract-review.json` when the copilot already exists (mostly sourced);
   - `examples/video-editor.json` when the placement is a proposal (mostly assumed).

   Most maps land somewhere between the two.
2. Build it from the developer's repo root, pointing at this skill's folder:

   ```bash
   node <path-to-this-skill>/scripts/build-map.mjs docs/copilot/user-map.json
   ```

   The script checks the map, then writes `user-map.html` and `user-map.md` next to the JSON. The top
   of the page is often screenshotted for slides, so keep it calm:
   - `meta.headline`: five to nine words;
   - `meta.path.role`, `.software` and `.copilot`: one short line each, for the three cards (role →
     software → copilot placement).

   Everything else sits below the fold. Fix every
   error. Read the warnings, which are usually real: a flow with no approval, or region ids that don't
   match. It needs only Node, with no install.
3. **If Node isn't available,** copy `assets/user-map.html` to `docs/copilot/user-map.html`. Replace the
   JSON inside `<script type="application/json" id="user-map-data">`, replacing every `<` in the data
   with the six characters `\u003c` (a JSON escape; `&lt;` would stay literal inside a script tag). Then write `user-map.md` by hand, following the example `.md`.
4. **Showing it.** If you have the Artifact tool, you may publish `user-map.html`, which is already one
   self-contained page. Keep the three files in the repo either way, because `/functional-copilot`
   reads the `.md`. If you don't have the Artifact tool, tell the developer how to open the page:
   `open docs/copilot/user-map.html` on macOS, `xdg-open` on Linux, or double-click the file.

## Step 6: Hand it back

Reply in a few short lines:

- the one-sentence placement (`meta.oneLine`);
- the first job;
- how many items are sourced, assumed and confirmed;
- the three file paths.

Then always finish with the check:

> **Before you build, check this map with two or three real users.** Walk [the people in
> `validate.who`] through it. Ask [the top three questions from `validate.ask`]. When someone confirms an
> item, set its `ev` to `"confirmed"` with `by` in `user-map.json` and rebuild. When the map is right,
> run `/agent-context` for step 2, context and access, then `/functional-copilot` for step 3, spec and
> build. Both start from `docs/copilot/user-map.md`.

The `validate.ask` questions should settle the Assumed items that matter most. Those are the placement,
the first job, and the times in the first flow. Don't ask about details nobody will build on.
