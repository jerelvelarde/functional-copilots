// Concept: shared state, two writers.
//
// One small store holds what the human and the agent both work on: the request draft, the submitted
// requests with their approval decisions, and the skills a person has published. The human writes
// from the panels; the agent writes through frontend tools (startRequest, updateRequest,
// submitForApproval). Cost, policy badges and the approver chain are never stored. They are derived
// from the draft with the pure functions in headcount.ts, so they recompute on every change,
// whoever made it.
//
// Two rules live here in code, not in the prompt: the agent never repurposes an open request for a
// new hire (startRequest refuses), and never overwrites a value the user set unless the user asked
// (agentUpdate refuses and says which fields, so the agent asks).
//
// Tool handlers read appStore.getState() at call time, so they always see the latest draft.
// The store persists to localStorage so a reload keeps the demo; "Reset demo" clears it. A saved
// demo that does not match the current data or shape is discarded on load (validateSavedState).

import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  CURRENT_TEAM,
  LEVELS,
  LOCATIONS,
  PERSON_IDS,
  QUARTERS,
  REQUEST_TYPES,
  SKILL_FIELDS,
  TEAM_IDS,
  emptyRequest,
  evaluateRequest,
  getPerson,
  skillRequirements,
  storyNow,
  type ApprovalStep,
  type Evaluation,
  type HeadcountRequest,
  type SkillCheck,
  type SkillField,
} from "./headcount";
import type { Decision, DecisionKind, SkillProposal } from "./learning";

export type Writer = "human" | "agent";
export type DraftField = Exclude<keyof HeadcountRequest, "id" | "teamId">;
export type DraftPatch = Partial<Pick<HeadcountRequest, DraftField>>;
/** One committed human edit, as the agent will hear about it (copilot/useTellCopilot.ts). */
export type DraftEdit<F extends DraftField = DraftField> = { draftId: string; field: F; before: HeadcountRequest[F]; after: HeadcountRequest[F] };

export const DRAFT_FIELDS = [
  "roleTitle",
  "level",
  "location",
  "startQuarter",
  "type",
  "baseSalary",
  "justification",
  "aboveMidpointReason",
  "planOffset",
  "securityAccess",
] as const satisfies readonly DraftField[];

export type ApprovalDecision = { approverId: string; decision: DecisionKind; comment: string; at: string };

export type SubmittedRequest = {
  request: HeadcountRequest;
  submittedAt: string;
  submittedVia: "panel" | "copilot";
  fullyLoadedAnnual: number;
  fiscalYearImpact: number;
  chain: ApprovalStep[];
  /** Decisions in the current round. */
  decisions: ApprovalDecision[];
  /** Decisions from earlier rounds (sent back, then resubmitted under the same id: POL-APR-03). */
  earlierDecisions: ApprovalDecision[];
  status: "pending" | "approved" | "sent_back" | "rejected";
};

/** A skill a person published. `version` goes up each time the same skill is published again. */
export type PublishedSkill = SkillCheck & { markdown: string; publishedAt: string };

export type AppState = {
  draft: HeadcountRequest | null;
  /** Who last wrote each field, so the panel can show what the copilot filled in. */
  editedBy: Partial<Record<DraftField, Writer>>;
  /** Set when a sent-back request is reopened: the comment travels with the draft. */
  sentBack: { approverId: string; comment: string } | null;
  requests: SubmittedRequest[];
  publishedSkills: PublishedSkill[];
  dismissedSkillIds: string[];
  nextRequestNumber: number;
};

const STORAGE_KEY = "northstar-headcount:v2";

const initialState: AppState = {
  draft: null,
  editedBy: {},
  sentBack: null,
  requests: [],
  publishedSkills: [],
  dismissedSkillIds: [],
  nextRequestNumber: 21, // REQ-2027-014 is already open; new requests start at REQ-2027-021.
};

let state: AppState = initialState;
const listeners = new Set<() => void>();

