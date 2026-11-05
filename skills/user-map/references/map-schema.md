# The map file: `docs/copilot/user-map.json`

One JSON object. The build script checks it, then writes the HTML page and the markdown summary from it.
For a full example, start from `examples/legal-contract-review.json` (a copilot that already exists,
mostly sourced) or `examples/video-editor.json` (a proposal, mostly assumed).

## Evidence, on every item

Most objects carry evidence fields:

| Field | Values | Meaning |
| --- | --- | --- |
| `ev` | `"sourced"` | Backed by the sources whose ids are in `src` |
| | `"assumed"` | Your judgement, not checked yet |
| | `"confirmed"` | A real user or the developer said so; put who in `by` |
| `src` | `[1, 3]` | Source ids, required when `ev` is `"sourced"` |
| `by` | `"Two editors, 2026-11-06"` | Who confirmed it |

## Fields

```jsonc
{
  "schema": "user-map/1",
  "meta": {
    "role": "Video editor",                      // who does the work (title shows "<role> in <app>")
    "function": "Post-production",               // department or function
    "app": "Premiere Pro",                        // the software they work in
    "route": "plugin",                            // own-app | embedded | plugin | chat (Step 1, question 3); chat switches the placement rows
    "shape": "workspace assist",                  // the first job's shape, one of /functional-copilot's five (see SKILL.md, Step 3)
    "building": "A panel inside the editing app…",  // that route, in words; no trailing full stop
    "disclaimer": "…",                             // optional extra footer line, e.g. Open Harvey's non-affiliation line
    "date": "2026-11-05",
    "preparedFor": "…",                            // optional
    "research": "web",                            // "web" or "no-web"
    "exists": false,                              // true when the copilot is already in the repo: the map checks it, step 07 becomes a verify checklist
    "headline": "An editing copilot that lives in the timeline",   // 5–9 words: the page's one headline
    "path": {                                     // the three cards at the top, one short line each (< 95 chars)
      "role": "Turns hours of footage into a cut that a producer approves",
      "software": "Timeline editor: media bins, source and program monitors, timeline, inspector",
      "copilot": "A panel under the inspector; its proposed cut lands on a ghost track"
    },
    "oneLine": "An editing copilot that lives in …, reads …, does …, and waits for … before …"   // below the fold
  },
  "role": {
    "summary": "…",
    "measuredOn": [{ "text": "…", "ev": "…" }],
    "day": [{ "label": "…", "share": 25, "ev": "assumed" }],     // shares add up to about 100
    "people": [{ "name": "…", "relation": "…", "ev": "…" }]       // who they hand off to or wait on
  },
  "software": {
    "primary": { "name": "…", "why": "…", "ev": "…" },
    "around": [{ "name": "…", "why": "…", "ev": "…" }],
    "pattern": { "name": "Timeline editor", "summary": "…", "object": "…", "selection": "…", "open": "…", "ev": "…" },
    "layout": { "columns": "1fr 1.3fr 1.3fr 1fr", "rows": "1fr 1fr",
                "areas": ["bins source program inspector", "bins timeline timeline copilot"] },
    "regions": [
      { "id": "bins", "name": "Media bins", "holds": "…", "does": "…", "ev": "…" },
      { "id": "copilot", "name": "Copilot panel", "holds": "…", "does": "…", "new": true, "ev": "assumed" }
    ]
  },
  "jobs": [
    { "id": "J1", "when": "footage lands…", "want": "every clip…", "so": "start on the story…",
      "often": "Every project", "pain": "…", "first": true, "ev": "…" }   // exactly one "first"
  ],
  "flows": [
    { "id": "F1", "name": "…", "trigger": "…", "outcome": "…",
      "steps": [
        { "who": "Editor", "region": "timeline", "what": "…", "time": "Days", "weight": 8, "kind": "work", "ev": "…" },
        { "who": "Producer", "place": "Frame.io", "what": "…", "time": "A day", "weight": 4, "kind": "approval", "ev": "…" }
      ],
      "timeGoes": "Where the time really goes, in one line",
      "write": { "what": "The approved cut, exported as the master", "system": "the delivery platform", "who": "The editor, after the producer approves", "ev": "assumed" } }   // the write after the last approval (first flow)
  ],
  "placement": {
    "surface": { "region": "copilot", "also": ["timeline", "bins"], "text": "…", "notThis": "…", "ev": "…" },
    "reads":   [{ "text": "…", "detail": "…", "ev": "…" }],
    "does":    [{ "name": "findTakes", "text": "…", "ev": "…" }],
    "renders": [{ "name": "showTakes", "text": "…", "ev": "…" }],
    "waits":   [{ "name": "applyToSequence", "text": "…", "ev": "…" }],
    "shared":  [{ "text": "…", "detail": "…", "ev": "…" }],
    "learns":  [{ "text": "…", "ev": "…" }]
  },
  "checklist": [
    { "id": "C1", "what": "…", "why": "…", "how": "…", "piece": "useAgentContext",
      "docs": "https://docs.copilotkit.ai/agent-app-context",
      "file": "starters/open-harvey/src/copilot/useAppContext.ts", "done": "…" }
  ],
  "validate": { "who": ["…", "…", "…"], "ask": ["…"] },   // two or three people
  "sources": [
    { "id": 1, "title": "…", "publisher": "…", "url": "https://… or repo/path.md",
      "supports": "What this source backs, in one line", "accessed": "2026-11-05" }
  ]
}
```

