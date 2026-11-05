---
name: Northstar People · Headcount
description: An internal headcount-approval tool with a functional copilot, set as one calm, ruled document on warm paper.
colors:
  green: "#1e4634"
  green-deep: "#15332a"
  green-tint: "#e8efea"
  on-green: "#fafaf9"
  red: "#b42318"
  red-tint: "#fbebe9"
  amber: "#7a5a12"
  amber-tint: "#f6efdc"
  highlight: "#f3e4b0"
  paper: "#fafaf9"
  surface: "#ffffff"
  stone: "#f1f0ec"
  stone-deep: "#e8e6e0"
  ink: "#16140f"
  muted: "#6b675f"
  hairline: "#e4e2dc"
  rule: "#d4d1c9"
typography:
  title-document:
    fontFamily: "Source Serif 4 Variable, Source Serif 4, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "-0.005em"
    fontVariation: "opsz auto"
  title-panel:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "21px"
    fontFeature: "tnum"
  small:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "17px"
    fontFeature: "tnum"
  section-label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: "17px"
    letterSpacing: "0.06em"
  id:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: "17px"
rounded:
  xs: "3px"
  sm: "4px"
  control: "5px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  row-tight: "4px"
  row: "8px"
  card-y: "12px"
  card-x: "14px"
  gutter: "16px"
  document-x: "24px"
  section: "24px"
  rail-gap: "32px"
  top-bar: "48px"
  copilot-panel: "400px"
  rail: "400px"
  content-max: "1180px"
components:
  top-bar:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    typography: "{typography.body}"
    height: "48px"
    padding: "0 24px"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.green-deep}"
    textColor: "{colors.on-green}"
  button-primary-disabled:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.red}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 14px"
  button-danger-hover:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 14px"
  button-ghost-hover:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
  button-sm:
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "28px"
    padding: "0 10px"
  button-on-green:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "28px"
    padding: "0 10px"
  tag-neutral:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  tag-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  tag-green:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  tag-red:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  tag-amber:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  verdict-tag:
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "20px"
    width: "72px"
    padding: "0 6px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  document:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  plan-strip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  tab:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    height: "40px"
  tab-selected:
    textColor: "{colors.ink}"
  tab-count:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "18px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "32px"
    padding: "0 10px"
  source-tag:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
  rule-text:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  avatar:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    size: "28px"
  avatar-signed:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.full}"
    size: "28px"
  copilot-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    width: "400px"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  chip-hover:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
  user-message:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "8px 12px"
  composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
  send-button:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.control}"
    size: "28px"
  send-button-disabled:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.muted}"
  work-row:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    padding: "3px 0"
  work-summary:
    textColor: "{colors.muted}"
    typography: "{typography.small}"
  error-banner:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
    typography: "{typography.small}"
    padding: "10px 16px"
---

# Design System: Northstar People · Headcount

## Overview

**Creative North Star: "The Ruled Ledger"**

A headcount request reads as one calm, ruled document. Every figure is computed and set in tabular numerals, every check sits on its own hairline with its rule id beside it, and every signature is recorded. Warm paper holds white work surfaces. Near-black warm ink carries nearly all the information, and one deep Northstar green is used sparingly. The system works in the register of a security print or a legal ledger: hierarchy comes from weight, case and one-pixel rules, not from size, colour or depth.

The density is that of an operating tool shown over a Zoom share at about 1440px. The body size is 14px, and the work area uses only three sizes. The page is a work column on the left with a 400px copilot panel on the right, set behind a hairline. The copilot is drawn in the app's own language, so its cards look like smaller sheets of the same document. The world's signature is the approval seal, a data graphic built from live state. It has a petal for each check and a ring for each approver.

The system rejects the grey SaaS dashboard with a purple sparkle, chat bubbles doing the work, and decoration that carries no fact.

