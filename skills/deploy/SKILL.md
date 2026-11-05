---
name: deploy
description: Takes a CopilotKit and AG-UI copilot from a laptop to a running deployment and writes a filled HTML deploy checklist for that app. Covers where the runtime runs (long-lived Node or serverless, SSE streaming, Channels workers), the host (Vercel, Railway, Render or Docker), exact environment variables and secrets per environment, a scripted mock mode, sign-in in front of the agent endpoint, rate limits, spend caps, allowed origins, health checks, logs, staging, rollbacks and a post-deploy smoke test. Use it whenever someone wants to deploy, host, ship, put online, share a public demo of, or take to production an app built with CopilotKit, AG-UI or CopilotRuntime (Open Harvey or another functional copilot starter), or asks what env vars, auth or limits it needs before going live, even if they never say "deploy". Step 4, Deploy, of /functional-copilot. It prepares and asks; it never deploys, creates host accounts or sets production secrets by itself.
---

# Deploy

A copilot that only runs on a laptop isn't a copilot yet. This skill takes a CopilotKit and AG-UI app
(the app, the CopilotKit runtime that streams AG-UI events, and the agent behind it) to a running
deployment, and leaves the developer with one page to keep open while they ship: a filled deploy
checklist for *their* app, with a status for every item, the exact variable names and the commands.

**Where it sits.** Step 4, Deploy, of `/functional-copilot`, the root of the suite: 1 Research
(`/user-map`) · 2 Context & access (`/agent-context`) · 3 Spec & build (`/functional-copilot`) ·
**4 Deploy (`/deploy`)** · 5 Secure & govern (`/secure-governance`), then Learn, through CopilotKit
Intelligence. `/deploy` gets the copilot running safely; `/secure-governance` decides what it may do in
production (roles, audit, data). Read what the earlier steps left in `docs/copilot/` instead of asking
again: `copilot-spec.md` (and its page `copilot-spec.html`), `user-map.html`, and above all
`agent-context.html`, whose server-side rows (server tools, MCP servers, Slack or Teams, OpenBot,
Intelligence) each become an item here.

## The stack, by name

The suite prescribes one stack; every checklist item's how leads with the piece to use, and generic
options go in the item's footnote at most. The canonical table, pasted word for word from
`/functional-copilot` (`references/blueprint.md`, "The canonical table"; change it there first):

| # | Layer | What it holds | CopilotKit piece | Per function |
| --- | --- | --- | --- | --- |
| 1 | Products and interfaces | Where people meet the agent: the function's own workspace, the cards and gates in it, and Slack or Teams for people who decide there | React v2 hooks in the workspace: `useComponent`, `useHumanInTheLoop`, `useAgent`; `CopilotChat` or `CopilotSidebar` only where it fits; `@copilotkit/a2ui-renderer`, `@copilotkit/mcp-apps-renderer`; the Channels SDK (`@copilotkit/channels-*`) | Built once |
| 2 | Domain capabilities | The jobs of one function (review, draft, check, compute, route) as tools over tested code | `useFrontendTool` in the browser; `defineTool` in the CopilotKit Runtime on the server | Swapped |
| 3 | Context and knowledge | Policies, playbooks, history, live context, and the rules it learns | `useAgentContext`; CopilotKit Intelligence: threads, memory, Automatic Learning (learning spaces, skills a person publishes, `learnedSkills`) | Swapped |
| 4 | Data and integrations | Systems of record, through APIs and MCP servers | `BuiltInAgent`'s `mcpServers`; server-side tools in the runtime; fixtures behind frontend tools for v1 | Built once |
| 5 | Agent harness | The loop that plans, calls tools and pauses for approval, over AG-UI | CopilotKit Runtime (`CopilotRuntime`, `createCopilotRuntimeHandler`) with `BuiltInAgent`; LangGraph, Mastra, Google ADK or Pydantic AI agents through their AG-UI integrations | Built once |
| 6 | Models | Any model you choose; the key stays on the server | `BuiltInAgent`'s `model` (a provider/model id) and `maxSteps`; a scripted `LanguageModelV3` mock for demos and tests | Built once |
| 7 | Security and governance, around every layer | Who may do what, what is recorded, what can never happen | Gates in tool code with tests; `identifyUser` on the runtime; Intelligence analytics and the decision log; OpenBot for a governed coworker | Built once |