function setState(update: (current: AppState) => AppState) {
  state = update(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage full: the demo still works, it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

// ---------------------------------------------------------------------------------------------
// The saved demo, checked against the current data and shape before it is loaded

const oneOf = (ids: readonly string[], what: string) => z.string().refine((id) => ids.includes(id), { message: `unknown ${what}` });
const personId = oneOf(PERSON_IDS, "person");

const requestSchema = z
  .object({
    id: z.string().regex(/^REQ-\d{4}-\d{3,}$/),
    teamId: oneOf(TEAM_IDS, "team"),
    roleTitle: z.string(),
    level: z.enum(LEVELS).nullable(),
    location: z.enum(LOCATIONS).nullable(),
    startQuarter: z.enum(QUARTERS).nullable(),
    type: z.enum(REQUEST_TYPES).nullable(),
    baseSalary: z.number().int().positive().nullable(),
    justification: z.string(),
    aboveMidpointReason: z.string(),
    planOffset: z.string(),
    securityAccess: z.string(),
  })
  .strict();

const decisionSchema = z.object({ approverId: personId, decision: z.enum(["approved", "sent_back", "rejected"]), comment: z.string(), at: z.string() }).strict();

const savedStateSchema = z
  .object({
    draft: requestSchema.nullable(),
    editedBy: z.record(z.enum(DRAFT_FIELDS), z.enum(["human", "agent"])),
    sentBack: z.object({ approverId: personId, comment: z.string() }).strict().nullable(),
    requests: z.array(
      z
        .object({
          request: requestSchema,
          submittedAt: z.string(),
          submittedVia: z.enum(["panel", "copilot"]),
          fullyLoadedAnnual: z.number(),
          fiscalYearImpact: z.number(),
          chain: z.array(
            z.object({ personId, name: z.string(), title: z.string(), ruleId: z.enum(["POL-APR-01", "POL-APR-02"]), reason: z.string() }).strict(),
          ),
          decisions: z.array(decisionSchema),
          earlierDecisions: z.array(decisionSchema),
          status: z.enum(["pending", "approved", "sent_back", "rejected"]),
        })
        .strict(),
    ),
    publishedSkills: z.array(
      z
        .object({
          id: z.string(),
          version: z.number().int().positive(),
          title: z.string(),
          teamId: oneOf(TEAM_IDS, "team"),
          requires: z.object({ field: z.enum(SKILL_FIELDS), label: z.string(), asks: z.string() }).strict().nullable(),
          markdown: z.string(),
          publishedAt: z.string(),
        })
        .strict(),
    ),
    dismissedSkillIds: z.array(z.string()),
    nextRequestNumber: z.number().int().positive(),
  })
  .strict();

/** The saved demo if it matches the current enums, ids and shape; otherwise why not. */
export function validateSavedState(json: string): { ok: true; state: AppState } | { ok: false; reason: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: "it is not valid JSON" };
  }
  const result = savedStateSchema.safeParse(raw);
  if (result.success) return { ok: true, state: result.data };
  const issue = result.error.issues[0];
  return { ok: false, reason: `${issue.path.join(".") || "(root)"}: ${issue.message}` };
}

export const appStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Load the saved demo. Called once after the first render, so server and client HTML match. */
  hydrate() {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // No storage: start fresh.
    }
    if (!saved) return;
    const result = validateSavedState(saved);
    if (result.ok) {
      setState(() => result.state);
      return;
    }
    // Renamed data (a location, a team, a level) or an older save: starting clean beats crashing.
    console.warn(`[headcount] Discarded the saved demo, which does not match the current data (${result.reason}). Starting clean.`);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to remove.
    }
  },
};

/** For tests: back to a clean demo, without touching the page. */
export function resetStoreForTests() {
  state = initialState;
}

export function useAppState(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.getState, () => initialState);
}

// ---------------------------------------------------------------------------------------------
// What the policy check needs from the app: published skills, and requests approved in this session

/** FY impact of a team's requests fully approved in this session (committed, POL-FIN-01). Pending and sent-back ones don't count. */
export function approvedInSession(s: AppState, teamId: string, exceptId?: string): number {
  return s.requests
    .filter((r) => r.status === "approved" && r.request.teamId === teamId && r.request.id !== exceptId)
    .reduce((sum, r) => sum + r.fiscalYearImpact, 0);
}

/**
 * evaluateRequest with what the app knows. For a submitted request, pass when it was submitted:
 * only skills published by then apply, so "as submitted" means as submitted.
 */
export function evaluateInApp(s: AppState, request: HeadcountRequest, submittedAt?: string): Evaluation {
  const skills = submittedAt ? s.publishedSkills.filter((skill) => skill.publishedAt <= submittedAt) : s.publishedSkills;
  return evaluateRequest(request, { skills, approvedInSession: approvedInSession(s, request.teamId, request.id) });
}

