// The worked example from ../shared-data/README.md, number for number.
// If one of these fails, the demo would tell the audience a wrong number.

import { describe, expect, it } from "vitest";
import {
  STORY_DATE,
  calculateCost,
  checkBudgetFit,
  checkPlanFit,
  countSentences,
  earliestStartQuarter,
  emptyRequest,
  evaluateRequest,
  fiscalQuarterLabel,
  getCompBand,
  getTeam,
  latestApprovalDate,
  monthsInFiscalYear,
  nextQuarter,
  planSummary,
  routeApprovers,
  startDate,
  storyNow,
  type HeadcountRequest,
  type SkillCheck,
} from "./headcount";

const platform = getTeam("platform");

const danaRequest: HeadcountRequest = {
  ...emptyRequest("REQ-2027-021", "platform"),
  roleTitle: "Senior Software Engineer",
  level: "L5",
  location: "New York",
  startQuarter: "Q1",
  type: "net_new",
  baseSalary: 212_000,
  justification:
    "Unblocks the multi-region failover work planned for Q2. Without the hire, on-call load stays on four people and the failover slips to Q4.",
};

describe("worked example: L5 New York, Q1 FY2027, base $212,000", () => {
  it("plan fit: 2 approved for Q1, 1 already opened, 1 left (POL-HC-02)", () => {
    expect(checkPlanFit(platform, "Q1", "net_new")).toEqual({
      quarter: "Q1",
      approved: 2,
      opened: 1,
      remaining: 1,
      fits: true,
      skipped: false,
    });
  });

  it("band: L5 Tier 1 is $185,000 to $240,000, midpoint $212,000 (POL-COMP-01)", () => {
    expect(getCompBand("L5", "New York")).toMatchObject({ tier: "tier1", min: 185_000, mid: 212_000, max: 240_000 });
  });

  it("start date: Feb 1 2027, 11 months in FY2027, approve by Dec 3 2026 (POL-HC-04)", () => {
    expect(startDate("Q1")).toBe("2027-02-01");
    expect(monthsInFiscalYear("Q1")).toBe(11);
    expect(latestApprovalDate("Q1")).toBe("2026-12-03");
  });

  it("fully loaded annual: 212,000 + 31,800 + 45,000 + 38,160 + 16,960 = $343,920 (POL-FIN-02)", () => {
    const cost = calculateCost({ level: "L5", baseSalary: 212_000, startQuarter: "Q1" });
    expect(cost).toMatchObject({ base: 212_000, bonus: 31_800, equity: 45_000, benefits: 38_160, taxes: 16_960 });
    expect(cost.fullyLoadedAnnual).toBe(343_920);
  });

  it("FY2027 impact: 343,920 x 11/12 = 315,260, plus 19,000 one-time = $334,260 (POL-FIN-02)", () => {
    const cost = calculateCost({ level: "L5", baseSalary: 212_000, startQuarter: "Q1" });
    expect(cost.proratedAnnual).toBe(315_260);
    expect(cost.oneTime).toBe(19_000);
    expect(cost.fiscalYearImpact).toBe(334_260);
  });

  it("budget: 9,600,000 - 9,180,000 = $420,000 remaining; fits with $85,740 left (POL-FIN-01)", () => {
    expect(checkBudgetFit(platform, 334_260)).toEqual({
      budget: 9_600_000,
      committed: 9_180_000,
      approvedInSession: 0,
      remaining: 420_000,
      fiscalYearImpact: 334_260,
      leftAfter: 85_740,
      fits: true,
    });
  });

  it("approvers: Marcus (VP Engineering), then Priya (Finance BP); no CFO under $350,000 (POL-APR-01/02)", () => {
    const chain = routeApprovers({ team: platform, level: "L5", fullyLoadedAnnual: 343_920, outsidePlan: false });
    expect(chain.map((step) => step.name)).toEqual(["Marcus Lee", "Priya Raman"]);
  });

  it("the full policy check passes and the request is ready to submit", () => {
    const evaluation = evaluateRequest(danaRequest);
    expect(evaluation.blockers).toEqual([]);
    expect(evaluation.readyToSubmit).toBe(true);
    expect(evaluation.cost?.fiscalYearImpact).toBe(334_260);
    expect(evaluation.approvers.map((step) => step.personId)).toEqual(["marcus", "priya"]);
  });
});