Developer tool for every layer: the CopilotKit web inspector (`@copilotkit/web-inspector`, the
provider's `enableInspector`). Trajectories (`@copilotkit/learning`) are off on hosted Intelligence today.

The deploy pieces on top of it (checked against 1.84.1): `hooks.onRequest` and `hooks.onBeforeHandler`
on the handler to refuse and rate-limit, `CopilotKitProvider`'s `headers` for the token, `cors`,
`threads.access`, `maxSteps`, `GET {basePath}/info` for health, `HttpAgent` from `@ag-ui/client` for a
remote agent, and the web inspector (`@copilotkit/web-inspector`, always off in production).

## Three rules that don't bend

1. **You prepare; the developer ships.** Don't run anything that deploys, creates or links a host
   account or project, sets a variable on a host, adds a domain or pushes to a remote until the
   developer says yes to that command. Some commands do more than their name says: `railway up` signs
   you in, or creates an account, when you aren't signed in, and a first `vercel` run links a project.
   A yes covers the command it was given for, not the next one. Where nobody can answer, stop at the
   checklist.
2. **Secrets are the developer's.** Name variables; never read, print or ask for a value. Don't open
   `.env`, `.env.local` or any secrets file, and don't run commands that print values
   (`railway variable list --kv`, `vercel env pull`, `printenv`). Learn which variables the app needs
   from its code (`process.env.X`) and `.env.example`. The developer pastes values into the host.
3. **Nothing is done without evidence.** An item is *done* only when you can point at a file and line,
   a test, or a command's output from this run. Otherwise it's *todo*, *ask* or *blocked*. A checklist
   that says done on a guess is worse than none, because the developer will trust it.

## What to read when

| Step | Read |
| --- | --- |
| 1 Read the app | `references/runtime-and-hosts.md`, "Find the runtime" |
| 3 Decide | `references/runtime-and-hosts.md` (process shape, hosts) |
| 4 Fill the checklist | `references/secrets-and-env.md`, `references/auth-and-protection.md`, `references/operations-and-smoke.md`, and `references/checklist-format.md` for the standard items and the data format |
| 6 Write the page | `assets/deploy.html` (template); calibrate on one example, `examples/open-harvey-deploy.html` (public demo, mock) or `examples/headcount-okta-render-deploy.html` (internal, Okta, real model). The examples are 70–100 KB: `fill.mjs --extract` one and read its headline, decisions, blockers, item ids and statuses and two or three full items, not all of it |

## Step 1: Read the app (no questions yet)

Find each of these and note the file and line; it becomes evidence:

- **Scripts.** `build` and `start`, and what `start` binds to. `127.0.0.1` is local only; a host needs
  `0.0.0.0` and the port it gives in `$PORT`.
- **The runtime endpoint.** Which handler (`createCopilotRuntimeHandler`, `createCopilotExpressHandler`,
  `createCopilotHonoHandler`, `createCopilotNodeListener`, or the v1
  `copilotRuntimeNextJSAppRouterEndpoint`), its path, and whether `hooks`, `cors` and `identifyUser`
  are set.
- **The agent.** A `BuiltInAgent` in the same process (which model, which key it reads), or a remote
  agent over AG-UI (an agent URL, LangGraph, a Python service): a second service to deploy and protect.
- **State.** The runner: in-memory (the default), SQLite, or Intelligence mode (`intelligence:` on the
  runtime). Where the app keeps its own data: the browser, a database, a file.
- **Mock mode.** A scripted model and the switch that picks it, and whether production refuses the
  real model without an explicit flag.
- **Server-side connections.** `defineTool` tools, `mcpServers` or `mcpClients` on `BuiltInAgent`,
  `@copilotkit/channels*` imports, an OpenBot package. If `docs/copilot/agent-context.html` exists,
  list its rows on rings 3 to 7 with `node <skill>/scripts/fill.mjs --context docs/copilot/agent-context.html`:
  each carries `runsOn` (where it runs), `secretEnv` (its env var names) and `phase` (`v1` or
  `later`), ready to copy.
- **Who shares what.** Whether state lives in the browser (localStorage) and whether one person can act
  as every approver ("Acting as"). Both starters do: fine for a demo, a blocker for a shared deployment.
- **Variables.** Every `process.env.X` (and `env.X` passed through helpers) in server code, and
  `.env.example`. Names only.
- **Whose data it serves.** Seeded demo fixtures, or the company's own records (contracts, people, pay,
  prices)? Check what the page sends to the browser: Open Harvey's `page.tsx` hands every contract to
  every visitor, so a public URL leaks the data even on the mock. And what each run sends to the model
  provider (`useAgentContext`, messages, tool results).
