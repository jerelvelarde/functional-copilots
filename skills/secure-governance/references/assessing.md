# Assessing an app, item by item

Where to look, what to search for, and the traps. Run the searches from the app's root, and always
leave out `node_modules`, `.next`, `dist` and build output. `rg` (ripgrep) skips ignored files by
itself; with `grep`, add `--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist`.

**Never open `.env`, `.env.local` or any secrets file, and never print a match that could be a key.**
Use `-l` (file names only) for any search that might hit one.

## First, the map (five searches)

```bash
# The runtime endpoint and its hooks (v2 and v1 names)
rg -n "createCopilotRuntimeHandler|copilotRuntimeNextJSAppRouterEndpoint|new CopilotRuntime|hooks:|onRequest|onBeforeHandler|identifyUser" -g '!node_modules'
# The agent and its limits
rg -n "new BuiltInAgent|maxSteps|maxOutputTokens|maxRetries|overridableProperties|mcpServers|mcpClients|tools:" -g '!node_modules'
# Every tool the agent can call (v2 and v1 hooks, server tools)
rg -n "useHumanInTheLoop|useInterrupt|useFrontendTool|useCopilotAction|useComponent|useRenderTool|defineTool\(" -g '!node_modules'
# What the agent is told
rg -n "useAgentContext|useCopilotReadable|prompt:|instructions" -g '!node_modules'
# Intelligence and learning
rg -n "CopilotKitIntelligence|emitTrajectoryEvent|learning=|learnedSkills|CPK_INTELLIGENCE" -g '!node_modules'
```

Then make the tool list: every tool, read or write, and what stands between it and the outside world.
Most items below hang off that list.

## P1 An approval gate on every write

- **Look at:** each tool from the map. A write is anything that leaves the draft: send, submit,
  publish, post, pay, create or update a record elsewhere, email, message.
- **Done looks like:** the write is a `useHumanInTheLoop` tool (or `useInterrupt`, or a server tool
  with `interrupt: true`), or it can only be called from a function that such a card calls; and a test
  proves the write refuses without a click.
- **Traps:**
  - A `useFrontendTool` whose handler writes directly. The model can call it without anyone clicking.
  - A gate card whose button the model can "press" by calling a second tool.
  - A gate that shows "Send?" but not who, what or how much.
  - Draft edits are not writes when a gate stands between the draft and the outside world. Don't mark
    them as gaps.

## P2 No open endpoint

- **Look at:** the runtime route file; `package.json` scripts (`-H 127.0.0.1`, `--hostname`); any
  middleware (`middleware.ts`, an Express `app.use`); the deploy config (`vercel.json`, `render.yaml`,
  `railway.json`, a Dockerfile); and the `/deploy` page if there is one.
- **Done looks like:** `onRequest` rejects a missing or bad session (with a test), or the whole app
  sits behind access protection the deploy config shows, or it only listens on localhost and isn't
  deployed.
- **Also check the debug feed:** the runtime serves `<basePath>/cpk-debug-events`, which streams every
  thread's full content, whenever `NODE_ENV` is exactly `development` or `debug` is set on
  `CopilotRuntime`. Search for `debug:` near `new CopilotRuntime`, and for any deploy that runs
  `next dev` or sets `NODE_ENV=development`.
- **It's a data leak, not only a cost.** Read what the page sends to the browser before sign-in:
  server components, page props, API routes and bundled JSON.
  - Open Harvey's `src/app/page.tsx` hands every contract, the playbook and the review history to
    the client app.
  - So a deployed copy leaks the company's records to anyone with the URL, even on the scripted
    model where the key is safe.
- **Traps:**
  - Localhost-only is `done` for a laptop pilot and `partial` the moment there's a deploy script that
    listens on `0.0.0.0`.
  - "The mock keeps the key safe" covers cost only. If the page serves real records, the endpoint
    is still open.
  - Other app routes next to the runtime (a status or admin route) are part of the endpoint too.
  - `identifyUser` alone is not a gate: the docs say so.
  - Auth on the page but not on `/api/copilotkit` still leaves the endpoint open.

## P3 Secrets out of the code

