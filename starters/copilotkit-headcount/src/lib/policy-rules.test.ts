// Every rule id the policy check cites has its written text, so expanding a check shows the rule.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateRequest } from "./headcount";
import { parsePolicyRules } from "./policy-rules";

const markdown = readFileSync(path.join(__dirname, "..", "data", "policies.md"), "utf8");

describe("parsePolicyRules", () => {
  const rules = parsePolicyRules(markdown);

  it("reads all eleven rules from policies.md, in order", () => {
    expect(Object.keys(rules)).toEqual([
      "POL-HC-01",
      "POL-HC-02",
      "POL-HC-03",
      "POL-HC-04",
      "POL-COMP-01",
      "POL-COMP-02",
      "POL-FIN-01",
      "POL-FIN-02",
      "POL-APR-01",
      "POL-APR-02",
      "POL-APR-03",
    ]);
  });

  it("keeps the title and the full rule text", () => {
    expect(rules["POL-APR-02"]).toEqual({
      id: "POL-APR-02",
      title: "CFO",
      text: "The CFO is added when the fully loaded annual cost is above $350,000, when the level is L7, or when the request is outside the plan (POL-HC-02).",
    });
    expect(rules["POL-COMP-01"].title).toBe("Bands");
  });

  it("has the text for every rule id the policy check cites", () => {
    const evaluation = evaluateRequest({
      id: "REQ-2027-021",
      teamId: "platform",
      roleTitle: "Senior Software Engineer",
      level: "L5",
      location: "New York",
      startQuarter: "Q1",
      type: "backfill",
      baseSalary: 225_000,
      justification: "One. Two.",
      aboveMidpointReason: "",
      planOffset: "",
      securityAccess: "",
    });
    for (const result of evaluation.results) expect(rules[result.ruleId], result.ruleId).toBeDefined();
  });
});