Notes:

- **Wording:** each field reads as part of a sentence the page builds.
  - Jobs read "When {when}, I want to {want}, so I can {so}." So `want` and `so` start with a verb
    ("find every take…", "deliver without…"), never with "to", "I" or "they".
  - A flow reads "Trigger: {trigger}. Outcome: {outcome}." Write both as short clauses.
  - Don't end `meta.building` with a full stop.

- **Steps:** `region` must be a region id. For a step outside the workspace (email, a meeting, another
  tool), leave out `region` and set `place`. `weight` (1 to 8) sets the length of the time bar relative
  to the other steps; `time` is the label. `kind` is one of `work`, `handoff`, `approval` or `wait`.
- **The surface:** `surface.region` is where the copilot sits, and it's drawn filled in the wireframe.
  `surface.also` lists the regions where its work lands, drawn outlined. A region with `"new": true` is
  a panel today's software doesn't have; the first wireframe draws it dashed.
- **Names:** `does`, `renders` and `waits` items should have a `name`: the tool or component name in
  the domain's verbs.
- **The checklist:** each item needs `id`, `what`, `why`, `how`, `done` and `piece`, plus either a
  `docs` link (from the checked list in `placement.md`) or a starter `file`.
- **Ordering:** the page tallies sourced, assumed and confirmed items, lists every Assumed item in the
  user-check section, and draws everything in the order you give it.

## Build

```bash
node <skill-dir>/scripts/build-map.mjs docs/copilot/user-map.json            # writes .html and .md beside it
node <skill-dir>/scripts/build-map.mjs docs/copilot/user-map.json --check    # check only
node <skill-dir>/scripts/build-map.mjs map.json --html out.html --md out.md
```

**Errors** stop the build: a missing field, a `sourced` item with no `src`, a source id that doesn't
exist, a region id the layout doesn't name, a missing or extra `first` job, a checklist item missing a
part, or a leftover `‹placeholder›`.

**Warnings** don't stop it, but read them:

- the day shares don't add up to about 100;
- a flow has no handoff or approval;
- a region isn't placed in the layout;
- a docs link isn't on docs.copilotkit.ai.

The script escapes `<` in the data, so text from a web page can't break the page.

**Without Node:** copy `assets/user-map.html`. Replace the JSON between
`<script type="application/json" id="user-map-data">` and `</script>`, replacing every `<` with the six characters `\u003c` (a JSON escape; `&lt;` would stay literal inside a script tag).
Open the page to check that it draws, because there's no validator in this mode.
