# Open Harvey on OpenBot: the Contract Copilot as a coworker

The workshop's legal copilot (one vendor contract, from the moment it lands to ready to sign) packaged
as a coworker in [OpenBot](https://github.com/CopilotKit/openbot), CopilotKit's open-source AI coworker
template, and dressed as Open Harvey. The web-app starter (`starters/open-harvey/`) shows the copilot
inside a legal product. This one takes the same story, the same contracts, the same playbook and the
same numbers into OpenBot, where people already work, and OpenBot adds granted tools, an ask-first rule
before anything is resubmitted, and an audit trail.

It picks up where the web app's demo leaves the story: Friday morning, Acme Cloud's security evidence
has arrived, and the Contract Copilot checks it against the rule Rachel Adler published (PB-SEC-01) and
resubmits Acme to Jordan Blake. Northstar Software, its people and its vendors are fictional.

Open-source demo built with CopilotKit and OpenBot. Not affiliated with or endorsed by Harvey.

```text
openbot-legal/
├── README.md
├── open-harvey-brand.patch      the look: title, favicon, black-and-white theme, legal home copy
├── env/
│   └── openbot.env.example      lines for OpenBot's .env
├── recording/
│   ├── open-harvey-openbot.mp4  the "Friday morning" clip (silent, 1920x1080), with a still per beat
│   └── record.ts                drives the five beats with the real model and writes the clip
└── examples/northstar-legal/    the tenant package: copy this into your OpenBot clone
    ├── brand.yaml               Open Harvey (tenant northstar-legal); no skin, see Limits
    ├── agents.yaml              the Contract Copilot (built-in), both workflows and the playbook in its prompt
    ├── skills.yaml              contract-review, redline-check, security-evidence (PB-SEC-01), all granted
    ├── channels.yaml            one OpenBot channel, contract-review; Slack/Teams are not configured here
    ├── knowledge.yaml           required by the loader; empty, and why
    ├── model.yaml               OpenAI, gpt-5.4 (pick one your key can reach)
    ├── data/                    the web app's contracts, playbook and history (byte-identical copies), plus
    │                            Acme's security evidence and the Friday-morning state (ours, see data/README.md)
    └── legal-system/            "Northstar Legal": an MCP server for the review, the approvals and the evidence
        ├── server.ts            run it: bun examples/northstar-legal/legal-system/server.ts (port 4320)
        ├── tools.ts             the 11 tools, every count, route, verdict and refusal in tested code
        ├── evidence.ts          the PB-SEC-01 evidence check, four lines, pass or fail
        ├── state.ts, reset.ts   state in .state.json beside the server; reset.ts friday|fresh seeds it
        ├── token.ts             the server's bearer token, created once and reused on every restart
        ├── connect.ts           registers the server with OpenBot, grants it, adds the ask-first rule
        ├── local-https.ts       optional: a loopback-only https address instead of a public tunnel (§4)
        ├── lib/                 the web app's tested review, plan, redline and learning logic, copied
        └── *.test.ts            the worked example, the Friday state, the evidence check, the tools,
                                 the token, and every clip call through OpenBot's own safety floor
```

How the pieces divide the work:

- **The package is the coworker.** The Contract Copilot's system prompt holds both workflows (where a
  matter stands and the resubmit; the full review), the rule "never do arithmetic or state a number,
  risk, route or result no tool returned", and the playbook quoted with its rule ids (`PB-LIAB-01` and
  so on) plus PB-SEC-01 v1, so every finding can be cited.
- **Northstar Legal is the system of record.** It holds the matters, the passages, the deterministic
  review (7 deviations, 3 high risk, 5 passes for Acme), the total contract value, the route, every
  approver's decision and words, the security-evidence check and the (re)submission, as MCP tools. Its
  tools take ids (a matter, a finding ref `F1`…, a passage `§8.2`) and the person's own words, never a
  figure or a verdict from the model. It is a stand-in for your contract system. Swap it for a real
  one and only the tool names in `skills.yaml` change.