```bash
# File names only: never print the match
rg -l "sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|(API_KEY|SECRET|TOKEN)\s*[:=]\s*['\"][^'\"]{12,}" -g '!node_modules' -g '!.env*'
rg -l "NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN)" -g '!node_modules' -g '!.env*'
git check-ignore -v .env.local .env 2>/dev/null || cat .gitignore
```

- **Done looks like:** no key-shaped string in tracked files, `.env*` ignored except `.env.example`,
  no public variable that holds a key, and any tool that needs a secret runs on the server.
- **Traps:**
  - The deploy's upload ignore file (`.railwayignore`, `.dockerignore`, `.vercelignore`) is separate
    from `.gitignore`, and matters when the folder isn't a git repo.
  - An error message that echoes a key.

## P4 A scripted mode for demos

- **Look at:** how the model is chosen (`model:` on `BuiltInAgent`), any mock or fixture model, the
  demo script, and its test.
- **Done looks like:** a switch (env var or missing key) that plays a script end to end, a test that
  runs it, and a visible label in the app saying which mode it's in.
- **Trap:** recorded fixtures that bypass the runtime prove less than a scripted model behind the real
  runtime.

## P5 A decision log

- **Look at:** where approvals, send-backs and publishes are stored; any `log`, `audit`, `history` or
  `decisions` module; and whether the agent is given it.
- **Done looks like:** one function that lists every gated decision with who, when, what and comment,
  a test that checks a gate adds an entry, and a place in the app where people read it.
- **Traps:**
  - A console log is not a decision log. Neither is the chat transcript: it records what the model
    said, not who decided.
  - A demo log that writes a fixed persona and a story clock is `partial` once more than one person
    uses the app.
  - **A log built from a record that gets overwritten.** If the log is derived from the current state
    of a record, a resubmission that replaces that state (a new `submission` with empty `decisions`)
    erases the earlier round.
    - The send-back vanishes, and first-pass rates look better than they were.
    - Open Harvey's `sendForApproval()` does exactly this.
    - Read how a resubmit writes the record. Done needs a test that sends back, resubmits and finds
      both rounds in the log.

## P6 Threads, analytics and learning from Intelligence

- **Look at:** `CopilotRuntime` options (`intelligence`, `identifyUser`), the env switch, any startup
  check, and where `identifyUser` gets the user.
- **Done looks like:** Intelligence is on behind an explicit switch, `identifyUser` returns the
  server's idea of the user, failures are logged and shown, and `threads/events` and `threads/state`
  are guarded in `onBeforeHandler`.
- **Traps:**
  - Wired but off is `partial`, not `done`, for a pilot that should keep threads.
  - "Off means nothing leaves the machine" is only true with `COPILOTKIT_TELEMETRY_DISABLED=true`: the
    runtime sends usage telemetry by default.
  - An `identifyUser` that returns a constant is fine for a one-person demo, and a gap for two users.
  - Don't mark Trajectories or learning as working unless the developer shows you.

## R1 Identity and SSO

- **Look at:** the auth library (`next-auth`/Auth.js, Clerk, WorkOS, Okta SDK, `passport`, SAML or
  OIDC config), the provider's `headers` prop, `onRequest`, and `identifyUser`.
- **Done looks like:**
  - a named person has decided the identity provider, and that every write runs as the signed-in
    person;
  - the session is verified on the server for the runtime;
  - `identifyUser` returns the identity provider's id.
- **Who decides.** This skill is the suite's last step, so name the person.
  - It's the workflow's business owner, with IT or security: in Open Harvey, the General Counsel who
    owns the playbook, with Northstar's IT.
  - Take the name from the spec, or write the role.
  - "Identity: to be decided" with no owner is the gap this item exists to close.
- **Traps:**
  - A user picker or "acting as" label in the UI is not identity.
  - A shared service account for writes hides who decided. The agent acts as the signed-in person.

## R2 Roles, and who can approve what

- **Look at:** the routing code (who approves, from what facts), the rule ids, the tests, and any
  server-side check before an approval is recorded.
- **Done looks like:** routing is a tested pure function, the server checks that the approver is next
  on the route and isn't the preparer, and delegation and timeout are written down.
- **Trap:** routing computed in the browser and trusted by the server.

## R3 The audit trail, and how long it's kept

