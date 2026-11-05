# Where the runtime runs, and on which host

Checked against `@copilotkit/runtime` 1.84.1 (the version Open Harvey installs) and
https://docs.copilotkit.ai/runtime-server-adapter. If the developer's app pins another version, check
the names against their `node_modules/@copilotkit/runtime/dist/v2/*.d.mts` before you cite them.

## Contents
- Find the runtime
- What the runtime needs from a host
- Long-lived Node or serverless
- State: the runner
- Channels workers
- Remote agents
- Hosts: Vercel, Railway, Render, Docker
- Open Harvey's answers

## Find the runtime

| You find | What it is | Deploy note |
| --- | --- | --- |
| `createCopilotRuntimeHandler({ runtime, basePath })` from `@copilotkit/runtime/v2` | A Fetch handler. Next.js App Router route, Bun, Deno, Cloudflare Workers | Takes `hooks` and `cors` |
| `createCopilotExpressHandler` (`/v2/express`), `createCopilotHonoHandler` (`/v2/hono`) | Express router or Hono app | Same options |
| `createCopilotNodeHandler` or `createCopilotNodeListener` (`/v2/node`) | Plain Node HTTP | `createCopilotNodeListener` owns the process: long-lived |
| `copilotRuntimeNextJSAppRouterEndpoint` (v1) | The older adapter | It doesn't forward `hooks`, so move to the v2 handler before adding a sign-in gate (docs.copilotkit.ai/auth) |
| `new BuiltInAgent({ model })` | The agent runs inside the runtime process | One service. The model key lives on this server |
| An agent URL, `HttpAgent`, LangGraph or another AG-UI server | A second service | Deploy and protect it too (see Remote agents) |

The handler serves several routes under its `basePath` (multi-route mode, the default):
`GET {basePath}/info`, `POST {basePath}/agent/:agentId/run`, `/agent/:agentId/connect`,
`/agent/:agentId/stop/:threadId`, `/transcribe`, and the thread routes. The browser's provider
(`<CopilotKitProvider runtimeUrl="/api/copilotkit">`, or `<CopilotKit runtimeUrl>` in v1) calls them.
Both sides must agree on single-route or multi-route (`useSingleEndpoint` on the provider), or the
startup `/info` call 404s.

## What the runtime needs from a host

A run is one `POST .../run` whose response is a Server-Sent Events stream of AG-UI events (text,
tool calls, state, interrupts). It stays open for the whole run: seconds for a reply, minutes for an
agent that works a checklist. So the host has to:

- **Stream, not buffer.** A proxy that buffers `text/event-stream` (some CDNs, some compression
  middleware) delivers the whole run at the end. Done when a reply appears token by token through the
  public URL.
- **Allow the longest run.** The request timeout (the function's max duration on serverless, the load
  balancer's timeout on a container host) must exceed your longest run. Time the longest demo run
  locally and add margin.
- **Survive quiet stretches.** The runtime writes a `: keep-alive` comment after 15 seconds of
  silence (`sseKeepAliveIntervalSeconds` on `CopilotRuntime`, default 15). Any idle timeout in front
  must be longer than that.
- **Listen where the host says.** Bind `0.0.0.0` and read `$PORT`. A start script bound to
  `127.0.0.1` with a fixed port works on a laptop and fails every health check on a host.
- **Have the memory.** The in-memory runner retains up to 1,000 threads, 100 runs per thread and about
  512 MB of history (`ɵINMEMORY_DEFAULTS`), plus the app. Give a single instance about 1 GB.
- **Run Node 22 or later** for current CopilotKit (Channels needs the global `WebSocket`). Pin it with
  `"engines": { "node": ">=22.12" }` in `package.json`, or the host's Node version setting.

## Long-lived Node or serverless

**Long-lived Node** (one process that stays up: Railway, Render, Fly, Cloud Run, ECS, Kubernetes, a VM).
Pick it when any of these is true:
- the app has a Channels worker (Slack or Teams);
- a run can outlast the serverless function limit;
- runs should survive a page reload, so `/connect` re-attaches to a run that's still going (it only
  works when it lands on the process holding that run);