**Key Characteristics:**
- Warm paper ground, white sheets, stone for quiet fills, and 1px hairlines everywhere.
- One rationed green for brand, the primary action, signatures and passing results. Red is used only for what a person must act on.
- Three type sizes (22 / 14 / 12.5px). The serif appears only on document titles, and mono only on ids.
- Every status is a tinted tag that carries a word. Colour is never the only signal.
- The seal is the only illustration, and it is drawn entirely from data.
- Each change gets one authored moment of motion. Everything is visible by default.

## Colors

The palette is warm and near-monochrome, with one green and one red that each have a job.

### Primary
- **Northstar Green** (green): the green top bar, the primary button, the composer's send button, the seal's inked petals and approved rings, the signed approver's avatar, and the focus ring, field focus border and text caret. **Deep Green** (green-deep) is the primary hover. **Green Tint** (green-tint) is the ground of green tags (Pass, Approved, Ready to submit, Published) and the fill of the petal glyph in the seal's key. **On Green** (on-green) is text on green.

### Secondary
- **Action Red** (red): Fix and Missing verdicts, the Required field tag, the blocker list in the document header, a field that fails validation, a figure that breaks a rule (left after this hire, when over budget), the stretch of the band bar above the midpoint when a reason is needed, Sent back and Rejected tags, the Reject button's text, the seal's failing petals and broken rings, and the chat's error banner. **Red Tint** (red-tint) is its tag and banner ground.

### Tertiary
- **Note Amber** (amber, amber-tint): only the "Note" verdict, for a check that informs without blocking.
- **Change Highlight** (highlight): the warm wash that fades behind a derived figure after it changes. It is never used as a static fill.

### Neutral
- **Paper** (paper): the page and the browser canvas (html, body). It is also the fill for rows from a published skill and the hover on expandable policy rows.
- **Surface** (surface): white work sheets, cards, the copilot panel, inputs and the composer.
- **Stone** (stone): quiet fills such as the neutral tag, source tag, tab count, the stone avatar, the person's chat message, expanded rule text, disabled primary buttons and skeleton bars. **Stone Deep** (stone-deep) is declared and reserved for a deeper fill.
- **Ink** (ink): all primary text, the band bar's base dot, the committed share in the plan strip, and the selected tab's underline.
- **Muted Ink** (muted): secondary text, formulas, rule ids, source lines, work rows, placeholders, the seal's informational petals and pending rings.
- **Hairline** (hairline): every divider, card border and row rule. **Rule** (rule): stronger 1px borders on inputs, secondary buttons and the composer, and the band bar's track.

### Named Rules
**The One Green Rule.** Green means "this is Northstar, this is the action, this passed, this person signed". It never decorates. In the shipped build, green also appears on Pass, Ready and Published tags and on focus rings, the field focus border, the caret and the selection tint. The finish review accepted this as part of the same meaning (passing, or "you are here"). Do not spread it further.

**The Red Has One Job Rule.** Red marks only what a person must act on: a blocking check, a required field, a returned request, a destructive choice, or an error. Information and warnings that don't block are muted or amber, never red.

**The Word-Always Rule.** Every coloured status is a tag with a word, often with an icon. A colour swatch never stands alone.

## Typography

**Document Font:** Source Serif 4 Variable (with Georgia), self-hosted
**UI Font:** Geist Sans (with ui-sans-serif, system-ui), self-hosted
**Id Font:** Geist Mono (with ui-monospace, Menlo)

**Character:** A quiet grotesk does the work, and a bookish serif names the document. Tabular numerals are on everywhere, so money lines up by eye. Mono marks things that are identifiers.