- **OpenBot is the governance.** The Contract Copilot can call only the tools it has been granted. A
  team approval rule makes `resubmit_for_approval` (and `send_for_approval`) ask a person first, and
  every lookup, decision and resubmission is written to the audit trail.
- **The patch is the look.** Open Harvey's name comes from the package; the title, favicon, theme and
  home copy are app code, so they ship as `open-harvey-brand.patch` (see Limits).

## Prerequisites

Check each line before the session. Finish this section and §1 to §4 beforehand: the first `start.sh`
builds OpenBot's Docker images, which takes a while on a fresh machine.

**Present it in OpenBot's web app** (<http://localhost:3010>). Every beat of the clip happens there.
Slack and Teams are not part of this starter (see the HR starter, `../openbot-headcount/README.md` §5,
for the OpenTag path and its limits).

- [ ] **Bun 1.4.3 or later.** `bun --version`. OpenBot's `package.json` pins `bun@1.4.3`, and its docs
  say some of its tests fail on 1.3. Install exactly the pinned version with
  `curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.3"`, or `bun upgrade` (latest stable). If Bun
  came from Homebrew, use `brew upgrade bun`.
- [ ] **Docker Desktop, running.** `docker info --format '{{.ServerVersion}}'` prints a version. An error
  about `docker.sock` or the Docker daemon means it is not running: start Docker Desktop and wait until
  it says it is running. `scripts/start.sh` brings up PostgreSQL and OpenBot's services with Compose.
- [ ] **Ports free**: OpenBot's 3001 and 3010, its Docker services, and Northstar Legal's 4320. This
  prints nothing when they are all free:
  ```sh
  lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3001|3010|5432|4100|4200|4201|4500|4320) '
  ```
  If it shows another OpenBot, run `bash scripts/stop.sh` in that checkout (it deletes nothing).
  `start.sh` treats any OpenBot already answering on 3001 as its own and does not start yours, so a
  server from another checkout would keep running with that checkout's package.
- [ ] **Node.js 22 or later** (`node --version`) for `npx`, plus `git`, `curl` and `lsof`.
- [ ] **A CopilotKit account and an Intelligence project** (a free plan is available). OpenBot keeps
  threads in Intelligence, so a conversation cannot run without its runtime key, and `start.sh` stops
  unless the key checks out. Managed Intelligence needs no `COPILOTKIT_LICENSE_TOKEN`.
- [ ] **An OpenAI API key** (`OPENAI_API_KEY`) **whose project can use the model in `model.yaml`.**
  The package ships `default_model: gpt-5.4`. A model id the key's project cannot access fails every
  turn ("does not have access to model ..."), so check the project's model list and change the line if
  you need to. To use Anthropic instead, edit `model.yaml`.
- [ ] **cloudflared**, to publish Northstar Legal over https: `brew install cloudflared`, then
  `cloudflared --version`. OpenBot adds an MCP server by URL only if it uses `https` and a public
  hostname. It refuses `http`, `localhost` and IP addresses.

## 1. Get OpenBot, brand it, add the package

From the folder that holds `openbot-legal`:

```sh
git clone https://github.com/CopilotKit/openbot.git open-harvey-openbot
cd open-harvey-openbot
git checkout af42cc6f                                    # the commit this starter was built and recorded on
git apply ../openbot-legal/open-harvey-brand.patch       # Open Harvey's look (app/ only)
cp -R ../openbot-legal/examples/northstar-legal examples/
cp .env.example .env
bun install
```

OpenBot's `main` moves every day. `af42cc6f` (2026-11-04) is the commit the patch applies to and the
package, `connect.ts` and these steps were checked against, so present from it. If `git apply` refuses,
you are on another commit.

Clone into a folder that has not run OpenBot before. Compose names the database volume after the
folder, and a package does not remove Bots that an earlier package already registered.

## 2. Configure `.env`

Set the lines from [`env/openbot.env.example`](env/openbot.env.example). The ones that matter:

