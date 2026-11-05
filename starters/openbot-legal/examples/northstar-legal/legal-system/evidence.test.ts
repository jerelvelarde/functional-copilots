// PB-SEC-01's evidence check: four lines, each pass or fail with what is missing, decided in code.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkSecurityEvidence, type SecurityEvidence } from "./evidence";

const acme = JSON.parse(readFileSync(path.join(import.meta.dir, "../data/acme-security-evidence.json"), "utf8")) as SecurityEvidence;
const FRIDAY = "2026-11-06";
const CHECKS = ["SOC 2 Type II report on file", "Audit period ended within 12 months", "Pen test completed within 12 months", "No open critical or high findings"];

const failing = (result: ReturnType<typeof checkSecurityEvidence>) => result.lines.filter((l) => l.status === "fail").map((l) => l.check);

describe("Acme's SOC 2 Type II report and pen-test summary", () => {
  test("arrived Friday at 08:50, Type II, audit period to 2026-06-30, pen test 2026-09-15 with nothing open", () => {
    expect(acme.matterId).toBe("acme-msa");
    expect(acme.receivedAt).toBe("2026-11-06T08:50");
    expect(acme.soc2).toMatchObject({ reportType: "Type II", periodStart: "2025-07-01", periodEnd: "2026-06-30" });
    expect(acme.penTest).toMatchObject({ completedOn: "2026-09-15", openCritical: 0, openHigh: 0 });
  });

  test("passes all four lines, in order, each citing PB-SEC-01", () => {
    const result = checkSecurityEvidence(acme, FRIDAY);
    expect(result.passed).toBe(true);
    expect(result.lines.map((l) => [l.check, l.status, l.rule])).toEqual(CHECKS.map((check) => [check, "pass", "PB-SEC-01"]));
    expect(result.lines[0].detail).toContain(acme.soc2!.auditor);
    expect(result.lines[1].detail).toContain("2026-06-30");
    expect(result.lines[2].detail).toContain("2026-09-15");
  });

  test("accepts a timestamp as the date it is checked on", () => {
    expect(checkSecurityEvidence(acme, "2026-11-06T09:00").passed).toBe(true);
  });
});

describe("stale, partial or missing evidence fails the line it breaks", () => {
  test("a Type I report fails line 1", () => {
    const result = checkSecurityEvidence({ ...acme, soc2: { ...acme.soc2!, reportType: "Type I" } }, FRIDAY);
    expect(result.passed).toBe(false);
    expect(failing(result)).toEqual(["SOC 2 Type II report on file"]);
    expect(result.lines[0].detail).toMatch(/Type I\b/);
    expect(result.lines[0].detail).toContain("Type II");
  });

  test("an audit period that ended 2025-06-30 fails line 2", () => {
    const result = checkSecurityEvidence({ ...acme, soc2: { ...acme.soc2!, periodStart: "2024-07-01", periodEnd: "2025-06-30" } }, FRIDAY);
    expect(result.passed).toBe(false);
    expect(failing(result)).toEqual(["Audit period ended within 12 months"]);
    expect(result.lines[1].detail).toContain("2025-06-30");
    expect(result.lines[1].detail).toContain("2025-11-06");
  });

  test("12 calendar months to the day: on the cutoff passes, the day before fails", () => {
    const on = checkSecurityEvidence({ ...acme, soc2: { ...acme.soc2!, periodEnd: "2025-11-06" } }, FRIDAY);
    const before = checkSecurityEvidence({ ...acme, soc2: { ...acme.soc2!, periodEnd: "2025-11-05" } }, FRIDAY);
    expect(on.lines[1].status).toBe("pass");
    expect(before.lines[1].status).toBe("fail");
  });

  test("a pen test over 12 months old fails line 3", () => {
    const result = checkSecurityEvidence({ ...acme, penTest: { ...acme.penTest!, completedOn: "2025-08-01" } }, FRIDAY);
    expect(failing(result)).toEqual(["Pen test completed within 12 months"]);
    expect(result.lines[2].detail).toContain("2025-08-01");
  });

  test("one open high finding fails line 4", () => {
    const result = checkSecurityEvidence({ ...acme, penTest: { ...acme.penTest!, openHigh: 1 } }, FRIDAY);
    expect(result.passed).toBe(false);
    expect(failing(result)).toEqual(["No open critical or high findings"]);
    expect(result.lines[3].detail).toContain("1 open high finding");
  });

  test("a missing pen-test summary fails lines 3 and 4", () => {
    const result = checkSecurityEvidence({ ...acme, penTest: null }, FRIDAY);
    expect(failing(result)).toEqual(["Pen test completed within 12 months", "No open critical or high findings"]);
    expect(result.lines[2].detail).toContain("No pen-test summary");
  });

  test("no evidence at all fails all four, each saying what is missing", () => {
    const result = checkSecurityEvidence(null, FRIDAY);
    expect(result.passed).toBe(false);
    expect(result.lines.map((l) => [l.check, l.status])).toEqual(CHECKS.map((check) => [check, "fail"]));
    expect(result.lines[0].detail).toContain("No SOC 2 report");
    expect(result.lines[1].detail).toContain("No SOC 2 report");
    expect(result.lines[2].detail).toContain("No pen-test summary");
    expect(result.lines[3].detail).toContain("No pen-test summary");
  });
});