/** The sections published skills ask for on this team's requests (the panel shows those fields). */
export function skillFields(s: AppState, teamId: string): SkillField[] {
  return skillRequirements(s.publishedSkills, teamId).map((skill) => skill.requires.field);
}

// ---------------------------------------------------------------------------------------------
// The draft

/** A new, empty draft: the panel's "Start a blank request". */
export function createDraft(): HeadcountRequest {
  const draft = emptyRequest(`REQ-2027-${String(state.nextRequestNumber).padStart(3, "0")}`, CURRENT_TEAM.id);
  setState((s) => ({ ...s, draft, editedBy: {}, sentBack: null, nextRequestNumber: s.nextRequestNumber + 1 }));
  return draft;
}

export function discardDraft() {
  setState((s) => ({ ...s, draft: null, editedBy: {}, sentBack: null }));
}

const isEmpty = (value: unknown) => value === null || value === "";
const changedFields = (current: HeadcountRequest, patch: DraftPatch) =>
  (Object.keys(patch) as DraftField[]).filter((field) => patch[field] !== undefined && patch[field] !== current[field]);

/** A person's edit in the Business case panel. Creates a draft if there is none. Returns the fields that changed. */
export function updateDraft(patch: DraftPatch, by: Writer): { draft: HeadcountRequest; changed: DraftField[] } {
  const current = state.draft ?? createDraft();
  const changed = changedFields(current, patch);
  const draft = { ...current, ...patch };
  const editedBy = { ...state.editedBy };
  for (const field of changed) editedBy[field] = by;
  setState((s) => ({ ...s, draft, editedBy }));
  return { draft, changed };
}

/** One line on the open draft, for messages: "REQ-2027-021 (Senior Software Engineer, L5, New York)". */
export function describeDraft(draft: HeadcountRequest): string {
  const parts = [draft.roleTitle, draft.level, draft.location].filter(Boolean);
  return parts.length ? `${draft.id} (${parts.join(", ")})` : draft.id;
}

export type StartResult =
  | { started: true; requestId: string; changed: DraftField[]; draft: HeadcountRequest }
  | { started: false; openRequestId: string; reason: string };

/**
 * The agent's startRequest tool: a new request for a new hire. Refuses while another request is open
 * in the Business case (a new hire must never overwrite it); an empty, untouched draft is reused.
 */
export function startRequest(fields: DraftPatch): StartResult {
  const open = state.draft;
  if (open && !DRAFT_FIELDS.every((field) => isEmpty(open[field]))) {
    const sentBack = state.sentBack ? `, sent back by ${getPerson(state.sentBack.approverId).name}` : "";
    return {
      started: false,
      openRequestId: open.id,
      reason: `${describeDraft(open)} is still open in the Business case${sentBack}. A new request would replace it, so nothing was started and nothing in it changed. Ask the user whether to submit it, discard it (the Discard button) or keep editing it; then start the new request.`,
    };
  }
  const current = open ?? createDraft();
  const changed = changedFields(current, fields);
  const draft = { ...current, ...fields };
  setState((s) => ({ ...s, draft, editedBy: Object.fromEntries(changed.map((field) => [field, "agent"])) }));
  return { started: true, requestId: draft.id, changed, draft };
}

export type AgentUpdateResult =
  | { ok: true; requestId: string; changed: DraftField[]; refused: { field: DraftField; userValue: unknown; proposed: unknown }[]; draft: HeadcountRequest }
  | { ok: false; error: string };

/**
 * The agent's updateRequest tool. Edits the open draft only (startRequest starts one). Never writes a
 * field the user set last, unless `userAsked` says the user asked for this change: those fields are
 * left alone and returned in `refused`, so the agent asks first.
 */
export function agentUpdate(patch: DraftPatch, userAsked = false): AgentUpdateResult {
  const current = state.draft;
  if (!current) return { ok: false, error: "No request is open. Use startRequest for a new hire." };
  const refused = changedFields(current, patch)
    .filter((field) => state.editedBy[field] === "human" && !userAsked)
    .map((field) => ({ field, userValue: current[field], proposed: patch[field] }));
  const allowed = Object.fromEntries(Object.entries(patch).filter(([field]) => !refused.some((r) => r.field === field))) as DraftPatch;
  const { draft, changed } = updateDraft(allowed, "agent");
  return { ok: true, requestId: draft.id, changed, refused, draft };
}