```dotenv
TENANT_PACKAGE_DIR=../examples/northstar-legal   # selects the package; relative to server/
OPENAI_API_KEY=sk-...
```

Then provision Intelligence:

```sh
npx --yes copilotkit@latest login
npx --yes copilotkit@latest project select
bun scripts/setup-learning.ts
```

`project select` writes the runtime key into `.env` as `CPK_INTELLIGENCE_API_KEY`, and
`setup-learning.ts` creates or reuses the `openbot` Learning container.

`OPENBOT_SINGLE_USER=true` (already in `.env.example`) makes you the one administrator on localhost,
which `connect.ts` relies on. Right for a laptop; turn it off anywhere other people can reach.

## 3. Run OpenBot

```sh
bash scripts/start.sh        # Docker services, migrations, API on :3001, app on :3010
```

The server validates the package at startup and stops with a sentence naming the file and the field if
something is wrong. Open <http://localhost:3010>: the app reads **Open Harvey**, and the **Contract
Copilot** is in the roster with three skills. Under **Settings → Standing instructions**, write
`I am Maya Chen, Senior Counsel at Northstar Software.` so the copilot knows who it works for.

**After changing `.env`, the package or the patch, restart OpenBot fully:**

```sh
bash scripts/stop.sh && bash scripts/start.sh
```

`start.sh` on its own leaves an API server that already answers as OpenBot running, and the server
reads `.env` and the package only when it boots. `stop.sh` deletes nothing.

## 4. Start Northstar Legal and connect it

From the OpenBot root, in three terminals:

```sh
# 1. seed the clip's state (Friday 2026-11-06, 09:00), then start the legal system on :4320
bun examples/northstar-legal/legal-system/reset.ts friday
bun examples/northstar-legal/legal-system/server.ts

# 2. a public https address for it
cloudflared tunnel --url http://127.0.0.1:4320

# 3. register it with OpenBot (the trycloudflare URL the tunnel printed, plus /mcp)
NORTHSTAR_LEGAL_URL=https://<name>.trycloudflare.com/mcp bun examples/northstar-legal/legal-system/connect.ts
```

Northstar Legal requires a bearer token on every call. The first start creates one in
`examples/northstar-legal/legal-system/.env.northstar-legal` and every later start reuses it, so
**restarting Northstar Legal does not break OpenBot's connection**. `connect.ts` reads the same file.
OpenBot's `.gitignore` already ignores `.env.*`. (To hold the token yourself, set
`NORTHSTAR_LEGAL_TOKEN` for both commands.)

Its state (the route, the decisions, redlines, reasons, the evidence) lives in
`legal-system/.state.json` and survives a restart. `reset.ts friday` writes the clip's starting point:
Acme submitted on Thursday, Rachel Adler approved, Jordan Blake sent it back with his words, Elena Ortiz
queued, PB-SEC-01 v1 published by Rachel Adler, Acme's evidence received Friday at 08:50.
`reset.ts fresh` writes an unreviewed Acme and Brightwater with no published rule, for §6. The server
reads `.state.json` on every call, so **between takes run `reset.ts` while it keeps running**, and open a
new conversation with the Contract Copilot. The token survives, so OpenBot needs nothing.

`connect.ts` first checks the tunnel address against OpenBot's safety floor (see Limits) and refuses one
that matches, because then OpenBot would hand every Northstar Legal call to you instead of running it.
If that happens, stop `cloudflared`, start it again for a new random name, and rerun `connect.ts`. Then
it uses OpenBot's own admin API, so every step is audited: it stores the token as an `mcp` credential,
adds the server as `northstar-legal`, grants its 11 tools to the Contract Copilot, and adds the team
approval rule that makes `send_for_approval` and `resubmit_for_approval` ask. Nothing else asks. You can
see the rule under **Admin → Approvals**; team rules show to members as locked rows, so a person's own
"Always allow" cannot switch it off.

