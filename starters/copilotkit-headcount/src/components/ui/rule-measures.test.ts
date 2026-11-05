// The figure each check tested, beside the line it was tested against, for the demo's step 3 draft
// (base edited to $225,000): the numbers come from evaluateRequest, never from this helper.

import { describe, expect, it } from "vitest";
import { evaluateRequest, type HeadcountRequest } from "@/lib/headcount";
import { blockerNeed, ruleMeasure } from "./rule-measures";

const draft: HeadcountRequest = {
  id: "REQ-2027-021",
  teamId: "platform",
  roleTitle: "Senior Software Engineer",
  level: "L5",
  location: "New York",
  startQuarter: "Q1",
  type: "net_new",
  baseSalary: 225_000,
  justification: "It unblocks the multi-region failover work planned for Q2. Without it, on-call stays on four people and failover slips to Q4.",
  aboveMidpointReason: "",
  planOffset: "",
  securityAccess: "",
};

describe("ruleMeasure", () => {
  const evaluation = evaluateRequest(draft);
  const measure = (ruleId: string) => ruleMeasure(evaluation.results.find((r) => r.ruleId === ruleId)!, evaluation, draft);

  it("sets the base beside the midpoint it went above (POL-COMP-01)", () => {
    expect(measure("POL-COMP-01")).toEqual({ value: "$225,000", threshold: "midpoint $212,000" });
  });

  it("sets the run-rate beside the CFO line (POL-APR-02)", () => {
    expect(measure("POL-APR-02")).toEqual({ value: "$362,250", threshold: "line $350,000" });
  });

  it("sets the FY2027 impact beside the budget left (POL-FIN-01)", () => {
    expect(measure("POL-FIN-01")).toEqual({ value: "$351,063", threshold: "$420,000 left" });
  });

  it("reads plan fit, lead time and required fields from the same evaluation", () => {
    expect(measure("POL-HC-02")).toEqual({ value: "1 left in Q1", threshold: "needs 1" });
    expect(measure("POL-HC-04")).toEqual({ value: "today Nov 5", threshold: "deadline Dec 3" });
    expect(measure("POL-HC-01")).toEqual({ value: "6 of 6 fields" });
  });
});

describe("blockerNeed: the header names what each blocker needs", () => {
  it("above the midpoint without a reason, POL-COMP-01 needs a reason", () => {
    const blockers = evaluateRequest(draft).blockers;
    expect(blockers.map((b) => [b.ruleId, blockerNeed(b)])).toEqual([["POL-COMP-01", "Needs a reason"]]);
  });

  it("a fresh draft from step 1 needs the type and the justification", () => {
    const fresh = { ...draft, type: null, justification: "", baseSalary: 212_000 };
    expect(evaluateRequest(fresh).blockers.map((b) => [b.ruleId, blockerNeed(b, fresh)])).toEqual([
      ["POL-HC-01", "Needs request type, justification"],
      ["POL-HC-02", "Needs a request type"],
    ]);
  });
});
