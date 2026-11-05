// The learning beat from ../shared-data/README.md: three Platform send-backs for a missing
// security and access justification. Each took 4 to 6 days to come back (cycleDays), and each added
// 7 to 8 days before the request was resubmitted (the dates in approval-history.jsonl).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyComment, daysAdded, groupFeedback, parseHistory, proposeSkills, type Decision } from "./learning";

const history = parseHistory(readFileSync(new URL("../data/approval-history.jsonl", import.meta.url), "utf8"));

describe("learning from approval history", () => {
  it("reads all nine past decisions", () => {
    expect(history).toHaveLength(9);
  });

  it("finds the recurring send-back: security and access, 3 times, all Platform, 7 to 8 days added each (22 in all)", () => {
    const [top] = groupFeedback(history);
    expect(top.key).toBe("security_access");
    expect(top.sendBacks.map((d) => d.id)).toEqual(["REQ-2026-071", "REQ-2026-093", "REQ-2026-117"]);
    expect(top.teams).toEqual(["platform"]);
    expect(top.sendBacks.map((d) => d.daysAdded)).toEqual([7, 7, 8]);
    expect([top.minDaysAdded, top.maxDaysAdded, top.totalDaysAdded]).toEqual([7, 8, 22]);
  });

  it("days added come from the dates (submitted to resubmitted), not cycleDays (how long the send-back took)", () => {
    const sendBack = history.find((d) => d.id === "REQ-2026-071" && d.decision === "sent_back")!;
    expect(sendBack.cycleDays).toBe(4);
    expect(daysAdded(sendBack, history)).toBe(7); // 2026-05-04 to 2026-05-11
    const neverResubmitted = history.find((d) => d.id === "REQ-2026-121")!;
    expect(daysAdded(neverResubmitted, history)).toBeNull();
  });

  it("sees the smaller pattern: Finance wants FY impact and run-rate shown separately (no send-backs)", () => {
    const runRate = groupFeedback(history).find((g) => g.key === "fy_runrate_split");
    expect(runRate?.sendBacks).toHaveLength(0);
    expect(runRate?.mentions.map((d) => d.id)).toEqual(["REQ-2026-104", "REQ-2026-117"]);
  });

  it("proposes exactly one skill, for Platform, citing its evidence", () => {
    const proposals = proposeSkills(groupFeedback(history));
    expect(proposals).toHaveLength(1);
    expect(proposals[0].teamId).toBe("platform");
    expect(proposals[0].markdown).toContain('"Security and access" section');
    expect(proposals[0].markdown).toContain("REQ-2026-071, REQ-2026-093, REQ-2026-117");
    expect(proposals[0].markdown).toContain("each one added 7 to 8 days before it was resubmitted (22 days in all)");
    expect(proposals[0].markdown).not.toContain("4 to 6");
  });

  it("the proposed skill says which section it asks for, so the policy check can enforce it once published", () => {
    const [proposal] = proposeSkills(groupFeedback(history));
    expect(proposal.requires).toEqual({ field: "securityAccess", label: "Security and access", asks: "which systems, what access level, who reviews it" });
  });

  it("does not propose a skill for plan fit: the written policy (POL-HC-02) already covers it", () => {
    const planFit = groupFeedback(history).find((g) => g.key === "plan_fit");
    expect(planFit?.sendBacks).toHaveLength(1);
    expect(proposeSkills(groupFeedback(history)).some((p) => p.reason === "plan_fit")).toBe(false);
  });

  it("counts a send-back made in this session", () => {
    const session: Decision = {
      ...history[0],
      id: "REQ-2027-021",
      approver: "marcus",
      comment: "What production access does this role get?",
      cycleDays: null,
      source: "session",
    };
    const [top] = groupFeedback([...history, session]);
    expect(top.sendBacks).toHaveLength(4);
    // The live send-back is counted, but has no days: it was not resubmitted, and the story clock has no later date
    expect(top.sendBacks.at(-1)?.daysAdded).toBeNull();
    expect([top.minDaysAdded, top.maxDaysAdded, top.totalDaysAdded]).toEqual([7, 8, 22]);
    const [proposal] = proposeSkills([top]);
    expect(proposal.markdown).toContain("(REQ-2026-071, REQ-2026-093, REQ-2026-117, REQ-2027-021). In the approval history, each one added 7 to 8 days");
  });

  it("classifies comments by keyword", () => {
    expect(classifyComment("Please describe the access and who reviews it")).toBe("security_access");
    expect(classifyComment("Split FY impact from run-rate")).toBe("fy_runrate_split");
    expect(classifyComment("Approved.")).toBe("other");
  });
});
