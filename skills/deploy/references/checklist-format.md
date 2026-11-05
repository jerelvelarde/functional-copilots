# The checklist page: data format and standard items

The page is `assets/deploy.html`: inline CSS and JS that render one JSON block,
`<script type="application/json" id="checklist-data">`. You never write item HTML; you write the JSON.
`scripts/fill.mjs` validates the JSON and writes the page.

```bash
node skills/deploy/scripts/fill.mjs --extract skills/deploy/assets/deploy.html > /tmp/deploy-data.json   # the standard items, as a start
# edit /tmp/deploy-data.json for this app
node skills/deploy/scripts/fill.mjs /tmp/deploy-data.json docs/copilot/deploy.html
node skills/deploy/scripts/fill.mjs --context docs/copilot/agent-context.html   # the /agent-context rows to place, if that page exists
```

To update a page from an earlier run, `--extract` it, edit, and fill again. The developer's ticks live
in their browser (localStorage, keyed by app name) and survive a refill.

The script refuses to write when `headline` is missing, a blocker isn't an item id, an item's status is unknown, a *done*, *na*, *blocked* or *ask* item
has no `evidence`, a section id is missing, or any string looks like a key (`sk-...`, `ghp_...`, a long
token). It warns (and still writes) when an item has neither `links` nor `files`, or when a how (outside Go live)
names no CopilotKit or AG-UI piece, or when there are no blockers or more than five.

## Top level

| Field | What |
| --- | --- |
| `skill` | `"deploy"` |
| `app`, `function` | The app's name, and the business function and workflow it serves ("Legal · vendor contract review") |
| `repo` | Path or repo name |
| `date` | `YYYY-MM-DD`, the day of this run |
| `headline` | Required. One calm sentence at the top: can it go live, and what stops it. "Open Harvey can go public today as a scripted demo: no key on the server, nothing for a stranger to spend." |
| `blockers` | Two to five item ids that stop the deploy, shown under the headline. Everything else is detail below |
| `disclaimer` | Only when the app is named after or inspired by a real product: its not-affiliated line, shown in the footer. The page always adds the suite's own line |
| `summary` | Two or three sentences: what's being deployed, for whom, where it stands |
| `decisions` | `[{ label, value, assumed }]`: Process, Threads, Host, Model per environment, Sign-in, Environments. `assumed: true` when it's a default nobody confirmed |
| `env` | `[{ name, purpose, secret, local, staging, production }]`: the source of each value per environment, never a value |
| `commands` | `[{ label, cmd, needsYes, note }]` in the order to run them. `needsYes: true` for anything that deploys, creates, links, sets variables, adds a domain or pushes |
| `sections` | The ten sections below, in order, each `{ id, title, items: [...] }` |
| `snippets` | Optional `[{ title, file, code }]`: host config, ignore files, a Dockerfile |
| `notVerified` | Strings: what this run could not check |
| `next` | One line: the next skill and why |

## Items

| Field | What |
| --- | --- |
| `id` | Stable; keep the standard ids below. New items get new ids |
| `status` | `done`, `todo`, `ask`, `blocked`, `na` |
| `title` | Short, as a result: "Env files stay out of the upload" |
| `what`, `why`, `how`, `doneWhen` | One or two sentences each. Wrap code, paths and names in backticks. The how leads with the CopilotKit or AG-UI piece to use (SKILL.md, "The stack, by name") |
| `footnote` | Optional: generic alternatives (an SSO proxy, a CDN rule, a host setting), shown small under the how as "Other options" |
| `links` | `[{ label, href }]`: docs.copilotkit.ai first, then host docs |
| `files` | Paths in the developer's repo or the starter that implement it |
| `cmd` | Optional single command, shown with a copy button |
| `needsYes` | `true` when doing it touches the outside world |
| `evidence` | Required for `done` (the proof: file:line, test, command output), `na` (why it doesn't apply), `blocked` (the item id it waits on, and why), `ask` (the decision or yes needed) |

Status meanings, shown by shape on the page (no colour): **done** solid disc with a check; **todo**
hollow ring; **ask** dashed ring; **blocked** heavy ring with a bar; **na** small dot, muted text.

## The standard items (ids)

Keep every standard item; mark the ones that don't apply `na` with a reason, so two apps' checklists
line up. The template's JSON has generic what, why, how and done-when text for each: adapt the how and
done-when to the app, and add the evidence.

1. `runtime`, Where the runtime runs: `runtime-endpoint`, `process-shape`, `streaming`, `bind-port`,
   `state-runner`, `channels-worker`, `remote-agent`
2. `connections`, Server-side connections (from /agent-context): `connections-inventory`, then one
   `conn-<row id>` item per row on rings 3 to 7 of `docs/copilot/agent-context.html` (list them with
   `fill.mjs --context`, which reads the page or its `.json`): where it's hosted, the env var for its
   token, https, `TENANT_PACKAGE_DIR` for OpenBot. `later` and planned rows are `na` for this deploy
   unless this audience needs them
3. `host`, Host and config: `host-choice`, `build-start`, `upload-ignore`, `host-config`
4. `env`, Environment and secrets: `env-inventory`, `no-secrets-in-build`, `keys-per-env`, `telemetry`
5. `mock`, Mock mode: `mock-default-prod`, `mock-visible`, `mock-tested`
6. `auth`, Sign-in, scope and data: `spec-scope` (blocked, and first in the blockers, when the
   request needs what the approved spec left out), `auth-gate`, `shared-state` (a blocker on any shared
   deployment), `identify-user`, `thread-access`, `real-model-gate`, `model-provider-data` (the data
   owner's yes to what each run sends the provider), `preview-protection`
7. `protect`, Protection: `rate-limit`, `spend-caps`, `run-bounds`, `origins`
8. `ops`, Operations: `health`, `logs`, `traces`, `staging`, `rollback`, `inspector`
9. `smoke`, Smoke test after the deploy: `smoke-reads`, `smoke-flows`, `smoke-logs`
10. `golive`, Go live: `golive-project`, `golive-vars`, `golive-deploy`, `golive-share` (all
   `needsYes`)

## Calibration

Two full runs, at opposite ends:
- `examples/open-harvey-deploy.html`: Open Harvey's public-release prep. A public demo on the scripted
  mock, no sign-in by design, the host still the developer's call between Railway and Docker.
- `examples/headcount-okta-render-deploy.html`: the headcount starter going to an HR ops team on Render,
  behind Okta, on the real model, with staging and production. It adds app-specific items
  (`app-records`, `app-identity`, `hr-data`) and keeps the real model *blocked* until the sign-in gate
  exists.

Extract either one's JSON to see the level of detail and how evidence is written.
