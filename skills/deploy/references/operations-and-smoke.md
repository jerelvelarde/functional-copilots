# Operations and the smoke test

## Health checks

A host restarts or routes around an instance that fails its health check, and won't switch traffic to
a new deploy until the check passes. Use two meanings:
- **Liveness**: the process answers. Restart it if not.
- **Readiness**: it can serve a run. For a Channels worker, only `online` is ready.

Which path:
- `GET {basePath}/info` (Open Harvey: `/api/copilotkit/info`) answers 200 with JSON that includes the
  runtime `version`, the `agents` and the `mode` (`sse`, or Intelligence). It proves the runtime loaded
  and the agent is registered, and costs no model call. Good while the runtime has no sign-in in front.
- Once `hooks.onRequest` refuses unsigned requests, `/info` returns 401 to the host's checker. Add a
  separate route outside the runtime's `basePath` (for example `app/api/health/route.ts` returning
  `{ ok: true }`) and point the host at it.
- Never make a health check call the model: it spends money every few seconds, and a provider outage
  would restart healthy instances.

## Logs

- Know where they are before launch: `railway logs`, `vercel logs <deployment-url>`, the Render
  dashboard, `docker logs`, or the platform's log viewer. The commands are reads; they need no yes.
- What to log: the model and why (Open Harvey logs
  `[copilot] Running on the scripted mock model (<reason>)` once), the signed-in user's id (not their
  token), the agent id and thread id, each refusal (401, 403, 429) with its reason, and failed runs.
- What never to log: tokens, keys, cookies, full prompts with personal data. Log `user:<id>` or
  `anonymous`.
- The runtime's own debug logging (`debug` on `CopilotRuntime`) is for local investigation, not for
  production traffic.
- Fail loud: a misconfigured integration should say so at startup and in the UI, not fail silently on
  the first user. Open Harvey's Intelligence switch checks the key and the Learning Space at startup
  and shows the result in a strip (`src/lib/intelligence.ts`, `checkIntelligence`).

## Traces

- **Per request**: `hooks.onResponse` sees the route and the response; log the status and the time
  taken. `afterRequestMiddleware` on `CopilotRuntime` is called after each request with the run's messages;
  it fires for every path, so filter to the run route.
- **Per conversation**: CopilotKit Intelligence stores threads per user, with memory, analytics and
  insights, and Automatic Learning turns them into proposed skills a person publishes, per Learning
  Space. That is the learning loop of the suite (`/functional-copilot`, "Learning loop"), not just
  observability. Trajectories through `@copilotkit/learning` are off on hosted Intelligence today:
  say so rather than promising them.
- **Per model call**: the provider's usage dashboard, split by the per-environment projects.

## The web inspector

The CopilotKit web inspector (`@copilotkit/web-inspector`) shows a run's AG-UI events in the browser.
It is on by default in development on localhost, and always off on remote hosts, in production and
during server rendering; `enableInspector` on `CopilotKitProvider` turns it off locally too. Before a
deploy, watch one full run in it: when the deployed app misbehaves, comparing against that local run
tells a host problem (buffering, timeouts) from an agent problem.

## Staging and production

- Staging is the same build, the same start command and the same health check as production, with its
  own variables and keys, and its own URL. Deploy there first, smoke-test, then promote or deploy the
  same commit to production.
- Never point staging at production data or production's Intelligence project.
- A staging URL is public unless something protects it. Treat it like production for sign-in.

## Rollbacks

Know the rollback before the first deploy, and try it once on staging:
- Vercel: `vercel rollback <deployment-url-or-id>` (needs a yes).
- Railway: redeploy an earlier deployment from the service's deployment list in the dashboard.
- Render: redeploy an earlier deploy from the dashboard.
- Docker: redeploy the previous image tag. Tag images with the commit, never only `latest`.

Done when the developer knows which deployment to go back to and has done it once.

## The smoke test

Run it right after every deploy, against the public URL, before telling anyone the link. Three parts.

**1. Reads you can run** (no yes needed; they change nothing):
```bash
URL=https://<the-deploy-url>
curl -s -o /dev/null -w '%{http_code}\n' $URL/                      # 200
curl -s $URL/api/copilotkit/info                                   # 200, "version":"1.84.1", the agents, "mode"
curl -s -o /dev/null -w '%{http_code}\n' $URL/api/copilotkit/threads  # 403 without identity (401 once sign-in is in front)
```
With sign-in in front, the same calls without a session must get 401 (or the proxy's sign-in redirect),
never a stream.

**2. The key user flows**, clicked in a browser by the developer or with a browser tool:
- The function's demo script from its spec, start to finish: the first message streams token by token
  (not all at the end), each card renders, each gate refuses before its approval, the final artifact
  appears.
- The page says which model is running (the mock on a public demo).
- A reload mid-review keeps what the app promises to keep.
- If there's sign-in: user B can't open user A's thread.
- If there's a rate limit: a burst gets the readable 429 message.

**3. The server side**: the logs show the expected model line, no errors, no secrets. No env file went
up: the ignore file lists `.env*`, and for an image, `docker run --rm <image> ls -a` shows none.

Record each result as evidence on the matching checklist item. What wasn't run stays open.

## Open Harvey's answers

- Health: `/api/copilotkit/info` (no sign-in on the public demo; probed: 200).
- Logs: the mock line on the first request to the runtime (the route module loads then, so it may be
  the health check); Intelligence off, so no startup check runs.
- Staging: not set up yet; the release prep verified a local production build with `start:public` on
  PORT=3290 (bound to all interfaces, mock line in the log, `GET /threads` → 403, demo steps 1–8 with
  every figure matching).
- Reset demo in Maya's menu uses `window.confirm`, which automated browsers decline: a scripted smoke
  test has to accept the dialog or skip that step.