describe("the live edit: base raised to $225,000", () => {
  const raised: HeadcountRequest = { ...danaRequest, baseSalary: 225_000 };

  it("fully loaded: 225,000 + 33,750 + 45,000 + 40,500 + 18,000 = $362,250", () => {
    const cost = calculateCost({ level: "L5", baseSalary: 225_000, startQuarter: "Q1" });
    expect(cost).toMatchObject({ bonus: 33_750, equity: 45_000, benefits: 40_500, taxes: 18_000 });
    expect(cost.fullyLoadedAnnual).toBe(362_250);
  });

  it("FY2027 impact: 362,250 x 11/12 + 19,000 = $351,063 (rounded), still inside the $420,000", () => {
    const cost = calculateCost({ level: "L5", baseSalary: 225_000, startQuarter: "Q1" });
    expect(cost.fiscalYearImpact).toBe(351_063);
    expect(checkBudgetFit(platform, cost.fiscalYearImpact).fits).toBe(true);
  });

  it("above the midpoint without a reason blocks the request (POL-COMP-01)", () => {
    const band = evaluateRequest(raised).results.find((r) => r.ruleId === "POL-COMP-01");
    expect(band?.status).toBe("fail");
    expect(evaluateRequest(raised).readyToSubmit).toBe(false);
  });

  it("a one-line reason clears it", () => {
    const evaluation = evaluateRequest({ ...raised, aboveMidpointReason: "Competing offer at $230,000." });
    expect(evaluation.results.find((r) => r.ruleId === "POL-COMP-01")?.status).toBe("pass");
    expect(evaluation.readyToSubmit).toBe(true);
  });

  it("Elena Ortiz (CFO) joins the chain because $362,250 is over $350,000 (POL-APR-02)", () => {
    const evaluation = evaluateRequest(raised);
    expect(evaluation.approvers.map((step) => step.name)).toEqual(["Marcus Lee", "Priya Raman", "Elena Ortiz"]);
    expect(evaluation.results.find((r) => r.ruleId === "POL-APR-02")?.status).toBe("warn");
  });
});

describe("the learning-beat request: senior SRE in Austin, Q2", () => {
  it("L5 Tier 2 midpoint $195,000; run-rate $319,950; 8 months; FY2027 impact $232,300; no CFO", () => {
    expect(getCompBand("L5", "Austin")).toMatchObject({ tier: "tier2", mid: 195_000 });
    const cost = calculateCost({ level: "L5", baseSalary: 195_000, startQuarter: "Q2" });
    expect(cost.fullyLoadedAnnual).toBe(319_950);
    expect(cost.monthsInFiscalYear).toBe(8);
    expect(cost.fiscalYearImpact).toBe(232_300);
    const evaluation = evaluateRequest({ ...danaRequest, roleTitle: "Senior Site Reliability Engineer", location: "Austin", startQuarter: "Q2", baseSalary: 195_000 });
    expect(evaluation.readyToSubmit).toBe(true);
    expect(evaluation.approvers.map((step) => step.personId)).toEqual(["marcus", "priya"]);
  });
});

describe("other rules", () => {
  it("POL-HC-01 lists what is missing from a fresh request", () => {
    const result = evaluateRequest(emptyRequest("REQ-2027-099")).results.find((r) => r.ruleId === "POL-HC-01");
    expect(result).toMatchObject({ status: "missing" });
    expect(result?.detail).toContain("request type");
    expect(result?.detail).toContain("justification");
  });

  it("POL-HC-01 needs a two-sentence justification", () => {
    const result = evaluateRequest({ ...danaRequest, justification: "We need more people." }).results[0];
    expect(result).toMatchObject({ ruleId: "POL-HC-01", status: "fail" });
  });

  it('POL-HC-01: "e.g." and "i.e." do not end a sentence', () => {
    expect(countSentences("It unblocks infra work, e.g. Kubernetes upgrades")).toBe(1);
    expect(countSentences("It unblocks the platform team, i.e. on-call. Without it, failover slips.")).toBe(2);
    expect(evaluateRequest({ ...danaRequest, justification: "It unblocks infra work, e.g. Kubernetes upgrades" }).results[0].status).toBe("fail");
  });

  it("POL-HC-02: Q4 has nothing left, so the request is outside the plan and the CFO joins", () => {
    const evaluation = evaluateRequest({ ...danaRequest, startQuarter: "Q4" });
    expect(evaluation.plan?.fits).toBe(false);
    expect(evaluation.approvers.at(-1)?.personId).toBe("elena");
    expect(evaluation.results.find((r) => r.ruleId === "POL-APR-02")?.detail).toContain("outside the headcount plan");
  });

  it("POL-HC-02: outside the plan blocks until an offsetting reduction or new budget is named (policies.md)", () => {
    const outside = evaluateRequest({ ...danaRequest, startQuarter: "Q4" });
    expect(outside.results.find((r) => r.ruleId === "POL-HC-02")).toMatchObject({ status: "fail" });
    expect(outside.readyToSubmit).toBe(false);

    const offset = evaluateRequest({ ...danaRequest, startQuarter: "Q4", planOffset: "Close REQ-2027-014 (L4 SRE, Austin) instead." });
    expect(offset.results.find((r) => r.ruleId === "POL-HC-02")).toMatchObject({ status: "warn" });
    expect(offset.readyToSubmit).toBe(true);
    expect(offset.approvers.map((step) => step.personId)).toEqual(["marcus", "priya", "elena"]); // POL-APR-02 still adds the CFO
  });

  it("POL-HC-02: an in-plan request needs no offset", () => {
    expect(evaluateRequest(danaRequest).results.find((r) => r.ruleId === "POL-HC-02")?.status).toBe("pass");
  });

  it("POL-HC-03: a backfill skips the plan check", () => {
    expect(checkPlanFit(platform, "Q4", "backfill").fits).toBe(true);
  });

  it("POL-COMP-02: Platform has no Seattle office", () => {
    const result = evaluateRequest({ ...danaRequest, location: "Seattle" }).results.find((r) => r.ruleId === "POL-COMP-02");
    expect(result?.status).toBe("fail");
  });

  it("POL-APR-02: L7 always needs the CFO", () => {
    const chain = routeApprovers({ team: platform, level: "L7", fullyLoadedAnnual: 300_000, outsidePlan: false });
    expect(chain.at(-1)?.personId).toBe("elena");
  });

  it("POL-FIN-02: agency recruiting is 20% of base instead of $15,000", () => {
    expect(calculateCost({ level: "L5", baseSalary: 212_000, startQuarter: "Q1", agency: true }).recruiting).toBe(42_400);
  });
});

