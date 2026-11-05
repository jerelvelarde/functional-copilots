// Concept: learning from production, with a human in the loop.
//
// Read past approval decisions (approval-history.jsonl plus this session's), sort approver comments
// into reasons, find the send-back that keeps recurring, and draft a skill from a hand-written
// template. Nothing here calls a model: it is deterministic and works offline, so the demo is
// repeatable. A person publishes or dismisses the draft in the Insights panel; only published
// skills reach the agent.
//
// In production you would not write the classifier or the template. CopilotKit Intelligence's
// Automatic Learning reads real threads and proposes skills the same way, and a person still
// reviews them before they go live: https://docs.copilotkit.ai/intelligence/overview

import { getPerson, getTeam, type SkillCheck } from "./headcount";

export type DecisionKind = "approved" | "sent_back" | "rejected";

export type Decision = {
  id: string;
  submitted: string;
  team: string;
  role: string;
  level: string;
  location: string;
  type: string;
  approver: string;
  decision: DecisionKind;
  comment: string;
  /** Days the decision took to come back (approval-history.jsonl). Unknown for decisions made in this session. */
  cycleDays: number | null;
  source: "history" | "session";
};

/** A send-back, with the days it added: from the submission it bounced to the resubmission. */
export type SendBack = Decision & { daysAdded: number | null };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days a send-back added: from the date the request was submitted to the date it was resubmitted
 * (the next decision on the same id with a later "submitted" date). That is the delay, not
 * cycleDays, which is only how long the send-back took to arrive. Null when the request was not
 * resubmitted, and for this session's send-backs (the story clock has no later date).
 */
export function daysAdded(sendBack: Decision, decisions: Decision[]): number | null {
  if (sendBack.decision !== "sent_back" || sendBack.source === "session") return null;
  const resubmitted = decisions
    .filter((d) => d.id === sendBack.id && d.submitted > sendBack.submitted)
    .map((d) => d.submitted)
    .sort()[0];
  return resubmitted ? Math.round((Date.parse(resubmitted) - Date.parse(sendBack.submitted)) / DAY_MS) : null;
}

export function parseHistory(jsonl: string): Decision[] {
  return jsonl
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => ({ ...JSON.parse(line), source: "history" as const }));
}

// ---------------------------------------------------------------------------------------------
// 1. Classify each comment into a reason

export type ReasonKey = "security_access" | "fy_runrate_split" | "plan_fit" | "other";

export const REASONS: Record<ReasonKey, { label: string; pattern: RegExp | null; coveredBy?: string }> = {
  security_access: {
    label: "Missing security and access justification",
    pattern: /production access|admin rights|access justification|describe the access|\bsecurity\b/i,
  },
  fy_runrate_split: {
    label: "Show FY impact and annual run-rate separately",
    pattern: /run-?rate/i,
  },
  plan_fit: {
    label: "Outside the headcount plan",
    pattern: /no approved net-new|offset|outside (the )?plan/i,
    coveredBy: "POL-HC-02 (the copilot already checks it)",
  },
  other: { label: "Other", pattern: null },
};

export function classifyComment(comment: string): ReasonKey {
  for (const key of ["security_access", "fy_runrate_split", "plan_fit"] as const) {
    if (REASONS[key].pattern?.test(comment)) return key;
  }
  return "other";
}

// ---------------------------------------------------------------------------------------------
// 2. Group by reason, most send-backs first

export type ReasonGroup = {
  key: ReasonKey;
  label: string;
  coveredBy?: string;
  sendBacks: SendBack[];
  /** Every decision whose comment is about this reason, including approvals. */
  mentions: Decision[];
  teams: string[];
  /** Days added by the send-backs that were resubmitted (see daysAdded). Null when none was. */
  minDaysAdded: number | null;
  maxDaysAdded: number | null;
  totalDaysAdded: number | null;
};

