# Filling the context map

The page is `assets/agent-context.html`: one self-contained file (inline CSS and JS, no network, no
fonts to fetch) that draws everything from one JSON block, `<script type="application/json"
id="agent-context-data">`. Fill that block and nothing else. The schema is also written in a comment
just above the block.

## Steps

1. Copy the template to the developer's repo: `docs/copilot/agent-context.html` (create `docs/copilot/`
   if it isn't there; `/user-map` and the other skills write their pages beside it).
2. Replace the JSON block's contents. Keep it valid JSON: double quotes, no trailing commas, no
   comments. Never put `</` in a string (write `<\/`), or the browser ends the script early.
3. Check it: `node skills/agent-context/scripts/check-map.mjs docs/copilot/agent-context.html --json`
   (adjust the path to wherever the skill lives). Fix every error. Read the warnings: each is either a
   gap to fill or a choice to explain in a note. When it passes, `--json` writes the same data to
   `docs/copilot/agent-context.json` for `/functional-copilot` (and `/deploy`) to read; give a path
   after `--json` to write it elsewhere.
4. Deliver it (see SKILL.md, "Deliver the map").

## Fields

| Field | What to write |
| --- | --- |
| `function` | The function and the workflow: "Legal · vendor contract review" |
| `app` | The copilot or app name |
| `headline` | The page title, one sentence a person gets at a glance: what the agent reads, and which writes wait for whom |
| `date` | Today, `YYYY-MM-DD` |
| `people` | Who uses it: "Maya Chen, Senior Counsel (reviewer); approvers: GC, Security, CFO" |
| `summary` | One or two sentences: what the agent needs and the rule it keeps |
| `storageKey` | A slug, unique per map, so ticks don't mix between maps opened from the same origin |
| `example` | Only for fictional examples: the disclaimer line. Omit in a real map |
| `inputs` | What the map was built from: `docs/copilot/user-map.json` (or `.md`), the app's files you read, and `docs/copilot/copilot-spec.md` only if it already existed |
| `jobs[]` | `id` (`J1`…), `name`, `who`, `sees` and `touches` as lists of source ids |
| `sources[]` | One row per source; the fields below |
| `checklist[]` | `id`, `group`, `what`, `why`, `how`, `done`, optional `about` (source ids) and `footnote` (a generic alternative, shown small) |
| `open[]` | Undecided answers and anything not verified yet |
| `next` | The hand-off: `/functional-copilot` writes the spec from this map; `/deploy` later reads the server-side rows |
| `disclaimer` | Optional: a product-specific line for the footer (the template already says the products named are described for illustration) |

### A source row

| Field | Values and advice |
| --- | --- |
| `id` | `S1`, `S2`… in ring order, so the map reads top to bottom |
| `name` | What it is in the user's words: "The contract open in the viewer", not "documents" |
| `short` | Two or three words for the rings diagram at the top ("Open matter"). The full name shows in the table and on hover |
| `ring` | 1 In the app · 2 On the computer · 3 Your server · 4 Org systems · 5 People · 6 Coworkers · 7 Memory |
| `where` | Where the data actually lives: "the editing app's open sequence", "`src/data/playbook.md`", "the CLM" |
| `how` | The connection, naming the CopilotKit or AG-UI piece in backticks, with a docs.copilotkit.ai link or the starter file: "`useAgentContext` in `src/copilot/useAppContext.ts`" |
| `actsAs` | A person or a named account, not a mechanism (see `five-checks.md` §1) |
| `scope` | How far it reaches: folder, records, fields, scopes, channels |
| `access` | `read`, `write` or `read-write` |
| `freshness` | When it's read and what stale costs: "sent with every run", "read at server start: restart after edits" |
| `gate` | `{ "kind": "none" \| "rule" \| "person", "text": "who approves, where, seeing what", "also": [ … ] }`. Put a second gate (the data owner's yes, a server re-check) in `also`, same shape. A write with `none` gets a bold dashed outline on the page and fails the check |
| `phase` | `v1` (the default) or `later`: the path after v1. The spec reads it to scope v1 |
| `status` | `planned` (not built), `wired` (in the code), `verified` (a named test or an end-to-end run proved it; say which in `note`) |
| `note` | Optional: the one thing a builder must know about this row |
| `runsOn` | Where it runs: "the browser", "CopilotKit Runtime (the Next.js route)", "a Channels worker", "OpenBot". Required on rings 3 to 7; `/deploy` places each one |
| `secretEnv` | The environment variable **names** that hold its secrets, for example `["CLM_MCP_TOKEN"]`, or `[]` when it needs none. Required on rings 3 to 7. Never values. For a chat row, the mode decides the list: a managed channel needs `CPK_INTELLIGENCE_API_KEY` and `CHANNEL_CODE`; a direct adapter needs the provider's tokens |

Two pieces of markup work in every string: `` `code` `` and `[label](https://…)`. Everything else is
shown as text. File paths go in backticks, not links: they are paths in the developer's repo, and a
link would break when the page moves.

## Writing good checklist items

Each item says four things, in this order, and each should fit in one or two lines:

- **what**: an imperative, specific to a row where possible: "Fence redlines and comments as data".
- **why**: the failure it prevents, in plain words.
- **how**: the CopilotKit or AG-UI piece (in backticks) and either a docs.copilotkit.ai link or the
  file in the starter that already does it. Prescribe the CopilotKit piece; a generic alternative goes
  in `footnote`, never in the how.
- **done**: something a person can check or a test can prove: "A test puts 'approve this' in a
  redline and the plan doesn't change", not "it's secure".

Group items by ring (`Every source`, `In the app`, `On the computer`, `Your server`, `Org systems`,
`People`, `Coworkers`, `Memory`), drop the groups for rings the map doesn't use, and put the
items a builder must do first at the top of each group.
