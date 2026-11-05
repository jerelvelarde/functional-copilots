# Sign-in in front of the agent, and protection

Checked against `@copilotkit/runtime` 1.84.1 and https://docs.copilotkit.ai/auth. Where the two
differ, the installed package is newer; say so in the checklist rather than picking silently.

## Why it matters

The runtime endpoint (`/api/copilotkit` in the starters) runs the agent on your server, with your model
key, for whoever sends the request. With no sign-in in front, anyone who finds the URL can run your
model on your bill, call every tool the agent has, and read any thread whose id they can guess or
capture. Hiding the URL doesn't help: it's in the page's JavaScript.

It's a data leak too, not only a bill: the page and the agent hand out whatever data the app serves.
On the scripted mock, Open Harvey's page still sends every contract to every visitor.

So the rules the checklist enforces: **no real model, no real-system tools and none of the company's own
data on an endpoint without sign-in in front of it.** A public demo runs the mock on seeded, fictional
data only (see `secrets-and-env.md`).

## The sign-in gate, the CopilotKit way

People sign in with your identity provider (Okta, Entra ID, Google, Auth0) through the app's normal
sign-in. Then three CopilotKit pieces carry that identity to the agent:

1. **`CopilotKitProvider`'s `headers`** sends the token on every runtime call:
   ```tsx
   <CopilotKitProvider runtimeUrl="/api/copilotkit" headers={async () => ({ Authorization: `Bearer ${await getToken()}` })}>
   ```
   `headers` takes a record, or a sync or async builder run on each request. `credentials: "include"`
   sends cookies on cross-origin calls.
2. **`hooks.onRequest`** on `createCopilotRuntimeHandler` refuses anything unsigned, before routing:
   ```ts
   const handler = createCopilotRuntimeHandler({
     runtime,
     basePath: "/api/copilotkit",
     hooks: {
       onRequest: async ({ request }) => {
         const user = await verifySession(request); // your identity provider's server SDK
         if (!user) throw new Response("Unauthorized", { status: 401 });
       },
     },
   });
   ```
   Throwing a `Response` ends the request there. `hooks.onBeforeHandler` runs after routing, with
   `route` (method, agent id, thread id), for per-route rules and rate limits. The v1 adapter
   `copilotRuntimeNextJSAppRouterEndpoint` doesn't forward `hooks`, so use the v2 handler.
3. **`identifyUser`** on `CopilotRuntime` names the user for threads, Intelligence and learning (next
   section).

*Other options (a footnote, not a replacement):* an identity-aware proxy, the host's access protection
or a private network in front of the whole app adds a layer. Keep the runtime check anyway, so a
misconfigured proxy or a preview URL never exposes the agent. Platform protection on preview deploys
(for example Vercel's deployment protection) is good for previews, not a production gate.

## Who is asking: `identifyUser`

`identifyUser: (request) => ({ id, name })` on `CopilotRuntime` names the signed-in user for the
runtime. It is not the gate; authenticate first (`onRequest`), then identify.
- **SSE mode** (no Intelligence): with `identifyUser`, each thread belongs to the user who created it,
  and only they can list, read, replay, continue or stop it (1.84.1 typedoc; the in-memory and SQLite
  runners enforce it). docs.copilotkit.ai/auth still says the in-memory runner doesn't scope threads,
  so test it: user B must get a refusal for user A's thread.
- Without `identifyUser`, `threads: { access: "owner" }` is the default: a thread id works like a
  password for that thread, and listing or clearing threads is refused with 403
  (`thread_access_not_configured`). Never set `access: "open"` on anything more than one person can
  reach.
- **Intelligence mode** requires `identifyUser` (or Channels). The docs note two thread routes that
  aren't scoped to the user; guard them in `onBeforeHandler` (docs.copilotkit.ai/auth, "Thread
  authorization").
- Resolve the user on the server from the session. Never trust a user id the browser sends in the
  body. Open Harvey's Intelligence switch resolves its demo user on the server for this reason
  (`src/lib/intelligence.ts`).

## What goes to the model provider

Every run sends the model provider the context (`useAgentContext`), the conversation and the tool results:
on a real model, contract text, people's pay or customers' records leave the company with each message.
That is a data flow to agree, not a setting:
- Name the provider and what each run sends (read the app's `useAgentContext` calls and tool results).
- Get the data owner's yes (Legal and Security for contracts, HR for people data) and record who agreed
  and when, before `ALLOW_REAL_MODEL=true` or a key goes on any environment.
- Check the provider's data terms for the account the key belongs to (retention, training use, region).
- The CopilotKit runtime's telemetry is a second flow (it can include error messages from failed runs):
  `COPILOTKIT_TELEMETRY_DISABLED=true` turns it off.

The standard item is `model-provider-data`; on a public demo on seeded data it's `na`.

## Rate limits

Even on the mock, every run costs CPU and memory; on a real model, every run costs money. Limit runs in
the runtime's own hook: `hooks.onBeforeHandler` on `createCopilotRuntimeHandler`, counting
`route.method === "agent/run"` per user (the id your gate verified) or per IP on a public demo, and
throwing a 429 `Response` over the limit. An in-process counter works for one instance; with several,
use a shared store.

*Other options:* a CDN or WAF rate-limit rule in front of the host. Check what the host offers before
relying on it: Railway's WAF (`railway waf`) has an under-attack mode, not per-route limits.

Done when a burst of runs above the limit gets 429s and the app shows a readable message.

## Spend caps

Bound what CopilotKit spends first, then cap the bills, because each layer catches what the others miss:
1. **The agent**: `BuiltInAgent`'s `maxSteps` caps tool-call rounds. Set it to the minimum the flow
   needs: 2 or more with server tools or MCP tools, because at the default a run that calls a server
   tool ends at the tool result with no reply. It defaults to 1 (10 only when learned
   skills are loaded). Its `model` per environment (a mini model for production traffic) and the prompt
   length set the cost per step.
2. **Watch it**: CopilotKit Intelligence analytics shows how the copilot is used, per environment
   (https://docs.copilotkit.ai/intelligence/analytics).
3. **The model provider**: a separate project per environment with a monthly budget or usage limit,
   and an alert below it. The developer sets it in the provider's dashboard; record the number they
   choose.
4. **The host**: a usage limit or billing alert (Railway: `railway usage limit`; other hosts: their
   billing alerts). Autoscaling without a maximum is an unbounded bill.

## Allowed origins (CORS)

- **Same origin** (the app and the runtime on one domain, like a Next.js route): leave `cors` unset.
  With no CORS headers, browsers refuse to let another site's scripts read the runtime's responses.
- **Different origins** (a SPA on one domain, the runtime on another): list them.
  ```ts
  createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit", cors: { origin: ["https://app.example.com"], credentials: true } });
  ```
  `cors: true` means any origin (`*`); never pair it with credentials or a real model. With
  `credentials: true` the origin must be explicit.
- CORS stops other websites' scripts; it doesn't stop `curl`. It is not sign-in.

## What belongs in /secure-governance instead

Roles and permissions on tools, approval gates, separation of duties, audit logs, data residency,
prompt-injection handling for text people type: name them in "Not verified" and point to the next skill.
