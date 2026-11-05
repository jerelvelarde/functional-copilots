# Headcount copilot: a CopilotKit starter

A functional copilot for one real workflow: getting a hire approved. Dana Kim, Director of Platform
Infrastructure at Northstar Software (fictional), asks for a senior engineer in New York. The copilot fills
in the business case, checks it against the FY2027 plan and the written policy, shows the cost, routes it
to the right approvers, and only submits when Dana clicks Submit. Later, it learns from approvers'
send-backs, but only after a person publishes the lesson.

Built for the CopilotKit workshop *Building Enterprise-Ready Functional Copilots* (Thu Nov 5 2026,
10am PT). Next.js App Router, CopilotKit 1.84 (v2 API), AG-UI, one `BuiltInAgent` on `gpt-5.4-mini`.

## Run it

```bash
# 1. clone the workshop repo, then
cd starters/copilotkit-headcount

# 2. add your OpenAI key (optional: without one, the chat runs on a scripted mock)
cp .env.example .env.local        # then set OPENAI_API_KEY in .env.local
                                  # optional: COPILOT_MODEL if your key can't reach gpt-5.4-mini

# 3. install and start
npm install && npm run dev        # http://localhost:3100
```

**Localhost only, on purpose.** `npm run dev` and `npm start` listen on 127.0.0.1. The runtime endpoint
(`/api/copilotkit`) has no auth: anyone who can reach it can run the agent on your model key. Put it
behind your app's auth before you deploy it anywhere.

**Telemetry.** The CopilotKit runtime sends usage telemetry to CopilotKit by default (it says so on
startup), including the error message when an agent run fails. To turn it off, set
`COPILOTKIT_TELEMETRY_DISABLED=true` (or `DO_NOT_TRACK=1`) in `.env.local`. See
https://docs.copilotkit.ai/telemetry.

**`npm audit` warnings.** `npm install` reports known vulnerabilities (33 at the time of writing). They
come through the dependencies of `@copilotkit/runtime` (and `@copilotkit/react-core`, which shares some):
`undici`, `@fastify/busboy`, `graphql-scalars` and others, plus `zod` 3, which the tool schemas here use
too. They matter little on localhost; check `npm audit` before you deploy.

**No key? It runs on a scripted mock.** Without `OPENAI_API_KEY`, or with `COPILOT_MODEL=mock`, the agent
runs on `src/lib/mock-model.ts`: a stand-in model that plays the demo script below with no network. The
runtime, the AG-UI events, the tools and the cards are the same; only the model is scripted, and the chat
header says *mock · scripted demo*. It understands the demo sentences and the suggestion chips; anything
else gets the list of sentences. Use it to rehearse, or as a fallback if the network fails on stage.

`npm test` runs the unit tests for every number below, and plays the whole demo script against the mock.

## Demo script

Start from a clean slate with **Reset demo** (top right). Type the lines in quotes into the chat, or click
the matching suggestion chip.

1. **The ask.** "I need approval to hire a senior engineer in New York next quarter."
   The copilot checks the plan (Q1: 2 approved, 1 opened, **1 left**, POL-HC-02) and the band (L5 Tier 1,
   $185,000 to $240,000, midpoint **$212,000**), then starts REQ-2027-021 in the Business case: role
   title, L5, New York, Q1 FY2027 and the midpoint as base (tagged *filled by copilot*). It shows two
   cards: the cost breakdown (**$343,920** a year fully loaded, **$334,260** FY2027 impact, $85,740 of the
   $420,000 left) and the live policy check. It asks for what it cannot infer: request type and a
   two-sentence justification (POL-HC-01).
2. **The details.** "Net-new. It unblocks the multi-region failover work planned for Q2. Without it,
   on-call stays on four people and failover slips to Q4."
   It writes Net-new and your justification into the Business case and re-checks. The policy card turns
   to **Ready to submit** (Marcus Lee, then Priya Raman; no CFO), and the copilot asks whether to submit.
   It does not open the approval card until you ask (step 4).