### Hierarchy
- **Document title** (Source Serif 4, 500, 22px / 28px, -0.005em, optical sizing auto): the role title of a business case, the empty "No request open" sheet, and a skill document's title. It is used only on documents.
- **Panel title** (Geist, 600, 22px / 28px, -0.01em): headings of non-document sheets, such as an Insights recommendation or the empty Approvals inbox.
- **Body** (Geist, 400, 14px / 21px, tabular): fields, prose, cost lines, chat transcript and buttons. Weight 500 is used for names and labels, and 600 for totals and key figures. Prose wraps with `text-wrap: pretty`, and long reading blocks cap at 50 to 58ch.
- **Small** (Geist, 12.5px / 17px): meta lines, sources, hints, tags, chips, the work summary and plan-strip labels.
- **Section label** (Geist, 600, 12.5px, 0.06em, uppercase, muted): the heading of a section inside a sheet (Request, Policy check, Cost, Approval route, Decision log). It sits on a hairline, and an optional small meta line sits on the right.
- **Id** (Geist Mono, 12.5px, never wraps): request ids, rule ids (POL-COMP-01) and skill versions.

### Named Rules
**The Three Sizes Rule.** The work area has exactly three sizes: 22, 14 and 12.5px. The theme resets every other text size. Hierarchy comes from weight, case and hairlines.

**The Serif Names Documents Rule.** The serif is reserved for the title of something that could be printed and signed. A panel heading that is not a document is set in sans semibold.

**The Section Label Is The Heading Rule.** The uppercase section label is the section's own heading and is followed by its content. It is never an eyebrow above a larger heading.

## Layout

- **Shell:** a 48px green top bar. Below it, a scrolling work column on paper and a fixed 400px copilot panel on white, separated from the column by a 1px left hairline. The panel shows at 1024px and up. Below 1024px, it becomes a full-height overlay under the top bar, opened by a "Copilot" toggle in the bar.
- **Work column:** content capped at 1180px and centred, with gutters of 16px that grow to 24px. In order, the column holds the one-row plan strip (40px tall), the tab row (40px tabs, 24px apart, on a hairline) and the active sheet, 12px below the tabs.
- **Document:** a header band (16px vertical, 20 to 24px horizontal) holds the title block, the seal with its key, and the action column. Below it is a two-part grid with fields on the left and a 400px rail on the right (policy check, cost, route), 32px apart. Fields sit in a two-column grid with 16px gaps. Sections stack 24px apart on the left and 20px apart in the rail.
- **Responsiveness:** container queries rather than viewport breakpoints. Layouts collapse to one column under roughly 56rem (rail) and 28rem (field pairs).
- **Rhythm:** rows are tight, at 4px vertical for policy rows on the page, 8px in the chat and route rows, and 2px for cost lines. Card padding is 12px by 14px. The chat uses one 16px gutter for transcript, chips and composer.

**The Ruled Rows Rule.** Lists are separated by hairline dividers, not gaps or cards. A list of checks, approvers or requests is one ruled table.

## Elevation & Depth

The system is flat, and depth comes from tone: white sheets on paper, stone fills inside white, and 1px hairlines. Shadows appear only on the composer and the chat's scroll-to-latest button, and as focus rings.

### Shadow Vocabulary
- **Raised** (`0 1px 2px rgb(22 20 15 / 0.05), 0 4px 12px -6px rgb(22 20 15 / 0.08)`): only the small hairline scroll-to-latest button in the chat.
- **Composer rest** (`0 1px 2px rgb(22 20 15 / 0.04)`): the chat composer at rest.
- **Focus halo** (`0 0 0 3px` green at 0.10 to 0.12 alpha): a field or the composer while it is focused, with a green border.
- **Invalid halo** (`0 0 0 3px` red at 0.08 alpha): a field that fails validation, with a red border.

**The Flat Sheet Rule.** Sheets never cast shadows. A sheet is separated by its hairline and by white sitting on paper.

## Shapes

Corners are barely softened. Tags and inline fills use 4px, and controls (buttons, inputs, the send button) use 5px. Sheets, cards, chips and the plan strip use 6px. The composer and the person's chat note use 8px, and the note's lower-right corner is pinched to 2px. Avatars and the committed-share bar are fully round. The figure highlight uses 3px. Borders are always 1px. The only heavier line is the 2px ink underline on the selected tab. Cost totals are set off with a single hairline, and the final line sits under a double hairline (3px with a top and bottom rule), as in a ledger.

