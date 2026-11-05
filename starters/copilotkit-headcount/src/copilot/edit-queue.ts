// The human edits waiting to be told to the agent (copilot/useTellCopilot.ts), as plain functions so
// they are tested on their own. No CopilotKit imports here. readEditMessage turns a sent edit message
// back into its parts, so the chat can show it as a quiet event row (copilot/ChatUserMessage.tsx).
//
// An edit made while the agent is busy (mid-reply, or waiting on the approval card) is queued, not
// dropped. Edits to the same field coalesce: the agent hears the value it last knew and the latest
// one ("from $212,000 to $224,000"), once.

import { quarterLabel, typeLabel, usd } from "@/components/ui/format";
import type { HeadcountRequest } from "@/lib/headcount";
import type { DraftEdit, DraftField } from "@/lib/store";

export type Edit = DraftEdit;

const LABELS: Record<DraftField, string> = {
  roleTitle: "the role title",
  level: "the level",
  location: "the location",
  startQuarter: "the start quarter",
  type: "the request type",
  baseSalary: "base salary",
  justification: "the justification",
  aboveMidpointReason: "the reason for going above the midpoint",
  planOffset: "the offset for going outside the plan",
  securityAccess: 'the "Security and access" section',
};

const TEXT_FIELDS: DraftField[] = ["justification", "aboveMidpointReason", "planOffset", "securityAccess"];

function show(field: DraftField, value: HeadcountRequest[DraftField]): string {
  if (value === null || value === "") return "empty";
  if (field === "baseSalary") return usd(value as number);
  if (field === "startQuarter") return quarterLabel(value as HeadcountRequest["startQuarter"] & string);
  if (field === "type") return typeLabel(value as HeadcountRequest["type"] & string);
  return String(value);
}

/** "I changed base salary from $212,000 to $225,000." */
export function describeEdit<F extends DraftField>(field: F, before: HeadcountRequest[F], after: HeadcountRequest[F]): string {
  const label = LABELS[field];
  if (TEXT_FIELDS.includes(field)) return `I updated ${label}: "${after}"`;
  if (before === null || before === "") return `I set ${label} to ${show(field, after)}.`;
  return `I changed ${label} from ${show(field, before)} to ${show(field, after)}.`;
}

/** Edit messages get ids with this prefix, so the chat can tell them from what a person typed. */
export const HUMAN_EDIT_ID_PREFIX = "human-edit-";

/** One sentence of an edit message, read back: what changed, from what, to what. */
export type EditLine =
  | { kind: "changed"; label: string; before: string; after: string }
  | { kind: "set"; label: string; after: string }
  | { kind: "updated"; label: string; text: string };

const escapeRegExp = (text: string) => text.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
const LABEL_PATTERN = Object.values(LABELS).map(escapeRegExp).join("|");
const NEXT_OR_END = `(?=\\s+I (?:changed|set|updated) (?:${LABEL_PATTERN})(?: from | to |: )|\\s*$)`;
/** A value in a "changed" or "set" sentence: anything but the end of a sentence. */
const VALUE = "((?:(?!\\. ).)+?)";
const EDIT_SENTENCE = new RegExp(
  `\\s*I (changed|set|updated) (${LABEL_PATTERN})(?: from ${VALUE} to ${VALUE}\\.${NEXT_OR_END}| to ${VALUE}\\.${NEXT_OR_END}|: "([\\s\\S]*?)"${NEXT_OR_END})`,
  "y",
);

/**
 * The parts of a message editMessage() wrote, in order, or null when the text is not one: the
 * inverse of describeEdit, for one edit or several merged into one message.
 */
export function readEditMessage(text: string): EditLine[] | null {
  const lines: EditLine[] = [];
  EDIT_SENTENCE.lastIndex = 0;
  const source = text.trimEnd();
  while (EDIT_SENTENCE.lastIndex < source.length) {
    const match = EDIT_SENTENCE.exec(source);
    if (!match) return null;
    const [, verb, label, before, after, setTo, updated] = match;
    if (verb === "changed" && before !== undefined && after !== undefined) lines.push({ kind: "changed", label, before, after });
    else if (verb === "set" && setTo !== undefined) lines.push({ kind: "set", label, after: setTo });
    else if (verb === "updated" && updated !== undefined) lines.push({ kind: "updated", label, text: updated });
    else return null;
  }
  return lines.length ? lines : null;
}

/** Add an edit. A second edit to the same field keeps the first "before" and takes the new "after". */
export function enqueueEdit(queue: readonly Edit[], edit: Edit): Edit[] {
  const index = queue.findIndex((e) => e.draftId === edit.draftId && e.field === edit.field);
  if (index === -1) return [...queue, edit];
  return queue.map((e, i) => (i === index ? { ...e, after: edit.after } : e));
}

/**
 * The message to send for the queued edits, oldest field first, or null when there is nothing to say.
 * Edits to a request that is no longer open are dropped: it was submitted or discarded with them, and
 * the agent hears about that from the approval card or the app context. So are edits that ended
 * where they started.
 */
export function editMessage(queue: readonly Edit[], openDraftId: string | null): string | null {
  const lines = queue
    .filter((e) => e.draftId === openDraftId && e.before !== e.after)
    .map((e) => describeEdit(e.field, e.before, e.after));
  return lines.length ? lines.join(" ") : null;
}

type AgentMessages = { role: string; toolCalls?: { id: string }[]; toolCallId?: string }[];

/**
 * True while the agent is mid-turn: running, or waiting on a tool call (the approval card waits for
 * a click). When `followUpPending` is set, a tool result with nothing after it also counts: CopilotKit
 * is about to send it back to the model in a follow-up run.
 */
export function isBusy(agent: { isRunning: boolean; messages: AgentMessages }, followUpPending = true): boolean {
  if (agent.isRunning) return true;
  const answered = new Set(agent.messages.filter((m) => m.role === "tool").map((m) => m.toolCallId));
  if (agent.messages.some((m) => m.role === "assistant" && m.toolCalls?.some((call) => !answered.has(call.id)))) return true;
  return followUpPending && agent.messages.at(-1)?.role === "tool";
}
