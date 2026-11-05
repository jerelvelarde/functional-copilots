# Environment variables, secrets and mock mode

## The rules, and why

- **Never in the image or the repo.** Anything copied into an image, or committed, can be read by
  anyone who gets the image or the repo, forever (history keeps it). Values go in the host's variable
  store or secret manager, set by the developer.
- **Never through you.** You name the variable; the developer pastes the value into the host. Don't
  open `.env`, `.env.local` or other secrets files, don't ask for a value, and don't run commands that
  print values (`railway variable list --kv`, `vercel env pull`, `printenv`, `env`).
- **Separate keys per environment.** Local, staging and production each get their own model key and
  their own Intelligence key, from separate provider projects where the provider has them. A staging
  leak then can't spend production's budget, a key can be rotated without taking the other environment
  down, and spend shows up per environment.
- **Server only.** A model key must never reach the browser. In Next.js, any variable prefixed
  `NEXT_PUBLIC_` is inlined into the client bundle; in Vite, `VITE_`. A model key with one of those
  prefixes is public.
- **Upload filters.** The ignore file for the upload (`.dockerignore`, `.railwayignore`,
  `.vercelignore`) must exclude `.env*` except `.env.example`. Outside a git repo, don't assume a
  tool reads `.gitignore`.

## The usual variables

Read the app's own code for the real list (`grep -rhoE "process\.env\.[A-Z0-9_]+"`); these are the ones
a CopilotKit app usually has.

| Name | What it is | Secret | Where it goes |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`) | The model provider's key. The runtime reads the one that matches the model id `BuiltInAgent` runs (`openai/...`, `anthropic/...`, `google/...`). **Check that your app's model switch reads the key for your provider too:** Open Harvey's `chooseModel` does; the headcount starter's `copilotModel` checks only `OPENAI_API_KEY` | Yes | Host secret, per environment. Unset on a public demo |
| The app's model switch (Open Harvey: `COPILOT_MODEL`) | Which model, or `mock` | No | Host variable |
| The app's real-model gate (Open Harvey: `ALLOW_REAL_MODEL`) | Allows the real model in a production build | No | Only on an environment that has sign-in in front |
| `CPK_INTELLIGENCE_API_KEY` | The CopilotKit Intelligence project key: Intelligence mode, Learning, Channels | Yes | Host secret, per environment, only where Intelligence is on |
| The app's Intelligence switch (Open Harvey: `CPK_INTELLIGENCE_ENABLED`, `CPK_INTELLIGENCE_LEARNING_CONTAINER_ID`) | Turns Intelligence on; picks the Learning Space | No | Host variable |
| `CHANNEL_CODE` | The Channel a worker serves | No | Host variable on the worker |
| `COPILOTKIT_LICENSE_TOKEN` | Signed license token the runtime reads for licensed features, when the app uses one | Treat as secret | Host secret |
| `COPILOTKIT_TELEMETRY_DISABLED=true` or `DO_NOT_TRACK=1` | Turns off the runtime's usage telemetry (on by default; it can include error messages from failed runs) | No | Host variable, the developer's choice |
| `PORT` | The port to listen on | No | Set by the host. Don't hard-code it |
| `NODE_ENV=production` | Production mode | No | `next start` sets it; set it in a Dockerfile |
| The sign-in provider's server secret (e.g. an OIDC client secret, a session signing secret) | For the gate in front of the agent | Yes | Host secret, per environment |

## How to write them in the checklist

For each variable, one row: the name, what it's for, whether it's a secret, and the source of its
value in each environment, for example *local: `.env.local`, set by you*, *staging: Railway staging
variable*, *production: not set (public demo runs the mock)*. Never the value, and never a fragment of
one.

Commands that set a variable need the developer's yes, and should read the value from stdin or a
prompt so it doesn't land in shell history:
- Railway: `railway variable set OPENAI_API_KEY --stdin -e staging`
- Vercel: `vercel env add OPENAI_API_KEY production` (prompts)
- Render: `sync: false` in `render.yaml`, then the dashboard asks for the value
- Docker hosts: the platform's secret store (Cloud Run secrets, ECS task secrets, Kubernetes Secrets),
  mounted as environment variables at run time

## The production-model trap

Read the app's model switch before planning any environment's variables, because it can silently pick
the mock (or the real model) whatever the variables seem to say:
- Open Harvey's `chooseModel` (`src/lib/server-data.ts`) runs the scripted mock when the key for the
  model's own provider is empty (`keyFor`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY`, the
  names the runtime's `resolveModel` reads), and in any production build unless `ALLOW_REAL_MODEL=true`.
  An environment meant to run the real model needs that key and the flag (the flag only behind
  sign-in); one missing either runs the mock without an error.
- The headcount starter's `copilotModel` checks only `OPENAI_API_KEY`, so another provider's model runs
  the mock even with its key set, and it has no production gate: a production build with
  `OPENAI_API_KEY` runs the real model, signed in or not. Add both checks before deploying it.
- `maxSteps` unset on `BuiltInAgent` means a run stops after one step, so a run that calls a server tool
  ends at the tool result (see `auth-and-protection.md`, "Spend caps").

Done when each environment's smoke test reads the model label it expects (*model: mock · scripted
demo*, or the real model id).

## Mock mode: a scripted model for demos and tests

A copilot with a scripted mock model can be deployed, demoed and smoke-tested without a key, without
network calls to a provider, and without anyone being able to spend money through it. The runtime,
the AG-UI events, the tools, the cards and the gates are all real; only the model's choices are
scripted.

What good looks like (Open Harvey, `src/lib/server-data.ts`, `chooseModel`):
- The mock runs when the model's provider key is missing, when `COPILOT_MODEL=mock`, and **in any
  production build unless `ALLOW_REAL_MODEL=true`**. So a deploy that someone forgot to protect runs the
  mock, even if a key was set by mistake.
- The reason is logged once, when the runtime's route module loads (`route.ts` calls `agentModel()` at
  module scope), so on the first request to `/api/copilotkit`, which may be the health check rather
  than a chat:
  `[copilot] Running on the scripted mock model (production build without ALLOW_REAL_MODEL=true; OPENAI_API_KEY ignored).`
- The UI says which model is running (Open Harvey's rail: *model: mock · scripted demo*), so a
  presenter and a smoke test can both see it.
- Tests pin the gate (`src/lib/server-data.test.ts`: six cases, including "a key in production without
  the flag still runs the mock" and "checks the key for the model's own provider"), and a test plays the whole demo script against the mock
  (`src/lib/demo-script.test.ts`).

What it does not do: it removes the cost of an open endpoint, not the exposure. Anyone who reaches the
URL can still run the agent's tools on the mock, and read whatever the page sends to the browser (Open
Harvey's `page.tsx` sends every contract). That's acceptable only when every record is seeded and
fictional; with the company's own data, put sign-in in front even on the mock. And the mock plays only
the demo script: it can rehearse and smoke-test a deploy, but it can't carry a pilot on real work.

If the developer's app has no mock: the item is *todo*, with the pattern above as the how. A mock is a
`LanguageModelV3` object passed as `BuiltInAgent`'s `model` in place of a model id string
(`agentModel()` in Open Harvey returns either).