3. **The live edit.** In the Business case, change **Base salary** to `225000` and press Enter.
   The panel recomputes at once: **$362,250** run-rate, **$351,063** FY2027 impact, and **Elena Ortiz (CFO)**
   joins the chain. The edit reaches the copilot as the message "I changed base salary from $212,000 to
   $225,000.", which the chat shows as a quiet event row ("You changed base salary $212,000 → $225,000 ·
   Saw your edit · re-checked"), and the copilot, without being asked, re-checks: above the midpoint needs a one-line reason (POL-COMP-01), over $350,000
   adds the CFO (POL-APR-02). Answer: "Competing offer at $230,000." (If the copilot is still replying,
   or an approval card is waiting, the edit is queued and sent as soon as it is free.)
4. **Human in the loop.** "Submit it." The copilot shows "Submit REQ-2027-021 for approval?" with where it
   goes and why, and **Submit for approval** and **Keep editing**. Nothing is submitted until you click
   Submit for approval; the card then folds into a one-line receipt and the Approvals tab opens.
5. **Approvals.** Act as Marcus: **Approve**. Act as Priya: write "What production access does this role
   get? Security will ask." and **Send back**. (Leave **Reopen** alone until after step 7: with the
   sent-back request open, step 7's copilot asks you to submit, discard or keep editing it first.)
6. **Learning later.** Open **Insights**. Platform requests keep coming back for a missing security and
   access justification: 3 times in `approval-history.jsonl`, each adding 7 to 8 days before the request
   was resubmitted, plus yours (this session, no days yet). Read the proposed skill and its evidence
   (request ids and comments), then click **Publish to the copilot**. The step-7 chip appears now.
7. **The next request.** "I need approval to hire a senior SRE in Austin in Q2."
   The new business case has a **Security and access** section, and the copilot drafts it without being
   asked. The policy check has a row for the skill (`skill-security-access v1`): clear the section and
   Submit is blocked again. (L5 Austin: $195,000 midpoint, $319,950 run-rate, $232,300 FY2027 impact.
   REQ-2027-021 was sent back, not approved, so the budget left is still $420,000.)

## Concept to file

