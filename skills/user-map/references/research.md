# Researching the role and the workspace

The goal is a map the developer can trust. It doesn't need to be exhaustive. Spend about fifteen minutes
and read three to eight sources. More is fine when each vendor help page covers one narrow thing. Then
stop and mark the rest `assumed`: the real users settle it later.

## What to look up, and where

| To map | Search for | Best sources |
| --- | --- | --- |
| The software's layout (regions, object, selection) | `<software> interface panels`, `<software> workspace overview`, `get started with <software>` | The vendor's own help, learning or getting-started pages. Third-party tutorials come second. |
| The UI pattern's conventions | `<category> UI`, `<software> keyboard workflow` | Vendor docs and practitioner tutorials |
| What the role does and is measured on | `<role> responsibilities`, `<role> KPIs`, `day in the life of a <role>` | Professional bodies, job descriptions from several employers, practitioner blogs |
| Key flows, handoffs and approvals | `<function> workflow stages`, `<process> approval process`, `<review tool> <software> integration` | Workflow guides, the docs of the review and approval tools that sit around the software |
| Where time goes | `<task> time-consuming`, `<role> survey time spent` | Surveys and studies with a stated method. Most claims about time are opinion, so mark them `assumed` unless the source measured them. |
| The AI products already in this space | `<category> AI assistant`, `<role> copilot` | Company pages and launch posts. Describe what they do; never copy them. |
| The developer's own context | their repo: routes, components, data models, docs | Read the files. A component name like `ReviewTable` is evidence. |

**Open what you cite.** A search snippet is a lead, not a source. Fetch the page and check that it says
what you claim. If a page won't load (403, 404, behind a login), don't cite it: find another, or mark the
claim `assumed`.

**Prefer primary sources.** For how the software works, the vendor beats a tutorial, and a tutorial
beats a listicle. For what the role does, practitioners beat vendors' marketing.

## Citing

Give each source an id and record its title, publisher, URL, what it `supports` (one line, in your words)
and the date you read it. Every `sourced` item lists the ids it rests on. The `supports` line is what
lets a reader check you quickly, so make it specific: "Comments come back into the timeline as markers at
the matching timecode", not "Frame.io info".

Repo files are sources too. Cite them by their path in the developer's repo (`README.md`,
`src/data/playbook.md`), and the build script accepts that. Cite only files that exist in *their* repo:
the workshop's `docs/` files that the legal example cites aren't there.

## Assumed, and why it's fine

Mark an item `assumed` when it's your judgement, a common-sense inference, or a number nobody measured.
Most time estimates, day splits and the placement itself start out assumed. The page shows how many
items are assumed and lists them in the "Check it with real users" section, which then becomes the
interview plan. A map whose placement is entirely assumed is normal before anyone has talked to users.

Mark `confirmed` only when a real user or the developer has said so, and record who in `by`.

## Real products: describe, don't copy

- Name products (Premiere Pro, Word, NetSuite, Zendesk, Kino.ai, Slack, Teams) only to describe what
  they are or do, in your own words.
- No logos, no screenshots, no traced layouts, no copied UI strings, no marketing copy. The wireframe is
  a schematic of the *pattern* (timeline, bins, monitors, inspector), which many products share.
- Use generic region names. Add the product's own name for a panel only as a description ("the media
  bins, which Premiere Pro calls the project panel").
- For a direct quote from a source, keep it under 15 words, in quotation marks, and use at most one.
  Usually you should paraphrase.

## Without web access

Some agents can't search the web. Then:

- set `meta.research` to `"no-web"`, and the page says so in the header and under Sources;
- use the developer's repo and docs as sources (cite them by path);
- mark everything else `assumed`, even if you're fairly sure;
- tell the developer up front: "I couldn't research the web, so most of this map is my judgement,
  marked Assumed. The user check matters even more."

Don't invent URLs or cite pages you didn't open.
