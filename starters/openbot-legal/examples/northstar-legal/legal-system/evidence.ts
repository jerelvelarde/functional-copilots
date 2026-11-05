// PB-SEC-01, the rule Rachel Adler published on Thursday: for a vendor that processes Northstar customer
// data, the SOC 2 Type II report and the latest pen-test summary before signing. This checks what the
// vendor sent, line by line, in code: the copilot shows the lines, it never decides them. Pure: tested
// in evidence.test.ts.

export type SecurityEvidence = {
  matterId: string;
  /** When the evidence arrived, on the story clock: "2026-11-06T08:50". */
  receivedAt: string;
  soc2: { reportType: "Type I" | "Type II"; auditor: string; periodStart: string; periodEnd: string } | null;
  penTest: { firm: string; completedOn: string; openCritical: number; openHigh: number } | null;
};

export type EvidenceLine = { check: string; status: "pass" | "fail"; detail: string; rule: "PB-SEC-01" };

/** The four checks, in the order the table shows them. */
export const EVIDENCE_CHECKS = [
  "SOC 2 Type II report on file",
  "Audit period ended within 12 months",
  "Pen test completed within 12 months",
  "No open critical or high findings",
] as const;

/**
 * "Within 12 months" of `asOf`: on or after the same day 12 calendar months earlier. A day that month
 * does not have (Feb 29) becomes its last day. Dates are ISO "YYYY-MM-DD"; a timestamp is read as its date.
 */
export function twelveMonthsBefore(asOf: string): string {
  const [year, month, day] = asOf.slice(0, 10).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year - 1}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
}

const plural = (n: number, word: string) => `${n} open ${word} ${n === 1 ? "finding" : "findings"}`;

export function checkSecurityEvidence(e: SecurityEvidence | null, asOf: string): { passed: boolean; lines: EvidenceLine[] } {
  const today = asOf.slice(0, 10);
  const cutoff = twelveMonthsBefore(today);
  const line = (index: number, ok: boolean, detail: string): EvidenceLine => ({ check: EVIDENCE_CHECKS[index], status: ok ? "pass" : "fail", detail, rule: "PB-SEC-01" });
  const soc2 = e?.soc2 ?? null;
  const pen = e?.penTest ?? null;
  const recent = (date: string) => date.slice(0, 10) >= cutoff;

  const lines = [
    soc2 === null
      ? line(0, false, "No SOC 2 report on file. PB-SEC-01 asks for the SOC 2 Type II report.")
      : soc2.reportType === "Type II"
        ? line(0, true, `SOC 2 Type II by ${soc2.auditor}, audit period ${soc2.periodStart} to ${soc2.periodEnd}.`)
        : line(0, false, `The SOC 2 report on file is ${soc2.reportType} (by ${soc2.auditor}). PB-SEC-01 asks for Type II, which tests the controls over a period.`),
    soc2 === null
      ? line(1, false, "No SOC 2 report on file, so no audit period to check.")
      : recent(soc2.periodEnd)
        ? line(1, true, `Audit period ended ${soc2.periodEnd}, within 12 months of ${today}.`)
        : line(1, false, `Audit period ended ${soc2.periodEnd}, more than 12 months before ${today}. PB-SEC-01 asks for one that ended on or after ${cutoff}.`),
    pen === null
      ? line(2, false, "No pen-test summary on file. PB-SEC-01 asks for the latest one.")
      : recent(pen.completedOn)
        ? line(2, true, `Pen test by ${pen.firm}, completed ${pen.completedOn}, within 12 months of ${today}.`)
        : line(2, false, `Pen test by ${pen.firm} completed ${pen.completedOn}, more than 12 months before ${today}. PB-SEC-01 asks for one completed on or after ${cutoff}.`),
    pen === null
      ? line(3, false, "No pen-test summary on file, so no findings to check.")
      : pen.openCritical === 0 && pen.openHigh === 0
        ? line(3, true, "0 open critical and 0 open high findings.")
        : line(
            3,
            false,
            `${[pen.openCritical ? plural(pen.openCritical, "critical") : null, pen.openHigh ? plural(pen.openHigh, "high") : null].filter(Boolean).join(" and ")} in the pen-test summary. PB-SEC-01 asks for none.`,
          ),
  ];
  return { passed: lines.every((l) => l.status === "pass"), lines };
}
