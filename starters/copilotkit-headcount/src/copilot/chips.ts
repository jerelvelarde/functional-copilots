// Which suggestion chips to offer, from the app state alone, as a plain function so it is tested on
// its own (demo-script.test.ts checks the mock understands every chip at every step). No CopilotKit
// imports here; useSuggestionChips.ts hands the result to CopilotKit.

import { usd } from "@/components/ui/format";
import { getCompBand } from "@/lib/headcount";
import { evaluateInApp, type AppState } from "@/lib/store";

/** The answer to "net-new or a backfill, and what does it unblock?", per demo request (README steps 2 and 7). */
const DETAILS: Partial<Record<string, string>> = {
  "New York": "Net-new. It unblocks the multi-region failover work planned for Q2. Without it, on-call stays on four people and failover slips to Q4.",
  Austin: "Net-new. It puts a second SRE on the Austin on-call rotation. Without it, failover drills slip to Q3.",
};

export const OPENING_REQUEST = "I need approval to hire a senior engineer in New York next quarter.";

export function chipsFor(state: AppState): string[] {
  const { draft, requests, publishedSkills } = state;
  if (!draft) {
    if (requests.length === 0) return [OPENING_REQUEST, "How much headcount and budget does Platform have left in FY2027?"];
    return [...(publishedSkills.length > 0 ? ["I need approval to hire a senior SRE in Austin in Q2."] : []), "Where is my request in the approval chain?"];
  }
  const evaluation = evaluateInApp(state, draft);
  if (evaluation.readyToSubmit) return ["Submit it."];
  const band = draft.level && draft.location ? getCompBand(draft.level, draft.location) : null;
  if (band && draft.baseSalary !== null && draft.baseSalary > band.mid && !draft.aboveMidpointReason.trim()) {
    return ["Competing offer at $230,000.", `Revert to ${usd(band.mid)}`];
  }
  const details = draft.location ? DETAILS[draft.location] : undefined;
  if (details && (!draft.type || !draft.justification.trim())) {
    return [details, ...(draft.location !== "Austin" ? ["What would the same role cost in Austin?"] : [])];
  }
  return [];
}
