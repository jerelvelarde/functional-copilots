// Where a field's value came from, as far as the code knows: who wrote it last (the store's editedBy)
// and, for the copilot, the evidence the value carries. A base equal to the band midpoint says so; a
// start quarter equal to "next quarter" on the story clock says so; anything else the copilot filled
// came from the request or from the person's answer in the chat. Nothing here guesses beyond that.

import { STORY_DATE, nextQuarter, type CompBand, type HeadcountRequest } from "@/lib/headcount";
import type { DraftField, Writer } from "@/lib/store";

const FROM_ANSWER: DraftField[] = ["type", "justification", "aboveMidpointReason", "planOffset"];

export function fieldSource(field: DraftField, writer: Writer | undefined, draft: HeadcountRequest, band: CompBand | null): string | null {
  if (!writer) return null;
  if (writer === "human") return "edited by you";
  if (field === "baseSalary") {
    return band && draft.baseSalary === band.mid ? `copilot · ${band.level} ${band.tier.replace("tier", "Tier ")} midpoint` : "copilot · proposed";
  }
  if (field === "startQuarter" && draft.startQuarter && draft.startQuarter === nextQuarter(STORY_DATE)) return `copilot · next quarter (${draft.startQuarter})`;
  if (field === "securityAccess") return "copilot · drafted for the skill";
  return FROM_ANSWER.includes(field) ? "copilot · from your answer" : "copilot · from your request";
}
