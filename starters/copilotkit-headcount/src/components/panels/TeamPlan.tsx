// The team's FY2027 plan in one line, from headcount-plan.json: net-new reqs left per start quarter,
// and the budget remaining with how much of it is committed. "Committed" is the plan's figure plus
// requests fully approved in this demo (POL-FIN-01); pending and sent-back requests do not count, and
// approved requests are not written back to the quarter slots. The strip says so on its info mark.

import { Info } from "lucide-react";
import { Figure } from "@/components/ui/Figure";
import { usd } from "@/components/ui/format";
import { CURRENT_TEAM, FISCAL_YEAR, planSummary, type Quarter } from "@/lib/headcount";
import { approvedInSession, useAppState } from "@/lib/store";

const millions = (amount: number) => `$${(amount / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;

export function TeamPlan() {
  const state = useAppState();
  const plan = planSummary(CURRENT_TEAM, approvedInSession(state, CURRENT_TEAM.id));
  const draftQuarter: Quarter | null = state.draft?.startQuarter ?? null;
  const { budget } = plan;
  const committedShare = Math.min(1, budget.committed / budget.budget);
  const committedMeans = `Committed is the plan's figure${
    budget.approvedInSession > 0 ? `, plus ${usd(budget.approvedInSession)} approved here` : " plus requests fully approved here"
  }. Pending and sent-back requests are not counted.`;

  return (
    <section aria-label={`${plan.team} ${FISCAL_YEAR} plan`} className="pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-hairline bg-surface px-4 py-2 @4xl:h-10 @4xl:flex-nowrap @4xl:py-0">
        <span className="whitespace-nowrap text-small text-muted" title={`${plan.team}, ${plan.currentHeadcount} people`}>
          {FISCAL_YEAR} plan
        </span>
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {plan.quarters.map((q) => (
            <div
              key={q.quarter}
              className={`flex items-baseline gap-1.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 ${q.quarter === draftQuarter ? "bg-stone" : ""}`}
              title={q.quarter === draftQuarter ? "This request starts in this quarter" : undefined}
            >
              <dt className="text-small text-muted">{q.quarter}</dt>
              <dd className={`font-semibold ${q.remaining > 0 ? "text-ink" : "text-muted"}`}>{q.remaining} left</dd>
              <dd className="text-small text-muted">
                of {q.approvedNetNew}
                {q.quarter === draftQuarter && <span className="sr-only"> (this request&apos;s quarter)</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 @4xl:ml-auto @4xl:flex-nowrap">
          <span className="whitespace-nowrap">
            <span className="text-small text-muted">Budget </span>
            <Figure value={budget.remaining} className="font-semibold" />
            <span className="text-small text-muted"> left</span>
          </span>
          <span
            role="img"
            aria-label={`${millions(budget.committed)} of ${millions(budget.budget)} committed`}
            className="relative h-1 w-14 shrink-0 overflow-hidden rounded-full bg-hairline"
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${committedShare * 100}%` }} />
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-small text-muted" title={committedMeans}>
            {millions(budget.committed)} of {millions(budget.budget)} committed
            <Info aria-hidden className="size-3.5" strokeWidth={2} />
            <span className="sr-only">{committedMeans}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
