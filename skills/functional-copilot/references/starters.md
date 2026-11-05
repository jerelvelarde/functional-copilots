# Adapting a starter

Both workshop starters implement every layer of the functional agent stack with the same plumbing:
Next.js App Router, CopilotKit 1.84.1 (v2 API), one `BuiltInAgent`, frontend tools, human-in-the-loop
cards, a store both the human and the agent write, gates enforced in code, and a scripted mock model. The
plumbing is the five layers you keep. The domain content (data, checks, plan, panels, the learning
classifier, the mock's script) is the two layers you swap, and has to be rewritten. Each starter's README
has a "concept to file" table; read it first.

Both starters live in the workshop repo, under `starters/`; every `starters/...` and `src/...` path in
this skill is in the workshop repo, not in the user's. The repo's URL is at the top of the workshop
README. If you don't have the repo or the URL, ask the user; don't guess one.

Contents: Getting the starter · Open Harvey (review against a playbook) · Headcount (request → approval)
· Into an existing app

## Getting the starter

- **In the workshop repo:** copy the starter to a new folder named for the workflow, leaving out build
  output, design-tool files and any local secrets file:
  `rsync -a --exclude node_modules --exclude .next --exclude .impeccable --exclude '.env*.local' starters/<starter>/ <new-folder>/`,
  then `npm install` in the foreground. Never copy, open or print a `.env.local`: the user creates their
  own from `.env.example` and fills in the values themselves.
- **Elsewhere:** clone the workshop repo (its URL is at the top of the workshop README; ask the user if
  you don't have it, and don't guess one) and copy the starter from the clone the same way. Don't rebuild
  a starter from memory.
- **The mock's script:** both starters ship a long scripted demo (`src/lib/demo-script.ts`, several
  hundred lines). Don't rewrite it first. Build on the real model, then replace it with a short happy
  path of the spec's demo script for demos and tests.
- **Skills inside a Next.js app:** copy the suite's skill folders into `.claude/skills/`; don't
  symlink them from outside the project. Tailwind v4 follows the links when it scans for classes, and
  `next build` (Turbopack) fails with a file "outside configured roots". If you must link them, add
  `@source not "../../.claude";` (the path from `src/app/globals.css`) to the stylesheet.
- **State:** both keep everything in the browser (`localStorage`) and let one person act as every
  approver. Before more than one person uses the copilot, move the store to the server (SKILL.md, build
  step 8).

## Open Harvey: review against a playbook

`starters/open-harvey/`: a plan the user approves, a checklist the agent works live, cited findings,
editable redlines, routed approvals, a playbook that learns. Fits contract review, vendor onboarding,
security questionnaires, claims or compliance checks. Spec: `assets/worked-example-contract-review.md`.

**Keep (plumbing):** the route `src/app/api/copilotkit/[[...slug]]/route.ts`; the provider wiring in
`src/components/LegalApp.tsx`; the hook patterns in `src/copilot/` (plan and send cards, checklist tools,
generative UI, app context, edit queue, work rows, suggestion chips); the click handlers pattern in
`src/lib/gates.ts`; `src/lib/mock-model.ts`; and, if the spec uses it, the Intelligence switch
(`src/lib/intelligence.ts`, `src/lib/trajectory-events.ts`, `src/copilot/useDecisionEvents.ts`).

**Rewrite (domain content):**
- `src/data/`: the documents (`contracts/*.md` with stable passage ids), the structured terms beside them
  (`*.terms.json`), `playbook.md`, `review-history.jsonl` (seed it with the send-backs from the
  interview), `collection/`, and `company.json` (the people, and the pinned story date).
- `src/lib/review.ts`: one check per rule (`CHECKS`), re-checks of edited text (`RECHECKS`), routing
  (`routeApprovals`) and derived values (`totalContractValue`), and `LEARNED_CHECKS`. Write the tests in
  `review.test.ts` from the spec's worked examples first.
- `src/lib/plan.ts` (the tasks, in order, each tied to a rule), `src/lib/contract.ts` and
  `src/lib/matters.ts` (the document model), `src/lib/collection.ts` (the questions),
  `src/lib/agents.ts`, `src/lib/analytics.ts` (keep the decision log; rewrite the figures).
- `src/lib/learning.ts`: its reason classifier is legal keyword patterns with one rule template; rewrite
  the reasons and templates from the interview's send-backs.