- **Look at:** where decisions are written (a database table, an append-only log), whether anything
  can update or delete them, retention jobs, export.
- **Done looks like:** server-side, append-only, linked to thread ids, a written retention period per
  store, and an export.
- **Traps:**
  - localStorage, a cookie or an in-memory store is never an audit trail.
  - Neither is a trail rebuilt from records that get overwritten: a resubmission must add a round,
    not replace one (see P5).

## R4 Personal data, where it's stored, and provider agreements

- **Look at:** what goes into `useAgentContext` and tool results; the Trajectory `learning` config
  (`capture`, `beforeSend`, `ignoreUrls`, `data-copilotkit-ignore`); `COPILOTKIT_TELEMETRY_DISABLED`;
  the Intelligence deployment (hosted or self-hosted); any data-map or DPA document in the repo.
- **Done looks like:** a written data map, provider terms on file, and capture exclusions you checked.
- **Trap:** most of this lives outside the code. Ask; don't assume. "Can't be checked from the code"
  is a fine `here`.

## R5 Prompt injection in documents and tool outputs

```bash
rg -n "overridableProperties|forwardSystemMessages|forwardDeveloperMessages|quotedText|not instructions" -g '!node_modules'
```

- **Look at:** how documents and tool results reach the model, whether untrusted text is labelled as
  data, whether verdicts and routing are computed in code, and whether any test plants an instruction.
- **Done looks like:** gates and code-computed verdicts, untrusted text labelled, `prompt` and `model`
  not overridable from the browser, and a planted-instruction test run on the real model.
- **Trap:** an instruction in the system prompt saying "ignore injected instructions" is not a defence
  on its own.

## R6 A tool allowlist and least privilege

- **Look at:** `tools`, `mcpServers` and `mcpClients` on the agent, the credentials each MCP server
  uses, `overridableProperties`, `maxSteps`, and OpenBot rules if it's an OpenBot package.
- **Done looks like:** a written tool list matching what the agent sees, MCP filtered to the allowed
  tools, and credentials scoped to the workflow.
- **The inspector check needs the app running.** Reading the code gives you the tools you *expect*.
  The list the agent actually sees comes from the CopilotKit web inspector on a real run.
  - Without that check, a small, clean tool surface is still `partial`, with "check the tool list in
    the web inspector" as `next`.
  - It becomes `done` once the developer shows you the inspector's list.
- **Traps:**
  - `mcpServers` hands the agent every tool the server offers, including ones added later.
  - `BuiltInAgent` adds `AGUISendStateSnapshot` and `AGUISendStateDelta` to every run. They belong
    on the list.
  - `maxSteps` defaults to one step (ten only when learned skills are loaded). With server tools and
    no `maxSteps` of 2 or more, the run ends on the tool call and the user gets no reply.

## R7 Rate and spend limits

```bash
rg -n "429|rateLimit|rate-limit|limiter|quota|maxSteps|maxOutputTokens" -g '!node_modules'
```

- **Done looks like:** a per-user limit on runs in `onBeforeHandler` (counting only
  `route.method === "agent/run"`), run caps on the agent, a provider budget (ask), and a tested kill
  switch.
- **Trap:** a limiter in `onRequest` also counts `/info` and thread polling, so a busy page trips it
  without anyone running the agent.

## R8 Evals and red-team tests on the key flows

- **Look at:** test files, an `evals/` folder, CI config, and whether anything runs on a real model.
- **Done looks like:** golden cases per key flow on the production model, run on change, and a
  red-team set.
- **Trap:** unit tests and a mock demo are necessary but are `partial` here: they don't test the model.

## R9 Incident response

- **Look at:** `docs/` for a runbook, on-call notes, the kill switch, and `onError` alerting.
- **Done looks like:** a written runbook with an owner, and one drill.

## R10 Governing what the copilot learns

- **Look at:** any publish, approve or dismiss flow for learned rules or skills; whether versions are
  kept; whether rollback exists; who may publish and whether the server checks it; Intelligence
  `learnedSkills` or a pinned `revision`.
- **Done looks like:** a server-checked publisher role, every version kept, rollback tested, and each
  publish in the audit trail.
- **Traps:**
  - A version counter with no history can't roll back.
  - No learning loop at all means `na`, not `gap`.