- the app uses Intelligence mode, whose runner keeps a WebSocket to Intelligence open
  (`heartbeatIntervalMs` on the runtime);
- you want one place to read logs during a live demo.

**Serverless** (Vercel functions, Netlify functions, Lambda). Works for request-scoped chat: the browser
sends the whole thread on every run, so a new instance can answer the next message. Know the limits:
- set the route's max duration to cover the longest run (on Vercel with Next.js:
  `export const maxDuration = <seconds>;` in the route file, within the plan's limit);
- an in-memory run lives in one instance, so reconnecting to it after a reload, and listing threads,
  don't work across instances;
- no Channels worker;
- cold starts add latency to the first message.

**Edge runtimes** (Workers): construct agents in a factory (`agents: () => ({ ... })`), not at module
scope (docs.copilotkit.ai/runtime-server-adapter#cloudflare-workers).

## State: the runner

Prescription: **CopilotKit Intelligence for anything real people use**; the default in-memory runner on
one instance for a public demo.

| Runner | Where threads live | What it means for the deploy |
| --- | --- | --- |
| Intelligence mode (`intelligence: new CopilotKitIntelligence(...)` on `CopilotRuntime`, plus `identifyUser`) | Your CopilotKit Intelligence project | Durable threads per user across restarts and replicas, plus memory, analytics and Automatic Learning. Needs `CPK_INTELLIGENCE_API_KEY` on the server, one project and Learning Space per environment |
| `InMemoryAgentRunner` (default in SSE mode) | Process memory | A restart or redeploy clears it. Replicas don't share it: run one instance |

*Other option:* `SqliteAgentRunner` (package `@copilotkit/sqlite-runner`) keeps threads in a SQLite
file; it needs a persistent disk and a single instance.

**Shared state is a blocker for any shared deployment.** Both starters keep their records in each
browser's localStorage and let one person act as every approver ("Acting as"). That's right for a demo
where every visitor works alone, and wrong the moment two people rely on the same request. Before a team
uses it: move state to a server store keyed by user, resolve the user with `identifyUser(request)` on
`CopilotRuntime`, and enforce each approval on the server against that user, never a name the browser
sends. The checklist's `shared-state` item says which case this is; on a shared deployment it goes in the
blockers at the top.

## Channels workers

A managed Channel (Slack, Teams) is a long-running worker with an outbound realtime connection to
Intelligence, not a serverless request handler (https://docs.copilotkit.ai/slack/deploy-and-operate).
- Host: long-lived only. On Cloud Run, keep at least one instance and CPU always allocated.
- Variables: `CPK_INTELLIGENCE_API_KEY`, `CHANNEL_CODE`; `INTELLIGENCE_API_URL` and
  `INTELLIGENCE_GATEWAY_WS_URL` only for self-hosted or non-production Intelligence.
- Health: liveness is "the process is up". Readiness is each Channel's provider leg:
  `channels.status().detail[id].provider === "attached"`. `overall === "online"` alone doesn't prove
  Slack or Teams is bound (the runtime's own typedoc says so); the provider leg can also read
  `unhealthy`, `not_attached`, `disabled`, `channel_not_declared` or `unknown`. The statuses are
  `connecting`, `online`, `setup_required`, `reconnecting`, `error`, `stopped`.
  Don't restart on `reconnecting`.
- Shutdown: call `channels.stop()` on SIGTERM so another replica can claim new deliveries.
- Slack and Teams credentials stay in Intelligence, not on your worker.
- The docs page pins an older runtime pair; keep `@copilotkit/channels*` and `@copilotkit/runtime`
  at the versions your lockfile tested together, and smoke-test a real message after any bump.

## Server-side connections from /agent-context

`/agent-context` (step 2) leaves `docs/copilot/agent-context.html`. Its rows on rings 3 to 7 run on
servers, so each one becomes an item in the checklist's Server-side connections section, id
`conn-<row id>`. List them with `node <skill>/scripts/fill.mjs --context docs/copilot/agent-context.html`.
Every such row carries two fields made for this step: `runsOn` (where it runs, e.g. "CopilotKit
Runtime: the Next.js route", "A Channels worker: a long-running Node service", "OpenBot on ...") and
`secretEnv` (the env var names it needs, never values; `[]` means none). The map marks names that come
from a starter apart from names it suggests (`CLM_MCP_TOKEN`, `VENDOR_MAIL_API_KEY`); keep that
distinction. A Slack or Teams row names its mode, because the mode decides the worker's secrets.
Copy both fields into the item, and add each name to the variables table. For each row, say:
- **Where it's hosted.** `defineTool` server tools ship inside the runtime: no extra host, but
  `maxSteps` 2 or more. An MCP server in `BuiltInAgent`'s `mcpServers` is its own service: https,
  reachable only from the runtime (`{ type: "http", url, name, options }`; there is no stdio, so a
  local MCP server only works when the runtime runs on the same machine). A Channels worker is a
  long-lived process (below). OpenBot is its own deployment.
- **The env var that holds its token**, by name, set on the server: for an MCP server, a variable you
  name (for example `CLM_MCP_TOKEN`) sent through `options.fetch`; for a managed Channel,
  `CPK_INTELLIGENCE_API_KEY` and `CHANNEL_CODE` (Slack and Teams credentials stay in Intelligence); with
  the `slack({ botToken, appToken })` or `teams(...)` adapters, the worker also holds those tokens; for
  OpenBot, `OPENAI_API_KEY`, `CPK_INTELLIGENCE_API_KEY` and its own (Open Harvey's: `NORTHSTAR_LEGAL_TOKEN`).
- **https** for every hop that leaves the machine.
- **For OpenBot**, the tenant package it loads: `TENANT_PACKAGE_DIR` (the workshop's
  `starters/openbot-legal/` uses `../examples/northstar-legal`, relative to OpenBot's `server/`).
- **Its health check**, and whether a failure is loud: an MCP server that fails to connect is skipped
  for the run with only a console error.

Each row also has a `phase`: `v1` (the default) or `later`, the path after v1. `gate` may carry
`also`, a list of extra gates beside the main one; carry each into the item's how. `later` rows and rows
marked planned are `na` for this deploy, with a line saying so, **unless this deploy's audience needs
them.** A planned row the map or the spec calls a blocker for this audience (a shared
server record for a pilot, sign-in for real approvers) stays open, `todo` or `blocked`, and the item it
gates (`shared-state`, `auth-gate`, `spec-scope`) goes in the blockers at the top. Marking it `na` would
hide the pilot's biggest blocker.

## Remote agents

A LangGraph, Mastra, Google ADK or Pydantic AI agent speaks AG-UI through its integration and joins the
runtime as an `HttpAgent` from `@ag-ui/client` in `CopilotRuntime`'s `agents`
(https://docs.copilotkit.ai/agentic-protocols/ag-ui). That's two things to deploy and two to protect:
- Keep the agent's endpoint on the host's private network, so only the CopilotKit Runtime reaches it.
- The runtime forwards the browser's `authorization` header and custom `x-*` headers to the agent call
  by default (`forwardHeaders` on `CopilotRuntime`), so the agent can see who asked. It strips
  infrastructure headers (`x-forwarded-*`, `x-vercel-*`).
- Give each service its own health check, and deploy the agent before the runtime that calls it.

*Other option:* if the agent's endpoint must be public, require a shared secret header and check it in
the agent.

## Hosts

Command lines that create, link, deploy or set variables all need the developer's yes. Read-only
commands (status, logs, list without values) don't.

### Vercel
- Fits: a Next.js app whose route handler is the runtime, no Channels worker, runs within the function
  limit.
- Build and start: detected from Next.js. Pin Node in project settings or `engines`.
- Variables per environment (Development, Preview, Production): `vercel env add NAME production`
  (prompts for the value; the developer types it). Needs a yes.
- Deploy: `vercel deploy` makes a preview URL; `vercel deploy --prod` promotes to production. Both need
  a yes; the first run also links a project.
- Check the project's deployment protection before a preview gets a real key: with protection off, a
  preview URL is reachable by anyone who has it, and a preview with a real key is an open endpoint on
  that key.
- Rollback: `vercel rollback <deployment-url-or-id>`.
- Long runs: `export const maxDuration = <seconds>;` in the runtime's route file.

### Railway
- Fits: long-lived Node from the repo or from `railway up`; Channels workers; one replica with the
  in-memory runner.
- Build, start, health path and replicas: the service settings in the dashboard, or Infrastructure as
  Code in `.railway/railway.ts` (`railway config`). `railway.json` and `railway.toml` (Config as Code)
  are deprecated, new services can't use them, and existing ones stop working on 2026-12-01: don't add
  one.
- Upload filter: `railway up` respects `.railwayignore`. Exclude `.env*` (keep `!.env.example`),
  `node_modules`, `.next`, local caches and `.claude` (skills symlinked there point out of the repo and
  break the build). Don't rely on `.gitignore` alone outside a git repo.
- Variables per environment: `railway variable set NAME --stdin -e <environment>` so the value never
  sits in shell history. Needs a yes. `railway variable list --kv` prints values: don't run it.
- Always name the environment: every command that changes something takes `-e <environment>`
  (`--environment`), or it acts on whichever environment the folder is linked to.
- Deploy: `railway up --service <service> -e <environment>` (needs a yes; it signs in or creates an
  account if you aren't signed in, then creates a project). Domain:
  `railway domain --service <service> -e <environment>` (needs a yes).
- Environments: production plus a staging environment in the same project, each with its own
  variables: `railway environment new staging --duplicate production` (needs a yes).
- Rollback: redeploy an earlier deployment from the service's deployment list in the dashboard.
  `railway redeploy` only redeploys the latest one.
- Spend: `railway usage limit` shows or sets the workspace usage limit (setting it needs a yes).

### Render
- Fits: long-lived Node web service.
- Blueprint (`render.yaml`): `type: web`, `runtime: node`, `buildCommand`, `startCommand`,
  `healthCheckPath`, `numInstances`, and `envVars` with `sync: false` for every secret, so Render asks
  for the value in its dashboard instead of reading it from the file.
- Rollback: redeploy an earlier deploy from the service's events list.

```yaml
services:
  - type: web
    name: <app>
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm run start:public
    healthCheckPath: /api/copilotkit/info
    numInstances: 1
    envVars:
      - key: OPENAI_API_KEY
        sync: false
```

### Docker, on any container host
Cloud Run, Fly, ECS, Kubernetes, Azure Container Apps or a VM. Secrets come from the platform's secret
store at run time. Never `COPY` an env file, and never pass a key as a build `ARG` or bake it with
`ENV`: build arguments are readable in the image history.

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/copilotkit/info').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "start:public"]
```

```gitignore
# .dockerignore
node_modules
.next
.env*
!.env.example
*.tsbuildinfo
.git
.claude
```

This is a starting point, not a tested image: build it and run the smoke reads against the container
before relying on it. Adjust the health path once sign-in sits in front of the runtime (see
`operations-and-smoke.md`).

## Open Harvey's answers

- Runtime: `createCopilotRuntimeHandler` in `src/app/api/copilotkit/[[...slug]]/route.ts`, one
  `BuiltInAgent`, SSE mode, in-memory runner. Nothing to persist on the server: each visitor's review
  lives in their browser's localStorage.
- Process: long-lived Node, one instance, about 1 GB (README "Deploy it").
- Start: `npm run start:public` = `next start -H 0.0.0.0`, which reads `$PORT` (default 3000).
  `npm run dev` and `npm start` stay on 127.0.0.1.
- No Channels worker, no remote agent.
- Probed on the running app: `GET /api/copilotkit/info` → 200 with `"version":"1.84.1"` and
  `"mode":"sse"`.
