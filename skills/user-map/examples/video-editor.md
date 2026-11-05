# User map: Video editor in Premiere Pro

*2026-11-05 · made with /user-map · step 1 of 5: /user-map → /agent-context → /functional-copilot → /deploy → /secure-governance, with learning through CopilotKit Intelligence.*

> An editing copilot that lives in a panel inside the editing app, beside the timeline. It reads the open sequence, the playhead and the selected clips, finds takes and builds selects, drafts a rough cut as a new sequence, and waits for the editor before anything changes their own sequence or goes out for review.

Evidence: 25 sourced, 41 assumed, 0 confirmed. Anything marked *(Assumed)* has not been checked with a real user yet.

## For /functional-copilot's Phase 1 interview

Start the interview from these answers and ask only what is missing or *(Assumed)*.

**Round 1: the workflow**
- Function: Post-production. Users: Video editor, working in Premiere Pro.
- Shape: workspace assist.
- First job for the copilot (J1): "When footage lands for a new project, I want to have every clip transcribed, logged and tagged, with the best takes pulled into a selects bin, so I can start on the story instead of scrubbing hours of footage." [3][4]
- Flow "Footage to an approved cut". Trigger: a shoot's footage arrives on a drive. Outcome: a cut the producer has approved.
- Flow "Picture lock to delivery". Trigger: the producer approves the cut. Outcome: masters and social versions delivered.
- Copilot built in: A panel inside the editing app, beside the timeline: a UXP plugin panel in Premiere Pro running the CopilotKit React app, with the runtime on your server. CopilotKit inside that panel is Assumed until checklist item C1 proves it.
- After the last approval: Picture lock: the approved sequence is locked and exported for color and sound, in the editing app's project. The editor locks and exports it once the producer approves. [3]

**Round 2: people and rules**
- Handoff: Assistant editor: Logs each clip (names, notes, transcripts, tags) and sorts it into bins, then hands the project over. *(Assumed)*
- Handoff: Editor: Uploads the cut for review. [2]
- Approval: Producer or client: Approves the cut, or sends another round. *(Assumed)*
- Approval: Producer: Declares picture lock: no more picture changes. [3]
- Handoff: Editor: Prepares and labels the tracks and exports for color and sound. [3]
- Approval: Client: Gives final approval before release. *(Assumed)*
- Works with Assistant editor: ingests, syncs and organises the media into bins *(Assumed)*
- Works with Producer or director: reviews each cut and leaves notes at timecodes; approves the cut [2]
- Works with Colorist and sound mixer: take the locked cut; everything they do depends on picture lock [3]
- Works with Client: gives final approval before release *(Assumed)*

**Round 3: systems and numbers**
- Main software: Adobe Premiere Pro: Where the cut is made: media organised in a project panel, a clip previewed in a source monitor, the sequence built on the timeline and played back in a program monitor. [1]
- Also: Frame.io: Review: the cut goes up for comment, and reviewers' comments come back into the timeline as markers at the matching timecode. [2]
- Also: Shared storage and proxies: Footage is backed up and turned into lighter proxy files before editing starts. [3]
- Also: AI editing workspaces, such as Kino.ai: A newer category: an editing product where people and AI agents work on the same footage. It shows editors already accept AI inside the edit. [4]
- Measured on: A first cut to the producer by the deadline *(Assumed)*
- Measured on: Review rounds before approval (vague notes add rounds) [3]
- Measured on: Deliverables on spec and on time *(Assumed)*
- Where the time goes (Footage to an approved cut): Logging and finding the takes, before any story exists, then the wait between review rounds. Vague notes add rounds. The times here are Assumed: ask two editors how long each step takes on a real project.
- Where the time goes (Picture lock to delivery): Rework when the picture changes after lock, and exporting versions one at a time.

## The workspace: Timeline editor

Everything sits around one sequence and is anchored to time. Media bins hold the footage; a source monitor previews one clip so the editor can mark the moment they want; the timeline holds the sequence as clips on video and audio tracks; a program monitor plays the sequence wherever the playhead sits. An inspector shows the settings of whatever is selected. [1]

- Object of work: The sequence: clips on tracks over time, with markers
- Selection: Clips on the timeline, an in-to-out range, or a clip in a bin
- Open at once: One sequence on the timeline, one clip in the source monitor, the playhead's frame in the program monitor
- Regions: Media bins · Source monitor · Program monitor · Timeline · Inspector · Copilot panel

## Jobs to be done

- **J1 (first)** When footage lands for a new project, I want to have every clip transcribed, logged and tagged, with the best takes pulled into a selects bin, so I can start on the story instead of scrubbing hours of footage. [3][4]
- **J2** When I start the assembly, I want to start from a stringout built from the script or the best interview answers, so I can react to a cut instead of a blank timeline. *(Assumed)*
- **J3** When review notes come back, I want to turn each note into a marker and a proposed change at its timecode, so I can work through a round without missing a note. [2][3]
- **J4** When a producer asks whether we have a shot of something, I want to search the footage by what's said and shown, so I can answer in seconds. *(Assumed)*
- **J5** When I hand off to color and sound, I want to prepare, label and export the locked sequence to their spec, so I can hand off without questions coming back. [3]
- **J6** When the cut is approved, I want to have captions, versions and deliverables prepared to spec, so I can deliver without a night of exports. *(Assumed)*