- **What exists.** Dockerfile, ignore files (`.dockerignore`, `.railwayignore`, `.vercelignore`), host
  config (`vercel.json`, `render.yaml`, `.railway/`), CI, a health route, sign-in (middleware, an auth
  library, a proxy), rate limiting, `engines.node`, tests.
- **Skills inside the app.** Skills symlinked into the app's own `.claude/skills/` break `next build`
  with Tailwind v4 and Turbopack (Tailwind follows the links out of the project), and a host building
  from git gets dangling links. Copy skills into a Next.js app instead of symlinking, or add
  `@source not "../../.claude";` to the CSS entry (the path is relative to `src/app/globals.css`); either
  way keep `.claude` out of the upload.

```bash
grep -rnE "createCopilot|copilotRuntime|new CopilotRuntime|BuiltInAgent|HttpAgent|identifyUser|hooks:|cors:" --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next .
grep -rhoE "env\.[A-Z][A-Z0-9_]+" --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next . | sort -u
```

Run the typecheck and tests if the repo has them; their output is evidence. If a dev server is already
running, `curl -s localhost:<port>/<basePath>/info` shows the runtime version, its agents and its mode
(`sse` or Intelligence).

### When the request is wider than the approved spec

Compare what's being asked (who will use it, on whose data, with which model) with the approved spec's v1
(`docs/copilot/copilot-spec.md`, its out-of-scope list and data decisions). A spec's data decisions win
over this skill's defaults: if it keeps Intelligence off, or the real model off until Legal or HR agree,
so does the deploy. When the request needs what the spec left out (a pilot with real approvers when the
spec ruled out sign-in and a server store), don't paper over it: mark the standard `spec-scope` item
*blocked* and put it first in the blockers, name each missing piece, and send it back to
`/functional-copilot` for a spec change and a build. Offer the narrower deploy the spec supports (a
rehearsal, a drafting pilot) as the alternative. `/deploy` assesses and prepares; it doesn't build v2.

## Step 2: Ask once

One round, each question with a default, so the developer can answer "yes, yes, Railway". Skip what
the repo or an earlier skill already answered.

1. **Who will reach it, and whose data does it serve?** A public demo anyone can open, a team behind
   sign-in, or customers; seeded fixtures or the company's own records. *Default: a public demo on the
   scripted mock, only when every record is seeded and fictional. The company's own data means sign-in
   on every environment, staging included, even on the mock.*
2. **Real model or scripted?** The mock plays only the demo script: right for a public demo, a
   rehearsal or a smoke test, wrong for a pilot on real work, which needs the real model, sign-in, and
   the data owner's yes to send that data to the provider. *Default: scripted on anything public; the
   real model only behind sign-in, after that yes.*
3. **Host?** *Default: what the repo already uses. Otherwise a long-lived Node host (Railway or Render),
   Docker on the container platform the company already runs, or Vercel for a Next.js app with no
   Channels worker whose runs fit the function time limit.*
4. **Sign-in.** Which identity provider (Okta, Entra ID, Google), and is there an auth library or proxy
   already? *Default: the company's SSO through the app's sign-in, checked again in `hooks.onRequest`.*
5. **Intelligence and Channels in this environment?** *Default: off on a public demo.*
6. **Environments.** *Default: staging and production, each with its own keys.*
7. **Spend caps.** The monthly limit for the model provider and the host. Record the number they give;
   never invent one.

Unanswered questions take the default and are marked *Assumed* in the checklist's decisions.

## Step 3: Decide the shape

Six decisions head the checklist's detail, one line each (detail in `references/runtime-and-hosts.md`):

- **Process.** The CopilotKit Runtime as one long-lived Node process when there's a Channels worker,
  Intelligence mode, a run longer than the host's function limit, a remote agent with long tool calls,
  or in-memory runs that must survive a page reload. Serverless works for request-scoped chat whose
  runs fit the function limit.
- **Threads.** CopilotKit Intelligence for anything real people use (durable threads per user, memory,
  analytics, learning), unless the spec keeps it off; the default in-memory runner on one instance for a
  public demo.
- **Host.** Build command, start command, port, health path, replicas.
- **Model per environment.** The mock on anything public; the real model only behind sign-in, and only
  after the data owner agrees to what goes to the provider.
- **Sign-in.** The identity provider, where the check sits (`hooks.onRequest`, with `identifyUser`
  naming the user), and which environments it covers. "None" only for a public demo on seeded data.
- **Environments.** Which variables and keys each one gets.

## Step 4: Fill the checklist

Ten sections, in this order, with the same ids every run so two apps' checklists line up
(`references/checklist-format.md` lists the standard items):