A quick tunnel gets a new address each time it starts. Run `connect.ts` again with the new URL: it is
safe to rerun.

### No public tunnel? A loopback-only https address (what the recording used)

A tunnel publishes your laptop's port to the internet. If you can't or don't want that, serve Northstar
Legal at `https://legal.localtest.me:4321` instead. `legal.localtest.me` is a public DNS name that
resolves to 127.0.0.1 and ::1, so it passes OpenBot's "https at a dotted public hostname" rule while
everything stays on this machine. `local-https.ts` listens on loopback only and forwards to `:4320`. Its
certificate comes from a throwaway local CA that only OpenBot's server process trusts
(`NODE_EXTRA_CA_CERTS`); the system trust store is not touched.

```sh
bun examples/northstar-legal/legal-system/local-https.ts cert     # once
bun examples/northstar-legal/legal-system/local-https.ts          # leave running, beside server.ts
bash scripts/stop.sh                                               # start.sh keeps a running server
NODE_EXTRA_CA_CERTS=$PWD/examples/northstar-legal/legal-system/.local-https/ca.pem bash scripts/start.sh
NORTHSTAR_LEGAL_URL=https://legal.localtest.me:4321/mcp bun examples/northstar-legal/legal-system/connect.ts
```

This works because OpenBot's API server, which makes the MCP calls, runs on the host rather than in a
container. It is for a laptop demo only: in a deployment, use a real hostname and certificate.

The legal system's tests run from the OpenBot root with `bun test examples/northstar-legal/legal-system`.
Inside an OpenBot clone that includes `safety-floor.test.ts`, which runs every argument the clip sends
through OpenBot's own safety floor; anywhere else it is skipped.

## 5. The clip: "Friday morning"

Silent, about two and a quarter minutes, narrated live. It starts where the web app's Learn segment
ends. Before each take: `reset.ts friday`, and a new conversation with the Contract Copilot. The
figures, dates and words below are what the tools return. The copilot quotes them and works none of
them out.

1. **Open Harvey, in OpenBot.** The home page: black and white, the Open Harvey name, "Hi Maya Chen,
   which contract are we working on?", "Your Contract Copilot reviews against Northstar's playbook" and
   the disclaimer line. **Maya:** `Where are we on Acme?`
   **Contract Copilot** (from `get_approval_status`): Acme Cloud · Master Services Agreement; Rachel
   Adler, General Counsel: Approved, Thu Nov 5, 11:20 am; Jordan Blake, Head of Security: Sent back,
   Thu Nov 5, 2:05 pm, quoted exactly: "Ask Acme for their SOC 2 Type II report and latest pen-test
   summary before we sign. We need this whenever a vendor holds customer data."; Elena Ortiz, Chief
   Financial Officer: Queued; what arrived since: Acme Cloud's SOC 2 Type II report and pen-test
   summary, Fri Nov 6, 8:50 am; next: resubmit to Jordan Blake.
2. **The check. Maya:** `Check Acme's evidence against PB-SEC-01 and resubmit it to Jordan.`
   **Contract Copilot** calls `check_security_evidence` and shows a table card (Check | Result | Rule |
   Detail), "Acme Cloud: PB-SEC-01 v1 security evidence", captioned "Published by Rachel Adler": SOC 2
   Type II report on file, Audit period ended within 12 months, Pen test completed within 12 months, No
   open critical or high findings, each **Pass**, each PB-SEC-01. Northstar Legal decided every line in
   code. Then it calls `resubmit_for_approval`, and the team rule makes OpenBot ask first: the step
   waits in the thread.
3. **The ask-first rule.** The **Bots** item in the sidebar shows a badge. Bots → **Needs you**:
   "Resubmit for approval · Northstar Legal · A rule asks before this kind of action", the arguments
   (`{"matterId": "acme-msa"}`), **Deny** / **Allow**. Nothing has reached Northstar Legal yet. Click
   **Allow**, then go back to the conversation: "All 4 PB-SEC-01 checks pass. Resubmitted to Jordan
   Blake with the evidence. Elena Ortiz is next. Nothing goes to Acme Cloud until all three approve."
   (At af42cc6f the web app shows an MCP tool's approval on the Needs you board, not inline in the
   thread.)