## Key flows

**Footage to an approved cut** (a shoot's footage arrives on a drive → a cut the producer has approved)

1. Assistant editor (in Media bins): Ingests the media, backs it up, makes proxies and syncs sound. *Half a day* [3]
2. Assistant editor (in Media bins): Logs each clip (names, notes, transcripts, tags) and sorts it into bins, then hands the project over. *Hours per shoot day* · **handoff** *(Assumed)*
3. Editor (in Source monitor): Scrubs the takes and marks the best moments into a selects sequence. *Hours* *(Assumed)*
4. Editor (in Timeline): Builds the assembly, then the rough cut for story, then the fine cut for pacing. *Days* [3]
5. Editor (Frame.io): Uploads the cut for review. *Minutes* · **handoff** [2]
6. Producer (Frame.io): Watches the cut and leaves notes at timecodes. *A day or more* · **wait** *(Assumed)*
7. Editor (in Timeline): Brings the notes in as markers and works through them. *Hours* [2]
8. Producer or client (Frame.io): Approves the cut, or sends another round. *Per round* · **approval** *(Assumed)*

Where the time goes: Logging and finding the takes, before any story exists, then the wait between review rounds. Vague notes add rounds. The times here are Assumed: ask two editors how long each step takes on a real project.

**Picture lock to delivery** (the producer approves the cut → masters and social versions delivered)

1. Producer (Frame.io): Declares picture lock: no more picture changes. *One decision* · **approval** [3]
2. Editor (in Timeline): Prepares and labels the tracks and exports for color and sound. *Hours* · **handoff** [3]
3. Colorist and mixer (their own tools): Grade the picture and mix the sound against the locked cut. *Days* [3]
4. Editor (in Timeline): Brings back the graded picture and the mix, then adds captions. *Hours* *(Assumed)*
5. Editor (export): Exports the masters and each social version. *Hours* *(Assumed)*
6. Client (Frame.io): Gives final approval before release. *A day* · **approval** *(Assumed)*

Where the time goes: Rework when the picture changes after lock, and exporting versions one at a time.


## Where the copilot lives

Built with CopilotKit: the React v2 hooks in the app, AG-UI to the agent (`BuiltInAgent` or any AG-UI agent), the CopilotKit Runtime on the server, CopilotKit Intelligence for threads, memory and learning, and the web inspector while you build.

- **Surface:** Copilot panel; its work lands in Timeline, Media bins, Program monitor. The copilot is a panel inside the editing app, docked beside the timeline under the inspector, so it sees what the editor sees: the open sequence, the playhead and the selection. Its work lands where an editor already looks: takes in a selects bin, a rough cut as a new sequence that plays in the program monitor, and markers at the timecodes it's talking about. In Premiere Pro it's a UXP plugin panel. Adobe says React runs in UXP panels after a build step; CopilotKit there is untested until the spike in C1. *(Assumed)*
- **Not this:** A chat window floating over the edit that can't see the sequence, answers "try cutting at 01:12" in text, and leaves the editor to make every change by hand.
- **Reads (`useAgentContext`):**
  - The open sequence: clips, tracks, in and out points, markers *(Assumed)*
  - The playhead position and the selected clips or range *(Assumed)*
  - Bin contents with their transcripts and tags *(Assumed)*
  - Review notes as markers, with timecode and author [2]
  - Project rules: delivery specs, naming, caption style *(Assumed)*
- **Does (`useFrontendTool`):**
  - `findTakes`: Searches transcripts and tags for moments that match a description, such as every take where she mentions the launch. *(Assumed)*
  - `buildSelects`: Puts the matches into a selects bin, with in and out points. *(Assumed)*
  - `proposeRoughCut`: Builds a rough cut from the selects as a new sequence, through the plugin API, never editing the editor's own sequence. *(Assumed)*
  - `addMarker`: Adds a marker at a timecode, with a note. *(Assumed)*
  - `movePlayhead`: Jumps the playhead and the program monitor to the moment it's talking about. *(Assumed)*
- **Renders (`useComponent`):**
  - `showTakes`: Take cards in the panel: a frame strip, the transcript line and the duration, with Play and Add to selects. *(Assumed)*
  - `showCutSummary`: A card for the proposed cut: clip count, length, which script beats it covers, and what it left out. *(Assumed)*
  - `showNotesRound`: One card per review round: each note, its timecode, the proposed change and whether it's done. *(Assumed)*
- **Waits for a person (`useHumanInTheLoop`):**
  - `applyToSequence`: Moving clips from the rough cut into the editor's own sequence: the card lists what it adds, moves and removes, with Apply or Keep as proposal. *(Assumed)*
  - `removeMedia`: Deleting or replacing any clip or media the editor placed. *(Assumed)*
  - `sendForReview`: Uploading a cut for the producer or client to review. *(Assumed)*
  - `exportDeliverables`: Rendering and delivering masters and versions. *(Assumed)*
- **Shared state (`useAgent`, or app state through `useAgentContext` + `useFrontendTool`):**
  - The proposal: a rough-cut sequence and a selects bin that both the editor and the copilot change. The editor's trims always win; the copilot re-reads them and never restores its own in-point. *(Assumed)*
  - Markers: both add them, and both mark review notes as done. *(Assumed)*
- **Learns from (CopilotKit Intelligence: Automatic Learning):**
  - Takes the editor rejects or re-trims from the copilot's selects. *(Assumed)*
  - Notes producers repeat across projects (keep titles inside the safe area, no jump cuts in interviews), proposed as a house rule that a lead editor publishes. *(Assumed)*

## Build checklist

- [ ] C1 Prove CopilotKit runs in a panel inside the editing app: CopilotKitProvider + useFrontendTool (`starters/open-harvey/src/components/LegalApp.tsx`)
- [ ] C2 Put the sequence, the playhead and the selection in context: useAgentContext (`starters/open-harvey/src/copilot/useAppContext.ts`)
- [ ] C3 Make the footage searchable as text, then give the copilot a search tool: useFrontendTool (`starters/open-harvey/src/copilot/useReviewTools.ts`)
- [ ] C4 Draw takes as cards the editor can play and keep: useComponent (`starters/open-harvey/src/copilot/useGenerativeUI.tsx`)
- [ ] C5 Propose the cut as a new sequence, never in the editor's own: useFrontendTool (`starters/open-harvey/src/copilot/useReviewTools.ts`)
- [ ] C6 Gate every change to the real sequence: useHumanInTheLoop (`starters/open-harvey/src/copilot/useProposePlan.tsx`)
- [ ] C7 Let the copilot hear the editor's trims: useAgent + useCopilotKit (`starters/open-harvey/src/copilot/useTellCopilot.ts`)
- [ ] C8 Turn a review round into a checklist of changes: useComponent (`starters/open-harvey/src/copilot/useGenerativeUI.tsx`)
- [ ] C9 Gate review uploads and exports: useHumanInTheLoop (`starters/open-harvey/src/copilot/useRequestApproval.tsx`)
- [ ] C10 Record rejected takes and repeated notes: CopilotKit Intelligence (`starters/open-harvey/src/lib/learning.ts`)
- [ ] C11 Watch the context and the tool calls in the web inspector while you build: CopilotKit web inspector (`starters/open-harvey/src/components/LegalApp.tsx`)

## Check with real users before building

- [ ] An editor who cuts interviews or branded content every week
- [ ] An assistant editor who ingests and logs footage
- [ ] A producer who reviews cuts and leaves notes

1. On a typical shoot day, how long do logging and finding the takes really take?
2. Would a copilot panel docked beside the timeline work for you, or would you rather call it from a command bar?
3. Would you let a copilot put clips on a ghost track? What would you need to see before you apply it?
4. How do review notes reach you today, and which are hardest to act on?
5. Which changes must never happen without your click: deleting media, replacing clips, exporting?

## Sources

1. Get started with Premiere Pro, Adobe: https://www.adobe.com/learn/premiere-pro/web/get-started-premiere-pro. The four panels used for editing (project panel, source monitor, timeline, program monitor) and what each is for.
2. Team review with Frame.io, Adobe: https://www.adobe.com/us/learn/premiere-pro/web/team-review-with-frame-io. Reviewers comment on an uploaded cut, and their comments come back into the timeline as markers at the matching timecode.
3. Post-production stages, from editing to final delivery, C&I Studios: https://c-istudios.com/post-production-stages-step-by-step-guide-from-editing-to-final-delivery/. Ingest, backups, proxies and logging come first; rough cut, fine cut, then picture lock; color and sound depend on the locked cut; vague feedback adds revision rounds.
4. Kino AI, Y Combinator company page: https://www.ycombinator.com/companies/kino-ai. An editing product where people and AI agents work on the same footage.
5. Premiere Pro UXP, Adobe Developer: https://developer.adobe.com/premiere-pro/uxp/. Premiere Pro has a built-in plugin framework, UXP, for panels and tools inside the app.
6. UXP tech stack, Adobe Developer: https://developer.adobe.com/uxp/guides/explanation/tech-stack/. Frameworks such as React run in UXP panels after a local build step; UXP supports a subset of HTML and CSS, so check its API reference.

Next: /agent-context (2 Context & access), then /functional-copilot (3 Spec & build). Both start from this brief.

Full map: `video-editor.html` (open it in a browser).
