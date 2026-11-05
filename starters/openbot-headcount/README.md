# Hana, the headcount copilot, as an OpenBot coworker

The workshop's functional copilot (one headcount request, from "I need to hire someone" to an
approval-ready business case) packaged as a coworker in [OpenBot](https://github.com/CopilotKit/openbot),
CopilotKit's open-source AI coworker template. The web-app starter shows the copilot inside a product.
This one takes the same workflow, the same data and the same numbers into OpenBot, and from there into
Slack or Teams. You build the agent once and bring it to where people already work, and OpenBot adds
skills, an approval before the submit, and an audit trail.

```text
openbot-headcount/
├── README.md
├── env/
│   ├── openbot.env.example      lines for OpenBot's .env
│   └── opentag.env.example      lines for OpenTag's .env when OpenBot is its agent (Slack/Teams)
└── examples/northstar/          the tenant package: copy this into your OpenBot clone
    ├── brand.yaml               Northstar, OpenBot's default (neutral) theme
    ├── agents.yaml              Hana (built-in) + an optional row for the web app's own agent
    ├── skills.yaml              headcount-request, hire-cost-check, security-access-justification (not granted)
    ├── channels.yaml            one OpenBot channel; Slack/Teams are NOT configured here (see below)
    ├── knowledge.yaml           required by the loader; empty, and why
    ├── model.yaml               OpenAI, as in the shipped example package
    ├── data/                    the shared Northstar data, unchanged (byte-identical copies), plus a
    │                            biome.json so OpenBot's `format:check` leaves the copies as they are
    └── hr-system/               "Northstar HR": an MCP server for the data, the cost model and the submit
        ├── server.ts            run it: bun examples/northstar/hr-system/server.ts
        ├── model.ts             every rule and number, deterministic, each answer names its policy id
        ├── token.ts             the server's bearer token, created once and reused on every restart
        ├── connect.ts           registers the server with OpenBot, grants it to Hana, adds the approval rules
        ├── model.test.ts        the worked example, number for number, plus the submit and the plan slots
        ├── token.test.ts        a restart keeps the token
        └── safety-floor.test.ts every demo call through OpenBot's own safety floor (inside a clone)
```

How the pieces divide the work:

- **The package is the coworker.** Hana's system prompt holds the workflow, the business case template,
  the rule "never do arithmetic in prose", and the written policy quoted verbatim, so every rule can be
  cited by id (`POL-HC-02` and so on).
- **Northstar HR is the system of record.** It serves the plan, the bands and the cost model as MCP
  tools and does every calculation. `submit_headcount_request` takes the structured inputs (team, level,
  location, start quarter, request type, base salary, and start date and recruiting where given) and
  computes the figures of record itself: the annual run-rate, the FY2027 impact, the budget left after
  it, and the approver chain. It does not read figures or approvers the model sends, and it refuses a
  request with one of those inputs missing rather than guessing it. **The business case text is stored
  as Hana's narrative, as written.** Northstar HR does not check the prose, so the figures an approver
  can rely on are the ones in the request's `figures`, not the ones in the Markdown. It is a stand-in
  for your HRIS. Swap it for a real one and only the tool names in `skills.yaml` change.
- **OpenBot is the governance.** Hana can call only the tools she has been granted. A team approval rule
  makes `submit_headcount_request` ask a person first, and every lookup, decision and submission is
  written to the audit trail.

## Prerequisites

Check each line before the session. If you are following along in a webinar, finish this section and
§1 to §3 beforehand: the first `start.sh` builds OpenBot's Docker images, which takes a while on a fresh
machine (it has not been timed for this README).

**Present the OpenBot segment in OpenBot's web app** (<http://localhost:3010>). Every beat of the demo
happens there: the questions, the figures, the approval card, the audit trail and the published skill.
It needs nothing from §5. **Treat Slack as optional.** It depends on an unmerged OpenTag branch, OpenTag
does not yet deliver Hana's follow-up after an approval click, and this starter's Slack path has not been
run end to end. If you show Slack, rehearse §5 and §6 on the presenting machine first.

For the OpenBot segment:

- [ ] **Bun 1.4.3 or later.** `bun --version`. OpenBot's `package.json` pins `bun@1.4.3`, and its docs
  say some of its tests fail on 1.3. Upgrade with `bun upgrade` (latest stable), or install exactly the
  pinned version with `curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.3"`. If Bun came from
  Homebrew, use `brew upgrade bun`.
- [ ] **Docker Desktop, running.** `docker info --format '{{.ServerVersion}}'` prints a version. An error
  about `docker.sock` or the Docker daemon means it is not running: start Docker Desktop and wait until
  it says it is running. `scripts/start.sh` brings up PostgreSQL (pgvector) and OpenBot's services with
  Compose.
- [ ] **Ports 3001 and 3010 free**, and the ports OpenBot's Docker services and Northstar HR use. This
  prints nothing when they are all free:
  ```sh
  lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3001|3010|5432|4100|4200|4201|4500|4310) '
  ```
  If it shows another OpenBot (its API and app on 3001 and 3010, Docker on the others), run
  `bash scripts/stop.sh` in that checkout. Do this even if it looks harmless: `start.sh` treats any
  OpenBot already answering on 3001 as its own and does not start yours, so a server from another
  checkout would keep running with that checkout's package. For anything else, stop the app that owns
  the port, or `kill <PID>` with the PID from the second column.
- [ ] **Node.js 22 or later** (`node --version`), for `npx` and for OpenTag, plus `openssl`, `curl` and
  `lsof` (macOS ships all three).
- [ ] **A CopilotKit account and an Intelligence project.** A free plan is available. OpenBot keeps
  threads in Intelligence, so a conversation cannot run without its runtime key, and `start.sh` stops
  unless the key checks out. Managed Intelligence needs no `COPILOTKIT_LICENSE_TOKEN`; only a
  self-hosted Intelligence uses one.
- [ ] **An OpenAI API key** (`OPENAI_API_KEY`). To use Anthropic instead, edit `model.yaml`.
- [ ] **cloudflared**, to publish Northstar HR over https: `brew install cloudflared`, then
  `cloudflared --version`. OpenBot only adds an MCP server by URL if it uses `https` and a public
  hostname. It refuses `http`, `localhost` and IP addresses.

Only for Slack (optional):

- [ ] **OpenTag's `openbot-pairing` branch.** It is draft PR
  [#92](https://github.com/CopilotKit/OpenTag/pull/92), not merged as of 2026-11-04. OpenTag's `main` does not send the
  sender context OpenBot requires, so OpenBot answers every turn from it with "OpenTag did not say who
  sent this message" and runs nothing.
- [ ] **pnpm 10** for OpenTag (`pnpm --version`; `corepack enable pnpm` installs it).
- [ ] **A Slack workspace** where you can create and install an app.
- [ ] **For Teams:** tenant admin consent and permission to upload a custom app.

## 1. Drop the package into a fresh OpenBot clone

From the folder that holds `openbot-headcount`:

```sh
git clone https://github.com/CopilotKit/openbot.git openbot-northstar
cp -R openbot-headcount/examples/northstar openbot-northstar/examples/
cd openbot-northstar
git checkout 72709c5   # the OpenBot commit this starter was checked against (2026-11-04)
cp .env.example .env
bun install
```

OpenBot's `main` moves every day. A newer commit will probably work, but `72709c5` is the one the
package, `connect.ts` and these steps were checked against, so present from the same commit you
rehearsed on.

Clone into a folder that has not run OpenBot before, such as `openbot-northstar` above. Compose names
the database volume after the folder, and a package does not remove Bots that an earlier package already
registered. Stop any other OpenBot first (see the ports check in Prerequisites).

## 2. Configure `.env`

Set the lines from [`env/openbot.env.example`](env/openbot.env.example). The ones that matter:

```dotenv
TENANT_PACKAGE_DIR=../examples/northstar   # selects the package; relative to server/
OPENAI_API_KEY=sk-...
```

Then provision Intelligence:

```sh
npx --yes copilotkit@latest login
npx --yes copilotkit@latest project select
bun scripts/setup-learning.ts
```

`project select` writes the runtime key into `.env` as `CPK_INTELLIGENCE_API_KEY`, and
`setup-learning.ts` creates or reuses the `openbot` Learning container and writes
`CPK_INTELLIGENCE_LEARNING_CONTAINER_ID`.

`OPENBOT_SINGLE_USER=true` (already in `.env.example`) makes you the one administrator on localhost.
That is the right setting for a laptop and must be off anywhere other people can reach.

## 3. Run OpenBot

```sh
bash scripts/start.sh        # Docker services, migrations, API on :3001, app on :3010
```

The server validates the package at startup and stops with a sentence naming the file and the field if
something is wrong. Open <http://localhost:3010>. Hana is in the roster with two skills. Under
**Settings → Standing instructions**, write `I am Dana Kim, Director of Engineering for Platform
Infrastructure at Northstar Software.` so Hana knows the requester's team. This is OpenBot's per-person
instruction, and built-in coworkers receive it on every channel.

**After changing `.env` or the package, restart OpenBot fully:**

```sh
bash scripts/stop.sh && bash scripts/start.sh
```

`start.sh` on its own leaves an API server that already answers as OpenBot running (it restarts one only
when that run has just generated a secret), and the server reads `.env` and the package only when it
boots. `stop.sh` deletes nothing: the database, credentials and volumes are still there afterwards.

## 4. Start Northstar HR and connect it

From the OpenBot root, in three terminals:

```sh
# 1. the HR system. NORTHSTAR_TODAY pins "today" for rehearsals; omit it on the day.
NORTHSTAR_TODAY=2026-11-05 bun examples/northstar/hr-system/server.ts

# 2. a public https address for it
cloudflared tunnel --url http://127.0.0.1:4310

# 3. register it with OpenBot (the trycloudflare URL the tunnel printed, plus /mcp)
NORTHSTAR_HR_URL=https://<printed-name>.trycloudflare.com/mcp bun examples/northstar/hr-system/connect.ts
```

Northstar HR requires a bearer token on every call. The first start creates one in
`examples/northstar/hr-system/.env.northstar-hr` and every later start reuses it, so **restarting
Northstar HR does not break OpenBot's connection**. `connect.ts` reads the same file. OpenBot's
`.gitignore` already ignores `.env.*`, so the token stays out of a commit. (If you would rather hold the
token yourself, set `NORTHSTAR_HR_TOKEN` for both commands.)

`connect.ts` first checks the tunnel address against OpenBot's safety floor (see Limits) and refuses one
that matches, because then OpenBot would hand every Northstar HR call to you instead of running it. If
that happens, stop `cloudflared`, start it again for a new random name, and rerun `connect.ts`. Then it
uses OpenBot's own admin API, so every step is audited. It stores the token as an `mcp` credential, adds
the server as `northstar-hr`, grants its six tools to Hana, and adds two **team approval rules** for
Hana:

| Tool | Behaviour |
| --- | --- |
| `northstar-hr/*` | `allow`: lookups never stop to ask |
| `northstar-hr/submit_headcount_request` | `ask`: an approval card before anything is submitted |

A quick tunnel gets a new address each time it starts. Run `connect.ts` again with the new URL: it
removes the server from the old address, adds it at the new one and grants the tools again (OpenBot will
not move a server that holds a credential). It stops with OpenBot's reason if it cannot list the tools.
Rerun it too if you delete `.env.northstar-hr`.

The stricter matching rule wins, and team rules show to members as locked rows, so a person's own
"Always allow" cannot switch the ask off. You can see them under **Admin → Approvals**. OpenBot treats
every tool on a server added by URL as a write and ignores read-only hints, which is why the rules name
the tools explicitly.

If you would rather not run the script, the same steps are under **Admin → Credentials**, `POST
/api/plugins/servers/custom` (there is no add-by-URL form in the UI today), **Admin → Plugins** for the
grants, and **Admin → Approvals** for the rules.

Test it in OpenBot first. Start a conversation with Hana and type the request from the script below.
In the web app, `/headcount-request` picks the skill explicitly.

The HR system's tests run from the OpenBot root with `bun test examples/northstar/hr-system`. Inside an
OpenBot clone that includes `safety-floor.test.ts`, which runs every call in the demo through OpenBot's
own safety floor; anywhere else it is skipped.

## 5. Connect Slack (and Teams): optional

Skip this section if you present in the web app (recommended, see Prerequisites).

OpenBot has no Slack app of its own. Slack and Teams reach it through
[OpenTag](https://github.com/CopilotKit/OpenTag), CopilotKit's open-source Slack/Teams front on the
Channels SDK, which calls OpenBot as its AG-UI agent. Reference: OpenBot's
[Slack and Microsoft Teams (OpenTag pairing)](https://github.com/CopilotKit/openbot/blob/main/docs/configuration.md#slack-and-microsoft-teams-opentag-pairing),
and OpenTag's [Quick start](https://github.com/CopilotKit/OpenTag#quick-start) and
[Pairing with OpenBot](https://github.com/CopilotKit/OpenTag/blob/openbot-pairing/setup.md#pairing-with-openbot).

1. **OpenBot side.** Add `OPENTAG_SHARED_SECRET=<openssl rand -hex 32>` to OpenBot's `.env`, then
   restart OpenBot fully: `bash scripts/stop.sh && bash scripts/start.sh`. OpenBot registers its OpenTag
   endpoint only when the secret is set at boot, so `start.sh` alone (which keeps the running server)
   leaves OpenTag with a 404 and **Reaching you → Slack** without a link code.
2. **Get OpenTag, on the pairing branch.** OpenTag's `main` does not send the `openbot.sender` context,
   and without it OpenBot answers "OpenTag did not say who sent this message" and runs nothing.
   ```sh
   git clone https://github.com/CopilotKit/OpenTag.git && cd OpenTag
   git checkout openbot-pairing && pnpm install
   ```
3. **Create the managed Channel and the Slack app.** Do this before touching Slack, because the Channel
   generates the Slack manifest:
   ```sh
   npx --yes copilotkit@latest project select
   npx --yes copilotkit@latest channels add --name northstar-hana --display-name "Hana" --adapter slack --json
   ```
   It answers `blocked` with a `nextAction`: the prefilled manifest link, the environment variable names
   to set, and a `resumeCommand`. Create the app from the link, then **OAuth & Permissions → Reinstall to
   Workspace**. Take the **Bot User OAuth Token** (`xoxb-`) from **OAuth & Permissions** and the
   **Signing Secret** from **Basic Information → App Credentials**. Set them under the variable names
   `nextAction` gives (in your shell, or in `OpenTag/.env`), then run its `resumeCommand`. No CLI flag
   takes a credential value. To read them from other variables, pass
   `--credential-env channelToken=<VAR> --credential-env signingSecret=<VAR>` (OpenTag's `setup.md`,
   Channel reference). Leave **Socket Mode off**, because with it on the app installs cleanly and
   delivers nothing. Those Slack credentials are stored with the Channel in Intelligence. Neither
   OpenTag nor OpenBot reads a Slack token.
4. **Configure and run OpenTag.** Add the lines from
   [`env/opentag.env.example`](env/opentag.env.example) to `OpenTag/.env` (do not copy the file over
   one the CLI already wrote), and fill in the shared secret and the `cpk-` runtime key of the project
   that owns the Channel. OpenTag's runtime reads that key as `INTELLIGENCE_API_KEY`. Then run only the
   Node runtime, since OpenTag's Python agent is not used when OpenBot is the agent:
   ```sh
   pnpm runtime
   ```
   The runtime connects out to Intelligence, so `AGENT_URL=http://localhost:3001/...` works on one laptop
   with no tunnel for OpenBot.
5. **Link your Slack identity to Hana.** In OpenBot, open Hana's page, then **Reaching you**
   (`/bots/headcount-copilot/reach`). Choose your conversation with Hana, then **Slack**, and copy the
   `link <code>` message. Send it to the Hana app **in a direct message** within ten minutes. Hana replies
   "Linked. Messages you send me here now go to Hana in your OpenBot conversation...". Only linked
   people reach Hana. Anyone else is told how to link, and nothing runs.

**Teams** works the same way through OpenTag: run `channels add ... --adapter teams`, grant tenant admin
consent, upload the app package (**Apps → Manage your apps → Upload an app**), and pick **Teams** under
Reaching you. OpenBot's code handles Teams senders and approval cards. Like the Slack path, it has not
been run end to end for this starter, so rehearse it before you show it live.

Run the demo in the **direct message**. In a shared channel, OpenBot posts only "I sent my answer to you
directly" and routes the answer through proactive delivery, which OpenTag does not implement yet (see
the limits below).

## 6. The demo

Type it in the OpenBot web app, or in the Slack DM. Where they differ, it says so.

Before you start: Northstar HR is running and connected, your standing instruction says you are Dana,
and (for Slack) you are linked. **Restart Northstar HR after your last rehearsal** (Ctrl-C, then the same
command): a submitted request stays pending and holds its Q1 slot and its budget, so a rehearsal submit
would turn the live request into "0 left". The restart clears them and keeps the token, so OpenBot needs
nothing. The figures below are what the tools return. Hana quotes them and does not compute them.

1. **Dana:** `I need approval to hire a senior engineer in New York next quarter.`
   **Hana** says what she inferred: L5 Senior Software Engineer, New York, Q1 FY2027 starting 1 Feb 2027,
   Platform Infrastructure. She asks only for what is missing (POL-HC-01): net-new or backfill, and a
   justification of at least two sentences (what it unblocks, what happens if it is not filled).
2. **Dana:** `Net-new. It unblocks the multi-region failover work we committed for Q2. Without it,
   failover slips at least two quarters and on-call stays on four people.`
   **Hana** reports one line per check, then drafts the business case:
   - Plan fit: 2 approved for Q1, 1 opened (REQ-2027-014), **1 left (0 pending)** (POL-HC-02)
   - New York is Tier 1 and Platform has an office there (POL-COMP-02)
   - Band $185,000 to $240,000, midpoint **$212,000** (POL-COMP-01)
   - Start 2027-02-01, 11 months in FY2027; approve by 2026-12-03 (POL-HC-04)
   - Annual run-rate **$343,920** = 212,000 + 31,800 + 45,000 + 38,160 + 16,960 (POL-FIN-02)
   - FY2027 impact **$334,260** = 343,920 x 11/12 + 19,000 one-time (POL-FIN-01)
   - Budget $420,000 remaining: fits, **$85,740** left (POL-FIN-01)
   - Marcus Lee (VP Engineering), then Priya Raman (Finance BP). No CFO: under $350,000 (POL-APR-01/02)
3. **The live edit. Dana:** `Make the base $225,000, we're up against a competing offer.`
   **Hana**, unprompted: the base is above the midpoint, so it needs a one-line reason, and "competing
   offer" is one (POL-COMP-01). Fully loaded is now **$362,250**, over $350,000, so **Elena Ortiz (CFO)
   joins the chain** (POL-APR-02). FY2027 impact is **$351,063** (rounded), still inside $420,000 with
   $68,937 left.
4. **The approval moment. Dana:** `Looks right. Submit it.`
   Hana calls `submit_headcount_request`, the team rule says `ask`, and OpenBot shows an **approval
   card** for "northstar-hr/submit_headcount_request" with the arguments Hana sent: role, team, level,
   location, quarter, request type, `base_salary` 225000, the above-midpoint reason, the justification and
   the business case (Slack shows the first ten, each cut to 300 characters). The card carries no
   figures: Northstar HR computes them when the submit runs. Nothing has gone to Northstar HR yet. Click **Allow once**. In Slack, OpenTag answers "Allowed once.
   Hana is continuing and will send its result here."
5. **The result.** Northstar HR records `REQ-2027-015`, pending, waiting on Marcus Lee, then Priya
   Raman, then Elena Ortiz, with the figures it computed itself: **$362,250** run-rate, **$351,063**
   FY2027 impact, **$68,937** left. In the web app, Hana's reply after the click is in the conversation.
   In Slack it does not arrive (it goes by proactive delivery, which OpenTag does not implement yet), so
   ask **Dana:** `What's the request id?` and this next turn picks it up from the OpenBot conversation.
6. **The audit trail.** In OpenBot, open **Admin → Audit**. It shows each Northstar HR call
   (`mcp.call_succeeded`, or `mcp.call_failed` with Northstar HR's reason for a refused one), the gate's
   verdict on the submit (`approval.evaluated`: "A rule asks before this kind of action", with the rule's
   id), your decision (`approval.person_decided`), the submit itself, the grants and rules `connect.ts`
   made, and the initiator (a person) on every row. **Export CSV** takes it out.

**If someone asks for a second one.** Ask Hana to check the same request again. Northstar HR now counts
REQ-2027-015 against the quarter and the budget: Q1 shows `0 left (1 pending: REQ-2027-015)`, so the
request is outside the plan and the CFO joins (POL-HC-02, POL-APR-02), and $68,937 left is less than its
FY2027 impact (POL-FIN-01). It is blocked, and a submit is refused.

A shorter version for a cold room: type step 1 and step 2 as one message.

## 7. Publish the learned skill

`data/approval-history.jsonl` shows three Platform requests (REQ-2026-071, -093, -117) sent back for the
same thing: the role gets production access, and nobody said which systems, at what access level, or who
reviews it. Each send-back cost 7 to 8 days before resubmission, and the rule is not in `policies.md`. The package ships the
reviewed fix as `security-access-justification` in `skills.yaml`, granted to nobody.

**Publish it with one line.** In `examples/northstar/agents.yaml`, under Hana's `skills:`, uncomment:

```yaml
      - security-access-justification
```

Then restart OpenBot fully: `bash scripts/stop.sh && bash scripts/start.sh`. The package is read and its
grants applied only when the server boots, and `start.sh` alone keeps the running server, so without the
stop the skill does not appear. Commenting the line out again (and restarting) takes the grant back. To
publish without a restart, grant it from **Admin → Skills** instead.

Then show it in the OpenBot web app: pick `/headcount-request` and `/security-access-justification` in
the composer and ask for a Platform SRE. Hana asks which systems, what access level on each (read-only,
deploy or elevated) and who reviews it, adds a **Security and access** section to the business case
before anyone sends it back, and submits the answers as structured fields (`production_access`,
`on_call`, `access_reviewer`).

When you answer as Dana, say "deploy on the production clusters, elevated on the cloud accounts", not
"admin role" or "database credentials". Hana is told to translate those words, because OpenBot's safety
floor would otherwise hand the submit to you instead of running it (see Limits), but a hand-off on stage
costs you the beat.

Know what that line does and does not do. A package skill is an instruction a person picks with `/`
in the OpenBot composer. It is not added to every run, and Slack and Teams have no `/` menu. In the
workshop, the one-line grant stands in for publishing.

**In production, CopilotKit Intelligence's Automatic Learning does this from real threads**
([Intelligence](https://docs.copilotkit.ai/intelligence/overview), [Automatic Learning](https://docs.copilotkit.ai/learning)).
OpenBot assigns each Bot's conversations to a Learning container (`openbot` by default, under **Admin →
Automatic Learning**). Intelligence analyses completed threads (daily, by default once there are 15
eligible threads) and proposes a skill when a pattern repeats. A person reviews the supporting threads
in Intelligence and approves or rejects it, and nothing is published without that approval. OpenBot then
loads the published skill into that Bot's runs: OpenBot's docs say chat, channels, routines and
handoffs share these settings, so this is the route by which a learned rule reaches Slack and Teams with
no `/`. OpenBot runs the collection and the delivery. Intelligence does the analysis, the proposal and
the review screen. Because analysis runs on a schedule and needs enough threads, do not try to make it
propose this skill live in the session.

## 8. Adapt it to another function

The shape carries over to any request-and-approve workflow, such as procurement, travel, vendor
onboarding or access requests:

1. Replace `data/` with your function's rules and records, and `hr-system/model.ts` with the checks
   and arithmetic. Keep each answer naming the policy id it applied, and keep the submit computing every
   figure of record itself from structured inputs rather than accepting the model's.
2. Rewrite Hana's `system_prompt`: the intake fields, the order of the checks, the template and the
   quoted policy. Keep the three rules that make it trustworthy: no arithmetic in prose, cite the rule,
   and say so plainly when a tool is missing.
3. Rename the tools in `skills.yaml` and the server id in `connect.ts`. Keep the write behind an `ask`
   team rule, and keep tool and argument names off OpenBot's safety-floor list (see Limits): a
   procurement tool named `create_purchase_order` would be handed to the person on every call.
4. For a real system, point the coworker at its MCP server, or at Google Drive or Notion under
   **Connections**, instead of `hr-system/`. If your CopilotKit web app already has the agent, set
   `HEADCOUNT_WEB_AGENT_URL` to run that same agent as a coworker. It then gets only `role_description`
   from the package, and OpenBot can gate only the tools OpenBot itself holds.

## Limits to know before presenting

- **OpenBot's safety floor comes before every rule.** Before it reads any approval rule, OpenBot's gate
  matches the words of every action that is not a read against a fixed list in
  `server/src/approvals/policy.ts`: credentials (password, passcode, 2FA, MFA, OTP, one-time code,
  recovery code, API key, access token, credential), security settings (security settings, sharing
  settings, account security, admin role, grant admin, make public, delete account) and payments (pay,
  payment, billing, purchase, checkout, refund, wire, bank transfer, credit card, IBAN and similar). The
  words it reads are the tool name, the server id, every argument, and the call's target, **which
  includes the server's URL, so the tunnel hostname is part of what it matches**. A match is a
  hand-off: the person is told to do it themselves and the tool never runs. No team rule, personal rule
  or "Always allow" overrides it, and because every tool on a server added by URL is a write, lookups
  are checked too. That is why the submit takes access levels as `read_only`, `deploy` or `elevated`,
  why Hana is told to write "compensation" rather than "pay" and "elevated" rather than "admin role",
  and why `connect.ts` refuses a tunnel name the floor matches (a random name containing `pay` or
  `wire` would hand off every Northstar HR call, lookups included).
- **OpenTag pairing is on a branch.** You need OpenTag's `openbot-pairing` branch (draft PR #92), not
  `main`. On that branch, OpenBot's proactive sends (`POST /openbot/deliver`) and channel-membership
  checks are not implemented. As a result, the reply after an approval click, answers in shared
  channels, and Slack triggers do not arrive in Slack. They show as failed in OpenBot's delivery
  history. Demo in a DM, or in the web app.
- **The person approving in OpenBot is the person asking.** OpenBot's approval card asks the requester
  to allow the Bot's action, here the submit. Routing to Marcus, Priya and Elena is data inside Northstar
  HR. They do not get OpenBot approval cards, and nothing in OpenBot records their decisions.
- **The business case prose is not checked.** Northstar HR computes and stores the figures of record
  and the approver chain; it stores the business case as Hana wrote it. If the prose and `figures`
  disagree, `figures` is right.
- **The policy outcomes have different names in the code.** Approval rules behave as `allow`,
  `pre_approved`, `ask` or `hand_off`. The gate's outcomes are `allow`, `ask`, `hand_off` and `deny`,
  and the safety floor above produces a `hand_off` before any rule is consulted. Separately, **Admin →
  Boundaries** holds CEL `deny`/`allow` rules for browser, file and MCP actions. There is no outcome
  called "exempt".
- **`knowledge.yaml` reads nothing.** It accepts only Google Drive or OneDrive roots and is
  validated, not used, so the knowledge lives in the prompt and in Northstar HR.
- **`channels.yaml` is not Slack.** Package channels are OpenBot conversations. Today they have no
  members, so you reach Hana from the roster, and Slack and Teams come only through OpenTag.
- **No cost-breakdown component.** OpenBot's components are compiled into the app
  (`app/src/components/gallery/`) or authored in **Admin → Playground**. A tenant package cannot ship
  one, so this starter skips it. Hana answers in text that reads the same in Slack.
- **Northstar HR keeps requests in memory, and every one stays pending.** It has no approve or reject:
  the approvers decide in the real HR system, which it does not model. Each pending net-new request
  holds a slot in its quarter (`N left (M pending)`, POL-HC-02) and its FY2027 impact comes off the
  team's budget (POL-FIN-01) until the server restarts. A restart clears them and resets the counter to
  REQ-2027-015, and keeps the token. Its lead-time check uses today's date unless `NORTHSTAR_TODAY` is
  set. After 2026-12-03, a Q1 start fails the 60-day lead time.
- **The Slack path is unrehearsed.** The Slack replies in §5 and §6 are what OpenBot's and OpenTag's
  code say they are; this starter has not run them end to end.