## Components

### Buttons
- **Shape:** 5px corners, 32px tall with 14px padding (small: 28px, 10px, small type), weight 500, 150ms colour transition.
- **Primary:** green with on-green text, deep green on hover. When disabled, it becomes a stone fill with muted text and a hairline border. Use one per view, for the act that moves the request (Submit for approval, Approve, the approval card's Submit).
- **Secondary:** white with a rule border and ink text, stone on hover.
- **Danger:** white with a rule border and red text, red tint on hover. Used only for Reject.
- **Ghost:** muted text, stone on hover.
- **On green:** used in the top bar. It has a 35% on-green border and a 10% on-green wash on hover.
- **Focus:** a 2px green outline with a 2px offset, the same for every focusable element.

### Tags
- **Style:** 20px tall, 4px corners, 6px padding, small type, weight 500. Each tag has a tinted ground in its tone: neutral (stone), outline (white with a hairline and muted text), green, red, or amber.
- **Verdict tag:** a fixed 72px width, so verdicts align as a column, with an icon and a word. The mapping is Pass (green, check), Fix (red, alert), Missing (red, dashed circle), Note (amber, note) and Info (neutral, info).
- **Signer states:** Not signed and Reviewing now (outline), Approved (green), Sent back and Rejected (red).

### Cards / Sheets
- **Sheet:** white with a hairline border and 6px corners, and a header band ruled off by a hairline. Used for the business case, inbox rows and recommendations.
- **Chat card:** the same frame, smaller. The header (14px by 10px) has a body-semibold title, a small muted meta line and an optional aside on the right (a status tag and the 36px seal). The body is 14px by 12px. While a card loads, it shows stone skeleton bars that keep the card's shape.

### Inputs / Fields
- **Field:** a small label line (name in weight 500, an optional Required tag, the rule id in mono on the right) above the control. Under the control sits a source tag ("copilot · from your request", "edited by you") and a muted hint.
- **Control:** white, a 1px rule border, 5px corners, 32px tall, 10px padding. The border darkens slightly on hover. On focus, the border turns green and gets a 3px green halo. An invalid control gets a red border with a red halo. A select uses a muted chevron, and a money input uses a muted "$" prefix.

### Navigation
- **Top bar:** green, 48px tall, with the four-point Northstar mark, "Northstar People · Headcount", the current user, and the Reset demo button on the right.
- **Tabs:** text tabs in body weight 500. Unselected tabs are muted, turning to ink on hover. The selected tab is ink with a 2px ink underline sitting on the row's hairline. A count shows as an 18px stone badge. Arrow keys move between tabs.

### Policy list and cost statement
- **Policy row:** the verdict tag, then the rule name, the figure it tested (semibold), the mono rule id and a chevron. Blocking rows open by default to their plain sentence. Any row with written policy opens on click to show the rule text on a stone fill. Rows from a published skill sit on paper beneath a "From published skills" divider.
- **Cost statement:** each line reads as a label, a muted formula, an optional mono rule id and a right-aligned figure. Totals are semibold, and the final total sits under a double rule.
- **Band bar:** a 132px line showing the band's minimum to maximum, a muted midpoint tick, and an ink dot for the base. The stretch from the midpoint to the base is red only when a rule needs a reason.

### Approval Seal (signature component)
The seal is drawn on every render from live state, and it is the request's state as one graphic.
- **Petals are checks.** There is one petal per check, in policy order, starting at the top and going clockwise. Green means pass, red means fail or missing (act on it), and muted means informational. At 64px and up, each petal is three nested strokes, and below that, one.
- **Rings are approvers.** There is one ring per approver, with the innermost ring first. Pending is a muted dashed ring, approved is a solid green ring, sent back is a red ring broken into three arcs, and rejected is a red ring broken into six.
- **The boss:** a white centre dot that turns green once every approver has signed.
- **Sizes:** 88px in documents and the inbox, 36px in chat cards. Beside the large seal is a key (a petal glyph with "N checks · N pass" and a ring glyph with "N approvers · N signed"), and the mono request id sits under it as a caption.
- **Accessibility:** a full sentence label ("4 of 9 checks pass, 1 to fix; 1 of 3 approvers signed").

### Chat
- **Transcript:** assistant prose in 14px ink with no bubble. Each paragraph after the first gets 8px above it, and lists use muted markers.
- **Person's message:** a quiet stone note on the right with a hairline border and 8px corners, the lower right pinched to 2px. It never takes a brand colour.
- **Edit event row:** an edit made in the document is not shown as a bubble. It shows as a small muted row between hairlines, with a pen icon, "You changed base salary $212,000 → $225,000", and then "Saw your edit · re-checked" with a check mark.
- **Work rows:** one quiet muted row per step. While a step runs, it has a spinner and present-tense ink text ("Checking the policy rules…"). When it finishes, it gets a muted check and past tense with the result ("Checked 9 rules · 1 to fix"), or a red alert if it failed. Rows never show a raw tool name.
- **Work summary:** one small line per turn, "Working 3s" while running and then "Worked for 6s · Read FY2027 plan · Checked 9 rules" with a chevron that opens the folded rows.
- **Receipt:** a small hairline note after a submission, with a check (submitted) or a return arrow (cancelled).
- **Chips:** pinned above the composer instead of at the end of the transcript. They are white with a hairline, 6px corners and small weight-500 text, with stone and a rule border on hover. They hide while the copilot works and while an approval card waits.
- **Composer:** white with a rule border and 8px corners. On focus it gets a green border and halo. The 28px send button is green and turns stone and muted when disabled. A white fade sits above the composer, so the transcript never runs under it.
- **Panel header:** 48px, "Copilot" in semibold, "powered by CopilotKit" in small muted text, and the model name in a stone tag.

### Motion
- **Figure highlight:** a derived figure that changes gets the highlight wash, which fades over 1800ms (cubic-bezier(0.16, 1, 0.3, 1)), once. It never plays on first render.
- **Seal ink:** a stroke whose state changed draws on over 900ms with the same curve. Strokes that change together are staggered by 45ms, so they read as one stroke of the pen.
- **Spinner:** 900ms linear. It is used only on running work rows.
- **Transitions:** 150ms for colours, 120ms ease-out on the composer, and 200ms for chevron rotation.
- **Reduced motion:** all three animations are removed, and the seal shows its final state.

### Browser surfaces
The html and body backgrounds are paper, and the body text is ink in Geist with tabular numerals and antialiasing. The selection tint is a pale green, and the caret is green. The global focus outline is 2px green with a 2px offset, but fields and the composer draw their own focus instead. Scrollbars are thin and warm grey. Links use a 3px underline offset and a 1px underline. The chat library's theme variables are mapped onto the same palette and a 6px radius, so its own parts match the app.

## Do's and Don'ts

### Do:
- **Do** put the rule id in mono beside every figure or field it governs.
- **Do** give every status a word in a tinted tag, using the fixed 72px verdict tag for checks.
- **Do** compute every number in code and show it with the Figure highlight when it changes.
- **Do** separate rows with hairlines and keep sheets flat (white on paper, 1px hairline, 6px corners).
- **Do** draw new copilot cards in the same frame as the page's sheets, with a status tag and the 36px seal in the aside.
- **Do** describe the copilot's work in plain present and past tense in work rows, and fold the rows into one summary line.

### Don't:
- **Don't** add a fourth type size or use the serif on anything that isn't a document title.
- **Don't** use green for decoration, emphasis or charts. It means brand, action, pass, signed or focus.
- **Don't** use red for anything a person doesn't have to act on. Use muted ink or amber for information and warnings.
- **Don't** put shadows on sheets or cards, or use coloured bubbles for chat messages.
- **Don't** place the uppercase section label above a larger heading as an eyebrow.
- **Don't** animate on first render, loop anything except the working spinner, or ignore reduced motion.
