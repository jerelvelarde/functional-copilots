// A source pill names where the value came from, and only what the code can show.

import { describe, expect, it } from "vitest";
import { emptyRequest, getCompBand } from "@/lib/headcount";
import { fieldSource } from "./field-sources";

const draft = { ...emptyRequest("REQ-2027-021"), level: "L5", location: "New York", startQuarter: "Q1", baseSalary: 212_000 } as const;
const band = getCompBand("L5", "New York");

describe("fieldSource", () => {
  it("names the band midpoint and next quarter when the values are exactly those", () => {
    expect(fieldSource("baseSalary", "agent", draft, band)).toBe("copilot · L5 Tier 1 midpoint");
    expect(fieldSource("startQuarter", "agent", draft, band)).toBe("copilot · next quarter (Q1)");
    expect(fieldSource("startQuarter", "agent", { ...draft, startQuarter: "Q2" }, band)).toBe("copilot · from your request");
    expect(fieldSource("baseSalary", "agent", { ...draft, baseSalary: 220_000 }, band)).toBe("copilot · proposed");
  });

  it("says the person's edit is theirs, and an untouched field says nothing", () => {
    expect(fieldSource("baseSalary", "human", draft, band)).toBe("edited by you");
    expect(fieldSource("justification", undefined, draft, band)).toBeNull();
    expect(fieldSource("justification", "agent", draft, band)).toBe("copilot · from your answer");
  });
});