1. Where the runtime runs · 2. Server-side connections (one item per `/agent-context` row on rings
3 to 7: where it's hosted, the env var for its token, https, `TENANT_PACKAGE_DIR` for OpenBot) ·
3. Host and config · 4. Environment and secrets · 5. Mock mode · 6. Sign-in, scope and data: the
spec's scope, sign-in, shared state on the server, and what goes to the model provider ·
7. Protection: rate limits, spend caps, allowed origins ·
8. Operations: health, logs, traces, staging, rollback, inspector · 9. Smoke test after the deploy ·
10. Go live: the steps that wait for the developer's yes

**The top of the page is calm**, because it gets read at a glance and sometimes screenshotted: one
`headline` sentence (can it go live, and what stops it), then `blockers`, the two to five item ids that
stop the deploy. Everything else is detail below. On any deployment more than one person uses, the
`shared-state` item is a blocker until state lives on a server store keyed by user, the user comes from
`identifyUser(request)`, and approvals are enforced on the server. A planned `/agent-context` row is
`na` for this deploy only if this audience can do without it; one the map or the spec makes a blocker
for this audience stays open.

Every item says **what**, **why**, **how** and **done when**, and *done* items carry their
**evidence**. The how leads with the CopilotKit or AG-UI piece from the table above (`hooks.onRequest`,
`identifyUser`, `cors`, `GET {basePath}/info`, `BuiltInAgent`'s mock model, CopilotKit Intelligence),
with a docs.copilotkit.ai link or the file in the starter. Generic alternatives go in `footnote`.

- Statuses: **done** (with evidence), **todo** (work you can do locally), **ask** (the developer's
  decision or yes), **blocked** (name the item it waits on), **na** (one line on why it doesn't apply).
- Variables: the exact name, what it's for, and its value source per environment (local, staging,
  production), never the value itself.
- Commands: exact, copyable, each marked when it needs a yes.
- One or two sentences per field. It's a page to build with, not an essay.
- Name hosts and tools to describe them; don't copy their UI text or logos.

## Step 5: Prepare locally

Local files that don't change how the app behaves can be written as part of the prep: an ignore file
(`.dockerignore`, `.railwayignore`) that keeps `.env*` (except `.env.example`), `node_modules`, build
output and `.claude` (symlinked skills) out of the upload, a Dockerfile, host config, a smoke-test script, and missing names in
`.env.example`. Never overwrite an existing file; show the change instead. In a repo you were told not
to edit, put these in the checklist's snippets instead of writing them.

Changes to app code (the sign-in gate, a rate limit, a health route, a mock gate, the bind address) are
the developer's design choices. Put each in the checklist as a *todo* with the snippet, and make it when
they say so, with a test for each refusal.

## Step 6: Write the page

The page is `assets/deploy.html`, which renders one JSON block; you write the JSON, never item HTML.
`<skill>` below is this skill's folder.

1. Start from the standard items: `node <skill>/scripts/fill.mjs --extract <skill>/assets/deploy.html > deploy-data.json`
   in your scratch space. To update an earlier run, `--extract` the developer's
   `docs/copilot/deploy.html` instead.
2. Edit the JSON for this app, following `references/checklist-format.md`.
3. `node <skill>/scripts/fill.mjs deploy-data.json docs/copilot/deploy.html` (in the developer's repo).
   It refuses an unknown status, a *done*, *na*, *blocked* or *ask* item without evidence, a missing
   section, and anything shaped like a real key, and it warns when a how names no CopilotKit piece.
   Fix what it prints. If the developer said not to touch the repo, write the page to scratch space.
4. If you have an Artifact tool, you may also publish the page (private by default) and give the
   link. Otherwise say how to open it: `open docs/copilot/deploy.html` (macOS),
   `xdg-open docs/copilot/deploy.html` (Linux), or drag it into a browser. It needs no network.

## Step 7: After the developer deploys

When they tell you it's up, run section 8 with them against the real URL: the reads you can run
yourself (`curl` the health path and `{basePath}/info`, check the listing route refuses), and the user
flows they click through. Update each status with its evidence and save the page again. Anything you
couldn't check stays open and goes in "Not verified".

## What to hand back

- The checklist's path (and link, if published), with counts: done, todo, ask, blocked.
- The six decisions, with anything *Assumed* named.
- The commands waiting for a yes, in the order to run them.
- What isn't verified yet: streaming through the host's proxy until the smoke test passes, the real
  model behind sign-in, the rollback.
- Next: `/secure-governance`, to decide roles, approvals, audit and data rules before production use.
