// Concept: suggestions. Chips above the chat input, written the way the user would type them, that
// follow the draft's state so the next useful sentence is one click away (copilot/chips.ts):
// - no draft and nothing submitted: the opening requests;
// - a draft without its type and justification: the answer to the copilot's question;
// - a base above the midpoint with no reason: a reason, or going back to the midpoint;
// - a draft that is ready: "Submit it.";
// - after a submission: where the request is, and (once a person has published a skill in
//   Insights) the second request for the learning beat. Before that, it would spoil the beat.
// The opening sentence never shows while a draft is open. The scripted mock understands every chip
// (lib/demo-script.ts). ChatPanel.tsx draws them pinned above the composer.

import { useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { useAppState } from "@/lib/store";
import { chipsFor } from "./chips";

const chip = (sentence: string) => ({ title: sentence, message: sentence });

export function useSuggestionChips() {
  const chips = chipsFor(useAppState());
  useConfigureSuggestions({ available: "always", suggestions: chips.map(chip) }, [chips.join("|")]);
}