| Concept | File |
| --- | --- |
| Connect app and agent: one runtime, one `BuiltInAgent`, AG-UI over `/api/copilotkit` | `src/app/api/copilotkit/[[...slug]]/route.ts`, `src/components/HeadcountApp.tsx` |
| Swap the model: a scripted `LanguageModelV3` mock, picked when there is no key | `src/lib/mock-model.ts`, `src/lib/demo-script.ts` (tested against the real tools), `src/lib/server-data.ts` |
| The agent's instructions and the written policy | `src/lib/agent-instructions.ts` |
| Business logic as pure functions (cost model, plan fit, budget, band, approvers, policy check) | `src/lib/headcount.ts`, tested in `headcount.test.ts` |
| App context: who the user is, the dates, the plan, the draft, approvals, published skills (`useAgentContext`) | `src/copilot/useAppContext.ts`, built in `src/lib/app-context.ts` |
| Frontend tools: `getHeadcountPlan`, `getCompBand`, `calculateCost`, `checkPolicy`, `startRequest`, `updateRequest` (`useFrontendTool`) | `src/copilot/useHeadcountTools.ts`, handlers in `src/lib/agent-tools.ts` |
| Generative UI: cost card (snapshot), policy card (live) and the re-check card after a human edit (`useComponent`) | `src/copilot/useGenerativeUI.tsx` |
| Human in the loop: `submitForApproval` (`useHumanInTheLoop`) | `src/copilot/useSubmitForApproval.tsx` |
| Shared state, two writers: one store for draft, requests and skills | `src/lib/store.ts` |
| Editable shared state, the human side | `src/components/panels/BusinessCase.tsx` |
| The agent notices human edits (`useAgent` + `useCopilotKit`), queued while it is busy | `src/copilot/useTellCopilot.ts`, `src/copilot/edit-queue.ts` (tested) |
| Approvals stay with people | `src/components/panels/ApprovalsInbox.tsx` |
| Learning from production, human-reviewed skills | `src/lib/learning.ts` (tested), `src/components/panels/Insights.tsx` |
| Suggestions that follow the draft (`useConfigureSuggestions`, pinned above the composer) | `src/copilot/useSuggestionChips.ts`, `src/copilot/chips.ts` (tested against the mock) |
| The agent's work as rows: CopilotChat's `"turn"` tool-call display, one wildcard `useRenderTool` with `group: true` | `src/copilot/useWorkRows.tsx`, `src/copilot/ChatPanel.tsx` |
| A human edit shown as an event row, not a bubble (CopilotChat's `userMessage` slot) | `src/copilot/ChatUserMessage.tsx`, `src/copilot/edit-queue.ts` (tested) |
| The approval seal: checks and signatures drawn from live state | `src/components/ui/ApprovalSeal.tsx` |

Everything CopilotKit-specific lives in `src/copilot/` and the route. The rest is an ordinary React app.

## Choices worth knowing

- **The model never does arithmetic.** Tools, cards and the panel all call the same pure functions. The
  cost card takes inputs (level, base, quarter) and computes; the policy card takes a request id and reads
  the store. Dates too: "next quarter" and the earliest start the lead time allows are in the context.
- **Rules that must hold are in code, not only in the prompt.** `startRequest` refuses while another
  request is open, so a new hire never overwrites one. `updateRequest` never changes a field the user set
  unless the call says the user asked; it returns the fields it refused so the agent asks. A published
  skill that asks for a section adds a row to the policy check (citing the skill's id and version) that
  blocks submission until the section is filled.
- **Text people typed is data.** The draft's free-text fields and approvers' comments reach the agent
  under `quotedText`, labelled as quoted data, never instructions.
- **Human edits reach the agent as a message, not as AG-UI shared state.** `BuiltInAgent` in 1.84.1 does
  support `state`: it puts it in the system prompt and gives the model `AGUISendStateSnapshot` /
  `AGUISendStateDelta` tools. But a state change does not start a run, so the agent would not react to
  Dana's edit, and its writes would be untyped JSON patches. Instead the draft lives in an app store; the
  agent reads it through `useAgentContext`, writes it through the typed `updateRequest` tool, and each
  committed human edit is posted with `agent.addMessage(...)` plus `copilotkit.runAgent({ agent })`. Edits
  made while the agent is mid-turn, or while an approval card waits, are queued (latest value per field)
  and sent as one message as soon as it is idle.
- **Generative UI is called directly.** `useComponent` registers each card as a tool the model calls; there
  is no backend tool that tells the model to render something.
- **Lessons are proposed offline and published by a person.** The Insights panel groups comments with a
  keyword classifier and fills a hand-written template, so the demo runs the same every time. Published
  skills go to the agent as context and persist in localStorage. In production, CopilotKit Intelligence's
  Automatic Learning proposes skills from real threads, with the same human review:
  https://docs.copilotkit.ai/intelligence/overview
- **The story date is pinned** to 2026-11-05 (`STORY_DATE` in `headcount.ts`), so the 60-day lead time
  (POL-HC-04) passes whenever you run the demo, and submissions and decisions are dated on that clock.
- **Budget.** "Committed" is the plan's figure plus requests fully approved in this session (POL-FIN-01);
  pending and sent-back requests are not counted. Approved requests are not written back to the quarter
  slots.
- **Saved state is checked on load.** The demo persists in localStorage. A save that no longer matches
  the data (say, a renamed location) is discarded with a console warning, and an error boundary keeps
  **Reset demo** on screen if a panel ever crashes.
- **Chat styles are imported explicitly** (`@copilotkit/react-core/v2/styles.css` in `layout.tsx`).
- **The CopilotKit Inspector is off** for a clean screen. Set `enableInspector` in `HeadcountApp.tsx` to
  watch the AG-UI event stream.

## Make it yours

- **Data.** `../shared-data` is the source of truth; `src/data` holds unchanged copies. After editing the
  shared files, run `npm run sync-data`.
- **Your function.** Swap the data, the pure functions in `src/lib/headcount.ts` and the tools in
  `src/copilot/useHeadcountTools.ts` for your own workflow (procurement, discounts, access requests...).
  The walkthrough is in [`../../skills/functional-copilot/`](../../skills/functional-copilot/).
- **Slack and Teams.** The same story as a bot in the channels people already use:
  [`../openbot-headcount`](../openbot-headcount).