// ---------------------------------------------------------------------------------------------
// Submitting and approving

/** Only a person's click calls this: the panel's Submit button or the copilot's approval card. */
export function submitDraft(via: SubmittedRequest["submittedVia"]): SubmittedRequest {
  const draft = state.draft;
  if (!draft) throw new Error("There is no draft to submit.");
  const evaluation = evaluateInApp(state, draft);
  if (!evaluation.readyToSubmit || !evaluation.cost) {
    throw new Error(`Not ready: ${evaluation.blockers.map((b) => `${b.ruleId} ${b.detail}`).join(" ")}`);
  }
  const earlier = state.requests.find((r) => r.request.id === draft.id);
  const submitted: SubmittedRequest = {
    request: draft,
    submittedAt: storyNow(),
    submittedVia: via,
    fullyLoadedAnnual: evaluation.cost.fullyLoadedAnnual,
    fiscalYearImpact: evaluation.cost.fiscalYearImpact,
    chain: evaluation.approvers,
    decisions: [],
    earlierDecisions: earlier ? [...earlier.earlierDecisions, ...earlier.decisions] : [],
    status: "pending",
  };
  setState((s) => ({
    ...s,
    draft: null,
    editedBy: {},
    sentBack: null,
    requests: [submitted, ...s.requests.filter((r) => r.request.id !== draft.id)],
  }));
  return submitted;
}

/** The approver whose turn it is, or null when the request is no longer pending. */
export function currentStep(request: SubmittedRequest): ApprovalStep | null {
  if (request.status !== "pending") return null;
  return request.chain[request.decisions.length] ?? null;
}

export function recordDecision(requestId: string, decision: DecisionKind, comment: string) {
  setState((s) => ({
    ...s,
    requests: s.requests.map((r) => {
      const step = currentStep(r);
      if (r.request.id !== requestId || !step) return r;
      const decisions = [...r.decisions, { approverId: step.personId, decision, comment: comment.trim(), at: storyNow() }];
      const status: SubmittedRequest["status"] =
        decision === "approved" ? (decisions.length === r.chain.length ? "approved" : "pending") : decision;
      return { ...r, decisions, status };
    }),
  }));
}

/** POL-APR-03: a sent-back request keeps its id and returns to the requester with the comment. */
export function reopenRequest(requestId: string) {
  const request = state.requests.find((r) => r.request.id === requestId);
  const sentBack = request?.decisions.at(-1);
  if (!request || !sentBack) return;
  setState((s) => ({ ...s, draft: request.request, editedBy: {}, sentBack: { approverId: sentBack.approverId, comment: sentBack.comment } }));
}

/** This session's decisions, in the same shape as approval-history.jsonl, for the Insights panel. */
export function sessionDecisions(s: AppState): Decision[] {
  return s.requests.flatMap((r) =>
    [...r.earlierDecisions, ...r.decisions].map((d) => ({
      id: r.request.id,
      submitted: r.submittedAt.slice(0, 10),
      team: r.request.teamId,
      role: r.request.roleTitle,
      level: r.request.level ?? "",
      location: r.request.location ?? "",
      type: r.request.type ?? "",
      approver: d.approverId,
      decision: d.decision,
      comment: d.comment,
      cycleDays: null,
      source: "session" as const,
    })),
  );
}

// ---------------------------------------------------------------------------------------------
// Skills (published by a person in the Insights panel, read by the agent, enforced by the policy check)

export function publishSkill(proposal: SkillProposal) {
  const { id, title, teamId, markdown, requires } = proposal;
  const version = (state.publishedSkills.find((p) => p.id === id)?.version ?? 0) + 1;
  const skill: PublishedSkill = { id, version, title, teamId, requires, markdown, publishedAt: storyNow() };
  setState((s) => ({ ...s, publishedSkills: [...s.publishedSkills.filter((p) => p.id !== skill.id), skill] }));
}

export function dismissSkill(id: string) {
  setState((s) => ({ ...s, dismissedSkillIds: [...new Set([...s.dismissedSkillIds, id])] }));
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved.
  }
  window.location.reload();
}