- `src/lib/trajectory-events.ts`: rename the events after your workflow's decisions, and
  `DEFAULT_LEARNING_SPACE` in `src/lib/intelligence.ts`.
- `src/lib/agent-instructions.ts`, `src/copilot/chips.ts`, and `src/lib/demo-script.ts` (the mock's
  script, played end to end in `demo-script.test.ts`).
- `src/components/panels/` (review table, contract viewer, approvals, insights, analytics, playbook,
  collections, agents) and the shell's labels (`src/components/LegalApp.tsx`,
  `src/components/shell-state.ts`).

**Keep these tests' pattern:** `contract.test.ts` checks every quoted passage word for word against the
document, so a citation always highlights real text. Do the same for your documents.

**Gotchas:** the store persists to `localStorage` and discards a save that no longer matches the data,
with a console warning, so a changed state shape is safe; use **Reset demo** between runs. The legal names
in the store (matters, redlines) are domain vocabulary: rename them for a non-legal review rather than
leaving "redline" in an onboarding review.

## Headcount: request → approval

`starters/copilotkit-headcount/`: one editable request with derived numbers, a gated submit and a
sequential approval chain. Fits headcount, discounts, purchase requests, access requests, refunds.
Spec: `assets/worked-example-headcount.md`.

**Rewrite (domain content):**
- `src/data/` (the fixtures) and `src/lib/headcount.ts` (types, rules, cost model, and the
  `CURRENT_USER` / `CURRENT_TEAM` constants). Shape the new fixtures like the real systems of record.
- The `sync-data` script in `package.json` copies `../shared-data/*` over `src/data/`. Delete it and make
  `src/data/` the source of truth, or repoint it. Run as it is, it silently puts the headcount data back.
  Don't edit `../shared-data/` either: the OpenBot starter, the worked example and the deck share it.
- `src/lib/learning.ts`: its comment classifier is headcount regexes, with one hand-written skill
  template (`security_access`). Rewrite the reasons and templates from the interview's send-backs.
- `src/components/panels/`: `Insights.tsx` calls `getTeam()` and `personName()` while rendering, and both
  throw on ids that aren't in the fixtures, so new approval history crashes the tab until it is
  rewritten. `BusinessCase.tsx` and `TeamPlan.tsx` are headcount forms; `ApprovalsInbox.tsx` is a
  sequential chain (parallel approvals, quorum, delegates or escalation mean rewriting the store's
  approval model and the inbox).
- `src/lib/server-data.ts` (reads `policies.md` and `approval-history.jsonl`),
  `src/lib/agent-instructions.ts`, `src/copilot/useSuggestionChips.ts`, `src/copilot/useHeadcountTools.ts`
  and `src/lib/demo-script.ts` (the mock's script, played in `demo-script.test.ts`).

## Into an existing app

The user already has the internal tool: don't create a second app.

1. Copy the starter's `src/copilot/` and the catch-all route `src/app/api/copilotkit/[[...slug]]/route.ts`
   (a plain `route.ts` 404s on `/info` and `/agent/default/run`), plus `src/lib/agent-instructions.ts`,
   `src/lib/server-data.ts`, `src/lib/mock-model.ts` and `src/lib/demo-script.ts`.
2. Repoint their imports. They reach into the starter's domain code, which becomes yours:
   - Open Harvey: `src/lib/store.ts`, `matters.ts`, `agent-tools.ts`, `company.ts`, `review.ts`,
     `gates.ts`, `plan.ts`, `collection.ts`, `library.ts`, `app-context.ts`, and `src/components/ui/` and
     `src/components/shell-state.ts`.
   - Headcount: `src/lib/headcount.ts`, `src/lib/store.ts`, `src/lib/learning.ts` and
     `src/components/ui/`.
3. Install `@copilotkit/react-core`, `@copilotkit/runtime` and `zod` at the starter's exact versions (and
   `@ai-sdk/provider` if your package manager doesn't hoist it; the mock imports its types). Copy the
   variable names from `.env.example`; the user fills in the values.
4. Wire it: wrap the tool's UI in `<CopilotKitProvider runtimeUrl="/api/copilotkit">` inside a client
   component; render `<CopilotWiring />` and a chat (`CopilotChat`, `CopilotSidebar` or `CopilotPopup`)
   inside the provider; import `@copilotkit/react-core/v2/styles.css`; point the tools and context at the
   app's own store or API. Outside Next.js, the runtime has `@copilotkit/runtime/v2/express`, `/v2/hono`
   and `/v2/node` entry points.