describe("budget: committed includes requests fully approved in this session (POL-FIN-01)", () => {
  it("an approved request's FY impact lowers what is left; the seed numbers are unchanged", () => {
    const fit = checkBudgetFit(platform, 232_300, 351_063);
    expect(fit).toMatchObject({ committed: 9_531_063, approvedInSession: 351_063, remaining: 68_937, leftAfter: -163_363, fits: false });
    expect(planSummary(platform, 351_063).budget.remaining).toBe(68_937);
    expect(planSummary(platform).budget.remaining).toBe(420_000);
  });

  it("the policy check uses it: Austin fails POL-FIN-01 once New York is approved, passes while it is only sent back", () => {
    const austin: HeadcountRequest = { ...danaRequest, id: "REQ-2027-022", location: "Austin", startQuarter: "Q2", baseSalary: 195_000 };
    expect(evaluateRequest(austin).results.find((r) => r.ruleId === "POL-FIN-01")?.status).toBe("pass");
    expect(evaluateRequest(austin, { approvedInSession: 351_063 }).results.find((r) => r.ruleId === "POL-FIN-01")?.status).toBe("fail");
  });
});

describe("published skills are enforced by the policy check", () => {
  const skill: SkillCheck = {
    id: "skill-security-access",
    version: 1,
    title: "Security and access justification for Platform Infrastructure roles",
    teamId: "platform",
    requires: { field: "securityAccess", label: "Security and access", asks: "which systems, what access level, who reviews it" },
  };
  const austin: HeadcountRequest = { ...danaRequest, id: "REQ-2027-022", roleTitle: "Senior Site Reliability Engineer", location: "Austin", startQuarter: "Q2", baseSalary: 195_000 };

  it("adds a row citing the skill's id and version, missing until the section is filled", () => {
    const evaluation = evaluateRequest(austin, { skills: [skill] });
    const row = evaluation.results.at(-1);
    expect(row).toMatchObject({ ruleId: "skill-security-access v1", title: "Security and access", status: "missing" });
    expect(row?.detail).toContain("which systems, what access level, who reviews it");
    expect(evaluation.readyToSubmit).toBe(false);
    // The numbers stay the README's
    expect(evaluation.cost?.fullyLoadedAnnual).toBe(319_950);
    expect(evaluation.cost?.fiscalYearImpact).toBe(232_300);
  });

  it("passes once the section is filled", () => {
    const evaluation = evaluateRequest({ ...austin, securityAccess: "Production Kubernetes, read-only at first, reviewed by Jordan Blake." }, { skills: [skill] });
    expect(evaluation.results.at(-1)).toMatchObject({ ruleId: "skill-security-access v1", status: "pass" });
    expect(evaluation.readyToSubmit).toBe(true);
  });

  it("applies only to the skill's team, and only when it asks for a section", () => {
    expect(evaluateRequest({ ...austin, teamId: "data", location: "Remote (US)" }, { skills: [skill] }).results.some((r) => r.ruleId.startsWith("skill-"))).toBe(false);
    expect(evaluateRequest(austin, { skills: [{ ...skill, requires: null }] }).results.some((r) => r.ruleId.startsWith("skill-"))).toBe(false);
    expect(evaluateRequest(austin, { skills: [{ ...skill, version: 2 }] }).results.at(-1)?.ruleId).toBe("skill-security-access v2");
  });
});

describe("the calendar, worked out in code (the model never does date arithmetic)", () => {
  it("on the story date: Q4 FY2026 now, next quarter is Q1 FY2027, and Q1 is still reachable (POL-HC-04)", () => {
    expect(fiscalQuarterLabel(STORY_DATE)).toBe("Q4 FY2026");
    expect(nextQuarter(STORY_DATE)).toBe("Q1");
    expect(earliestStartQuarter(STORY_DATE)).toBe("Q1");
  });

  it("later dates move both", () => {
    expect(nextQuarter("2027-02-10")).toBe("Q2");
    expect(nextQuarter("2026-05-01")).toBeNull(); // Q3 2026 is not in the FY2027 plan
    expect(earliestStartQuarter("2026-12-04")).toBe("Q2"); // a day after Q1's approve-by date
    expect(earliestStartQuarter("2027-09-03")).toBeNull();
  });

  it("stamps dates on the story clock", () => {
    expect(storyNow(new Date("2031-03-03T14:15:16.000Z"))).toBe("2026-11-05T14:15:16.000Z");
  });
});
