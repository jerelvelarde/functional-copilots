// The cost statement, as computed by calculateCost(): every line reads as its formula, so the
// numbers can be checked by eye. Used live in the Business case and as a snapshot in the chat card.
// Annual run-rate and FY impact are shown separately (Finance asked). The rates on the formula lines
// are the cost model's inputs (company.json); every amount comes from calculateCost and checkBudgetFit.

import company from "@/data/company.json";
import { CFO_THRESHOLD, FISCAL_YEAR, type BudgetFit, type CostBreakdown, type Level } from "@/lib/headcount";
import { Figure } from "./Figure";
import { usd } from "./format";

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

function Line({ label, formula, value, rule, strong, tone }: { label: string; formula?: string; value: number; rule?: string; strong?: boolean; tone?: "bad" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[2px]">
      <dt className={`min-w-0 ${strong ? "font-semibold text-ink" : "text-ink"}`}>
        {label}
        {formula && <span className="font-normal text-muted"> · {formula}</span>}
      </dt>
      <dd className="flex shrink-0 items-baseline gap-2">
        {rule && <span className="font-mono text-small text-muted">{rule}</span>}
        <Figure value={value} className={`${strong ? "font-semibold" : ""} ${tone === "bad" ? "text-red" : ""}`} />
      </dd>
    </div>
  );
}

const Rule = ({ double }: { double?: boolean }) => <div className={double ? "my-1 h-[3px] border-y border-hairline" : "my-1 border-t border-hairline"} />;

export function CostTable({ cost, budget, level, compact = false }: { cost: CostBreakdown; budget?: BudgetFit | null; level: Level; compact?: boolean }) {
  const model = company.costModel;
  const overCfo = cost.fullyLoadedAnnual > CFO_THRESHOLD;
  return (
    <dl className="text-body">
      <Line label="Base salary" value={cost.base} />
      <Line label="Target bonus" formula={`${percent(model.targetBonusRateByLevel[level])} of base`} value={cost.bonus} />
      <Line label="Annual equity" formula={`${level} grant`} value={cost.equity} />
      <Line label="Benefits" formula={`${percent(model.benefitsRate)} of base`} value={cost.benefits} />
      <Line label="Employer taxes" formula={`${percent(model.employerTaxRate)} of base`} value={cost.taxes} />
      <Rule />
      <Line label="Annual run-rate" value={cost.fullyLoadedAnnual} rule={overCfo ? "POL-APR-02" : undefined} strong />
      <p className={`pb-1 text-small ${overCfo ? "text-ink" : "text-muted"}`}>
        {overCfo ? `Over the ${usd(CFO_THRESHOLD)} line, so the CFO joins the chain` : `Fully loaded. Under the ${usd(CFO_THRESHOLD)} CFO line`}
      </p>
      <Line label={`${cost.monthsInFiscalYear} of 12 months`} formula={`in ${FISCAL_YEAR}`} value={cost.proratedAnnual} />
      <Line label="One-time" formula={compact ? "recruiting + equipment" : `recruiting ${usd(cost.recruiting)} + equipment ${usd(cost.equipment)}`} value={cost.oneTime} />
      <Rule />
      <Line label={`${FISCAL_YEAR} impact`} value={cost.fiscalYearImpact} rule="POL-FIN-02" strong />
      {budget && (
        <>
          <Line label="Budget remaining" value={budget.remaining} />
          <Rule double />
          <Line label="Left after this hire" value={budget.leftAfter} rule="POL-FIN-01" strong tone={budget.fits ? undefined : "bad"} />
        </>
      )}
    </dl>
  );
}
