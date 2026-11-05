// What Northstar Legal remembers between calls and restarts: the story clock, the rules published to the
// copilot, and each matter's redlines, reasons, approval route, evidence and log. One JSON file beside
// the server (.state.json), written after every change, so a restart mid-rehearsal picks up where it was.
// `bun legal-system/reset.ts friday|fresh` writes a seed. Tested in state.test.ts.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SecurityEvidence } from "./evidence";
import { MATTER_IDS } from "./lib/matters";

export type ApproverId = "rachel" | "jordan" | "elena";

export type Decision = { approverId: ApproverId; status: "approved" | "sent_back" | "pending" | "queued"; at: string | null; comment: string };

export type MatterState = {
  matterId: string;
  stage: "unreviewed" | "reviewed" | "submitted" | "sent_back" | "resubmitted" | "approved";
  /** The person's own clause for a finding, keyed by finding ref ("F3"). A finding without one keeps the drafted redline. */
  redlines: Record<string, string>;
  /** The reason for a deviation Northstar accepts, keyed by finding ref. */
  reasons: Record<string, string>;
  route: Decision[];
  submittedAt: string | null;
  evidence: SecurityEvidence | null;
  log: { at: string; by: string; event: string }[];
};

export type PublishedRule = { id: string; version: number; publishedBy: string; publishedAt: string };

export type LegalState = { now: string; publishedRules: PublishedRule[]; matters: Record<string, MatterState> };

export const STATE_FILE = path.join(import.meta.dir, ".state.json");

const DATA = path.join(import.meta.dir, "../data");
const readJson = <T>(name: string) => JSON.parse(readFileSync(path.join(DATA, name), "utf8")) as T;

const STAGES: readonly MatterState["stage"][] = ["unreviewed", "reviewed", "submitted", "sent_back", "resubmitted", "approved"];

/** Friday 09:00, where slide 14 leaves the story: Acme sent back by Jordan Blake, its evidence in since 08:50. */
export function seedFriday(): LegalState {
  const { note: _note, ...state } = readJson<LegalState & { note?: string }>("friday-state.json");
  const { note: _evidenceNote, ...evidence } = readJson<SecurityEvidence & { note?: string }>("acme-security-evidence.json");
  const matter = state.matters[evidence.matterId];
  matter.evidence = evidence;
  const pieces = [evidence.soc2 ? `SOC 2 ${evidence.soc2.reportType} report` : null, evidence.penTest ? "pen-test summary" : null].filter(Boolean).join(" and ");
  matter.log.push({ at: evidence.receivedAt, by: "Acme Cloud", event: `Sent its ${pieces}` });
  return state;
}

/** Thursday 10:00, before anything: both matters unreviewed, no published rule. For trying the full review. */
export function seedFresh(): LegalState {
  const matters = Object.fromEntries(
    MATTER_IDS.map((matterId): [string, MatterState] => [
      matterId,
      { matterId, stage: "unreviewed", redlines: {}, reasons: {}, route: [], submittedAt: null, evidence: null, log: [] },
    ]),
  );
  return { now: "2026-11-05T10:00", publishedRules: [], matters };
}

/** The saved state, or the Friday seed when there is no file yet. A file that is not Northstar Legal state is refused, never read as empty. */
export function loadState(file: string): LegalState {
  if (!existsSync(file)) return seedFriday();
  const state = JSON.parse(readFileSync(file, "utf8")) as LegalState;
  const fix = "Run `bun legal-system/reset.ts friday` (or `fresh`) to start again.";
  if (typeof state?.now !== "string" || !Array.isArray(state.publishedRules) || typeof state.matters !== "object" || state.matters === null)
    throw new Error(`${file} is not Northstar Legal state. ${fix}`);
  for (const id of MATTER_IDS) {
    const matter = state.matters[id];
    if (!matter || matter.matterId !== id || !STAGES.includes(matter.stage)) throw new Error(`${file} has no valid state for matter ${id}. ${fix}`);
  }
  return state;
}

/** Writes the whole state, through a temporary file, so a crash mid-write leaves the last good state. */
export function saveState(file: string, s: LegalState): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(s, null, 2)}\n`);
  renameSync(temporary, file);
}
