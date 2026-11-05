// "Threshold beside value": for each check, the figure that was tested and the line it was tested
// against, read from the evaluation evaluateRequest() returned. Nothing is computed here that the
// policy check did not already compute; this only picks the two numbers to set side by side.
// blockerNeed names what a blocking check needs, in a few words, for the Business case header.

import { CFO_THRESHOLD, latestApprovalDate, STORY_DATE, type Evaluation, type HeadcountRequest, type PolicyResult } from "@/lib/headcount";
import { dateLabel, usd } from "./format";

export type Measure = { value: string; threshold?: string };

const REQUIRED: (keyof HeadcountRequest)[] = ["roleTitle", "level", "location", "startQuarter", "type", "justification"];

const shortDate = (iso: string) => dateLabel(iso).replace(/, \d{4}$/, "");

export function ruleMeasure(result: PolicyResult, evaluation: Evaluation, request: HeadcountRequest): Measure | null {
  const { band, cost, plan, budget, approvers } = evaluation;
  switch (result.ruleId) {
    case "POL-HC-01": {
      const filled = REQUIRED.filter((field) => {
        const value = request[field];
        return typeof value === "string" ? value.trim() !== "" : value !== null;
      }).length;
      return { value: `${filled} of ${REQUIRED.length} fields` };
    }
    case "POL-HC-02":
      return plan ? { value: `${plan.remaining} left in ${plan.quarter}`, threshold: "needs 1" } : null;
    case "POL-HC-04":
      return request.startQuarter ? { value: `today ${shortDate(STORY_DATE)}`, threshold: `deadline ${shortDate(latestApprovalDate(request.startQuarter))}` } : null;
    case "POL-COMP-01": {
      if (!band || request.baseSalary === null) return null;
      const base = request.baseSalary;
      const threshold = base > band.max ? `max ${usd(band.max)}` : base < band.min ? `min ${usd(band.min)}` : `midpoint ${usd(band.mid)}`;
      return { value: usd(base), threshold };
    }
    case "POL-FIN-02":
      return cost ? { value: `${usd(cost.fullyLoadedAnnual)} a year` } : null;
    case "POL-FIN-01":
      return cost && budget ? { value: usd(cost.fiscalYearImpact), threshold: `${usd(budget.remaining)} left` } : null;
    case "POL-APR-01":
      return approvers.length ? { value: `${approvers.length} approvers` } : null;
    case "POL-APR-02":
      return cost ? { value: usd(cost.fullyLoadedAnnual), threshold: `line ${usd(CFO_THRESHOLD)}` } : null;
    default:
      return null;
  }
}

/** What a blocking check needs, in a few words: "Needs a reason" for POL-COMP-01 above the midpoint. */
export function blockerNeed(result: PolicyResult, request?: HeadcountRequest): string {
  const { ruleId, status, detail } = result;
  if (ruleId.startsWith("skill-")) return `Needs ${result.title.toLowerCase()}`;
  switch (ruleId) {
    case "POL-HC-01":
      return status === "missing" ? detail.replace(/^Missing: /, "Needs ").replace(/\.$/, "") : "Needs a two-sentence justification";
    case "POL-HC-02": {
      if (status !== "missing") return "Needs an offset";
      const needs = [!request?.startQuarter && "a start quarter", !request?.type && "a request type"].filter(Boolean);
      return request && needs.length ? `Needs ${needs.join(" and ")}` : "Needs a start quarter and type";
    }
    case "POL-HC-04":
      return status === "missing" ? "Needs a start quarter" : "Starts too soon";
    case "POL-COMP-02":
      return status === "missing" ? "Needs a location" : "No office there";
    case "POL-COMP-01":
      if (status === "missing") return "Needs level, location and base";
      return /midpoint/.test(detail) ? "Needs a reason" : /maximum/.test(detail) ? "Above the band maximum" : "Below the band";
    case "POL-FIN-01":
      return status === "missing" ? "Needs the cost" : "Over the budget left";
    case "POL-FIN-02":
    case "POL-APR-01":
      return "Needs a level, base and start";
    default:
      return detail;
  }
}