4. **Admin → Audit.** Each Northstar Legal call (`mcp.call_succeeded`), the gate's verdicts
   (`approval.evaluated`), Maya's decision (`approval.person_decided`, Allowed) and the resubmit, each
   with its time, Bot and person. **Export CSV** takes it out.
5. **The Contract Copilot's Skills and access** (`/bots/contract-copilot/access`): Northstar Legal, 11
   tools, and three skills, including "Check security evidence (PB-SEC-01)": the rule Rachel Adler
   published, now a skill the coworker holds. Then its **Approval rules**
   (`/bots/contract-copilot/approvals`): the locked team rule `northstar-legal/*_for_approval` that asked.

`recording/record.ts` drives all five beats in a headless Chromium with the real model and writes the
MP4 and a still per beat. It resets Northstar Legal to Friday and deletes earlier conversations first
(through the app's own "Delete conversation" API), shows model waits at 1.5x, and holds each result long
enough to narrate. Run it from the OpenBot root: `bun ../<workshop>/starters/openbot-legal/recording/record.ts <outDir>`.

## 6. The full review (try it yourself)

The same coworker runs the web app's whole review. Stop Northstar Legal, run
`bun examples/northstar-legal/legal-system/reset.ts fresh`, start it again, and open a new conversation.

1. **Maya:** `Review the Acme Cloud MSA and get it ready to sign.` The copilot calls `propose_plan` and
   shows the 17 tasks as a checklist card, then an approval card, **Approve plan** / **Not yet**.
   Nothing runs before the click.
2. **Approve plan.** It calls `review_contract` and shows every check in a table: 7 deviations, 3 high
   risk (§8.2 liability cap, §6.1 no DPA, §6.4 10-day breach notice), 5 passes; $720,000 total contract
   value; route Rachel Adler → Jordan Blake → Elena Ortiz ($720,000 is over the $500,000 line).
3. **Maya's own clause:** `Use this for the §8.2 redline: Each party's total liability arising out of
   or relating to this Agreement will not exceed the fees paid by Northstar in the six (6) months
   before the event giving rise to the claim, except that liability for data-protection breaches is
   capped at $1,000,000.` It calls `set_redline` with the finding's ref and her words, reports that
   PB-LIAB-01 still deviates, keeps her clause, and asks only for the reason Rachel Adler needs.
4. `Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about.` then
   `Send it for approval.` It records the reason (`set_reason`), and `send_for_approval` asks first
   (Bots → **Needs you**, **Allow** / **Deny**). After you allow it, it replies in the conversation with Northstar Legal's message: sent to
   Rachel Adler, Jordan Blake and Elena Ortiz, Rachel Adler first, and nothing goes to Acme Cloud until
   all three approve.

In the composer, `/contract-review`, `/redline-check` and `/security-evidence` pick a skill explicitly.
On the Friday seed, `Review the Brightwater Metrics order form.` gives an 18-task plan: one task comes
from the rule Rachel Adler published.

## 7. Adapt it to your own contracts

1. Replace `data/` with your playbook and contracts, and `legal-system/` with your own checks. Keep
   every finding naming its rule id and its passage, and keep every count, sum, route and verdict in
   code, never in the model.
2. Rewrite the Contract Copilot's `system_prompt`: your playbook, quoted with its ids, and your flows.
   Keep the rules that make it trustworthy: no arithmetic in prose, cite the rule and the passage, quote
   people's words exactly, and say so plainly when a tool is missing.
3. Rename the tools in `skills.yaml` and the server id in `connect.ts`. Keep every write that leaves
   the legal team behind an `ask` team rule, and keep rule ids and contract text out of tool arguments
   (see Limits).
4. For a real system, point the coworker at its MCP server, or at Google Drive or SharePoint under
   **Connections**, instead of `legal-system/`.

## Limits to know before presenting

- **OpenBot's safety floor comes before every rule, and legal text trips it easily.** Before it reads
  any approval rule, OpenBot's gate matches the words of every action that is not a read against a
  fixed list in `server/src/approvals/policy.ts`: credentials (password, passcode, 2FA, MFA, OTP,
  recovery code, API key, access token, credential), security settings (security settings, sharing
  settings, account security, admin role, grant admin, make public, delete account) and payments (pay,
  payment, billing, purchase, checkout, refund, wire, bank transfer, credit card, IBAN and similar). It
  reads the tool name, the server id, every argument and the call's target, **which includes the
  tunnel hostname**. A match is a hand-off: the person is told to do it themselves and the tool never
  runs, and no rule overrides it. Every tool on a server added by URL counts as a write, so lookups are
  checked too. So:
  - **A redline or reason that mentions payment or billing is handed to the person, not run.** A
    redline for Acme's net-15 term written as "Payment is due net 45 days", "Northstar will pay
    invoices net 45" or a reason such as "Billing runs on a 30-day cycle" never reaches Northstar Legal.
    "Invoices are due net 45 days from the invoice date" does. The copilot is told not to reword your
    text itself but to tell you and offer a wording without the word.
  - **Rule ids never go into tool arguments.** "PB-PAY-01" matches "pay". That is why the tools take
    finding refs (`F1`…) and passage ids (`§8.2`), and the rule ids appear only in their results.
  - **`connect.ts` refuses a tunnel name the floor matches** (a random name containing `pay` or `wire`
    would hand off every call, lookups included). Restart `cloudflared` for a new name.
  - The clip's own arguments are checked against OpenBot's function in `safety-floor.test.ts`.
- **Only the requester approves inside OpenBot.** OpenBot's approval card asks the person talking to
  the coworker (Maya) to allow its action. Rachel Adler, Jordan Blake and Elena Ortiz's decisions live
  in Northstar Legal: they get no OpenBot approval cards, and nothing in OpenBot records their
  decisions. The Friday state seeds Rachel's approval and Jordan's send-back.
- **`send_for_approval` asks whatever the rules say.** Its name contains "send", and OpenBot always asks
  before sending something to other people (**Allow** / **Deny** on the Needs you board, never
  "Always allow").
  `resubmit_for_approval` asks because of `connect.ts`'s team rule.
- **No PDF or Word.** Northstar Legal serves the two contracts in `data/contracts/` as text with their
  deal terms. There is no upload, document store, matters page or redline card in this starter.
- **The look needs the patch.** A package's `theme.css` is validated at startup and applied by nothing,
  so the title, favicon, black-and-white theme and legal home copy are app code in
  `open-harvey-brand.patch`, made against `af42cc6f`. Only `product_name` ("Open Harvey") comes from the
  package, and `scripts/generate-app-config.ts` bakes it into the app when the app starts or is built,
  so restart fully after changing it.
- **The model id must be one your OpenAI project can access.** `model.yaml` ships `gpt-5.4`. An id the
  project cannot use fails every turn; change `default_model` and restart fully.
- **Northstar Legal keeps its own calendar.** The clip's state says it is Friday 2026-11-06, 09:00,
  whatever today is, so "this morning" means Northstar Legal's morning. `reset.ts` puts it back.
- **Skills are instructions picked with `/`.** A package skill reaches the model when somebody picks it
  in the web composer; it is not added to every run. That is why the system prompt carries both
  workflows. Once a Bot holds more than 12 granted tools, OpenBot also offers each run only the tools of
  the skills it picks for that message, so each skill here declares every tool its flow needs.
- **`knowledge.yaml` reads nothing** and **`channels.yaml` is not Slack.** The knowledge lives in the
  prompt and in Northstar Legal; package channels are OpenBot conversations, so you reach the Contract
  Copilot from the roster.