export function groupFeedback(decisions: Decision[]): ReasonGroup[] {
  const groups = new Map<ReasonKey, ReasonGroup>();
  for (const decision of decisions) {
    const key = classifyComment(decision.comment);
    if (key === "other" && decision.decision !== "sent_back") continue;
    const group = groups.get(key) ?? {
      key,
      label: REASONS[key].label,
      coveredBy: REASONS[key].coveredBy,
      sendBacks: [],
      mentions: [],
      teams: [],
      minDaysAdded: null,
      maxDaysAdded: null,
      totalDaysAdded: null,
    };
    group.mentions.push(decision);
    if (decision.decision === "sent_back") group.sendBacks.push({ ...decision, daysAdded: daysAdded(decision, decisions) });
    if (!group.teams.includes(decision.team)) group.teams.push(decision.team);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const days = group.sendBacks.map((d) => d.daysAdded).filter((d): d is number => d !== null);
    group.minDaysAdded = days.length ? Math.min(...days) : null;
    group.maxDaysAdded = days.length ? Math.max(...days) : null;
    group.totalDaysAdded = days.length ? days.reduce((sum, d) => sum + d, 0) : null;
  }
  return [...groups.values()].sort((a, b) => b.sendBacks.length - a.sendBacks.length || b.mentions.length - a.mentions.length);
}

// ---------------------------------------------------------------------------------------------
// 3. Draft a skill for a recurring send-back that the written policy does not cover

export type SkillProposal = {
  id: string;
  reason: ReasonKey;
  title: string;
  /** The team the evidence comes from. The skill applies to that team's requests. */
  teamId: string;
  markdown: string;
  /** The section the skill asks for. Once published, the policy check enforces it (headcount.ts SkillCheck). */
  requires: SkillCheck["requires"];
  evidence: SendBack[];
};

/** A reason needs this many send-backs before we propose a skill for it. */
export const MIN_SEND_BACKS = 2;

/** Hand-written templates, one per reason we know how to turn into a skill. */
const TEMPLATES: Partial<Record<ReasonKey, (group: ReasonGroup, teamName: string) => Omit<SkillProposal, "evidence" | "teamId">>> = {
  security_access: (group, teamName) => {
    const ids = [...new Set(group.sendBacks.map((d) => d.id))].join(", ");
    return {
      id: "skill-security-access",
      reason: "security_access",
      title: `Security and access justification for ${teamName} roles`,
      requires: { field: "securityAccess", label: "Security and access", asks: "which systems, what access level, who reviews it" },
      markdown: [
        `# Skill: Security and access justification for ${teamName} roles`,
        "",
        "## When to use",
        `Every headcount request for ${teamName}. These roles get production access, join on-call or hold admin rights on infrastructure.`,
        "",
        "## What to do",
        'Add a "Security and access" section to the business case before it is submitted. Cover:',
        "- Which systems the person will access (for example production Kubernetes clusters, CI/CD, on-call paging).",
        "- What access level, and from when (read-only, deploy, admin).",
        `- Who reviews the access and how often (${getPerson("jordan").name}, ${getPerson("jordan").title}).`,
        "",
        "## Why",
        `Approvers sent ${group.sendBacks.length} ${teamName} requests back for this (${ids}).${addedDaysSentence(group)}`,
        "This is not in the written policy yet, so the copilot only knows it from this skill.",
      ].join("\n"),
    };
  },
};

/** " In the approval history, each one added 7 to 8 days before it was resubmitted (22 days in all)." */
export function addedDaysSentence(group: ReasonGroup): string {
  if (group.minDaysAdded === null) return "";
  const range = group.minDaysAdded === group.maxDaysAdded ? `${group.minDaysAdded}` : `${group.minDaysAdded} to ${group.maxDaysAdded}`;
  const dated = group.sendBacks.filter((d) => d.daysAdded !== null).length;
  const each = dated === 1 ? "it added" : "each one added";
  return ` In the approval history, ${each} ${range} days before it was resubmitted${dated > 1 ? ` (${group.totalDaysAdded} days in all)` : ""}.`;
}

export function proposeSkills(groups: ReasonGroup[]): SkillProposal[] {
  return groups.flatMap((group) => {
    const template = TEMPLATES[group.key];
    if (!template || group.coveredBy || group.sendBacks.length < MIN_SEND_BACKS) return [];
    const teams = group.sendBacks.map((d) => d.team);
    const teamId = teams.sort((a, b) => teams.filter((t) => t === b).length - teams.filter((t) => t === a).length)[0];
    return [{ ...template(group, getTeam(teamId).name), teamId, evidence: group.sendBacks }];
  });
}
