// Concept: generative UI. React components the agent renders in the chat by calling them like tools.
//
// useComponent registers a component as a frontend tool: the agent chooses the arguments, the
// component renders them, and there is no backend tool in between. Three cards, two patterns:
//
// - showCostBreakdown is a snapshot. Its arguments are the cost inputs, and the card computes every
//   number with calculateCost(), so the cards before and after an edit sit side by side.
// - showPolicyCheck is a live view. Its argument is a request id; the card reads the shared store
//   and re-checks every rule as the human or the agent edits the business case, and its small seal
//   fills as rules pass.
// - showRecheck is the answer to a human edit: its arguments are the request id and the values the
//   edit replaced, and the card evaluates the request before and after with evaluateRequest(), so
//   "Run-rate $343,920 → $362,250 · CFO added (POL-APR-02) · 1 to fix" is computed, not written.
//
// Both render from their arguments and app state only, never from the tool call's status, so they
// look the same when the chat re-mounts them. While arguments are still streaming, they show a
// skeleton with the card's own footprint. They are drawn with the same pieces as the Business case
// (components/ui), so a figure reads the same in the chat and on the page.

import { useComponent } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { ApprovalSeal, type SignerState } from "@/components/ui/ApprovalSeal";
import { Card, Tag, VerdictTag } from "@/components/ui/Card";
import { CostTable } from "@/components/ui/CostTable";
import { Figure } from "@/components/ui/Figure";
import { ApprovalChain, PolicyList } from "@/components/ui/PolicyList";
import { blockerNeed } from "@/components/ui/rule-measures";
import { quarterLabel, typeLabel, usd } from "@/components/ui/format";
import { CURRENT_TEAM, LEVELS, LOCATIONS, QUARTERS, REQUEST_TYPES, calculateCost, checkBudgetFit, type HeadcountRequest } from "@/lib/headcount";
import { approvedInSession, evaluateInApp, useAppState } from "@/lib/store";

const costCardArgs = z.object({
  level: z.enum(LEVELS),
  location: z.enum(LOCATIONS),
  baseSalary: z.number(),
  startQuarter: z.enum(QUARTERS),
});

const policyCardArgs = z.object({ requestId: z.string().describe("The draft's id, e.g. REQ-2027-021") });

const recheckArgs = z.object({
  requestId: z.string().describe("The draft's id, e.g. REQ-2027-021"),
  before: z
    .object({
      baseSalary: z.number().optional(),
      level: z.enum(LEVELS).optional(),
      location: z.enum(LOCATIONS).optional(),
      startQuarter: z.enum(QUARTERS).optional(),
      type: z.enum(REQUEST_TYPES).optional(),
    })
    .describe('The values the user\'s edit replaced, from their message, e.g. { "baseSalary": 212000 }. Empty for a text edit.'),
});

export function useGenerativeUI() {
  useComponent(
    {
      name: "showCostBreakdown",
      description: "A cost breakdown card for one hire. Pass the inputs; the card computes the numbers with the same cost model as calculateCost.",
      parameters: costCardArgs,
      render: CostBreakdownCard,
    },
    [],
  );

  useComponent(
    {
      name: "showRecheck",
      description:
        "The re-check card after the user edits the business case: what moved (run-rate, FY impact, approvers) and what a rule now needs. Pass the request id and the values the edit replaced; the card computes the rest.",
      parameters: recheckArgs,
      render: RecheckCard,
    },
    [],
  );

  useComponent(
    {
      name: "showPolicyCheck",
      description: "The live policy check card for a request: every rule, the approval chain, and whether it is ready to submit.",
      parameters: policyCardArgs,
      render: PolicyCheckCard,
    },
    [],
  );
}

/** The card's footprint while its arguments stream in. */
export function CardSkeleton({ title, lines = 5 }: { title: string; lines?: number }) {
  return (
    <Card className="my-2" title={title} meta={<span className="inline-block h-3 w-40 rounded-sm bg-stone align-middle" />}>
      <div aria-busy="true" className="space-y-2.5 py-0.5">
        <span className="sr-only">Working it out…</span>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex justify-between gap-6">
            <span className="h-3 rounded-sm bg-stone" style={{ width: `${46 - (i % 3) * 8}%` }} />
            <span className="h-3 w-16 rounded-sm bg-stone" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CostBreakdownCard(props: Partial<z.infer<typeof costCardArgs>>) {
  const state = useAppState();
  const args = costCardArgs.safeParse(props);
  if (!args.success) return <CardSkeleton title="Cost breakdown" lines={6} />;
  const { level, location, baseSalary, startQuarter } = args.data;
  const cost = calculateCost({ level, baseSalary, startQuarter });
  return (
    <Card
      className="my-2"
      title="Cost breakdown"
      meta={`${level} · ${location} · ${quarterLabel(startQuarter)} · base ${usd(baseSalary)}`}
      aside={<Tag tone="outline">Snapshot</Tag>}
    >
      <CostTable compact cost={cost} level={level} budget={checkBudgetFit(CURRENT_TEAM, cost.fiscalYearImpact, approvedInSession(state, CURRENT_TEAM.id))} />
    </Card>
  );
}

function PolicyCheckCard(props: Partial<z.infer<typeof policyCardArgs>>) {
  const state = useAppState();
  if (!props.requestId) return <CardSkeleton title="Policy check" />;
  const submitted = state.requests.find((r) => r.request.id === props.requestId);
  const request = state.draft?.id === props.requestId ? state.draft : submitted?.request;
  if (!request) {
    return (
      <Card className="my-2" title="Policy check" meta={props.requestId}>
        <p className="text-muted">This request is not in the app any more (the demo was reset).</p>
      </Card>
    );
  }
  // A submitted request is checked as submitted: only skills published by then apply.
  const asSubmitted = Boolean(submitted) && request !== state.draft;
  const evaluation = evaluateInApp(state, request, asSubmitted ? submitted?.submittedAt : undefined);
  const states: SignerState[] = evaluation.approvers.map((_, i) => (asSubmitted ? (submitted?.decisions[i]?.decision ?? "pending") : "pending"));
  const status = evaluation.readyToSubmit ? <Tag tone="green">Ready to submit</Tag> : <Tag tone="red">{evaluation.blockers.length} to fix</Tag>;
  return (
    <Card
      className="my-2"
      title="Policy check"
      meta={`${request.id} · ${asSubmitted ? "as submitted" : "live: follows the business case"}`}
      aside={
        <div className="flex items-center gap-2">
          {status}
          <ApprovalSeal
            requestId={request.id}
            checks={evaluation.results.map((r) => ({ id: r.ruleId, status: r.status }))}
            signers={evaluation.approvers.map((step, i) => ({ name: step.name, state: states[i] }))}
            size={36}
          />
        </div>
      }
    >
      <PolicyList results={evaluation.results} skills={state.publishedSkills} compact />
      <h4 className="section-label mb-1 mt-3 border-b border-hairline pb-1">Approval route</h4>
      <ApprovalChain steps={evaluation.approvers} compact />
    </Card>
  );
}

const FIELD_NAMES: Record<keyof z.infer<typeof recheckArgs>["before"], string> = {
  baseSalary: "base salary",
  level: "level",
  location: "location",
  startQuarter: "start",
  type: "type",
};

function shown(field: keyof typeof FIELD_NAMES, value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (field === "baseSalary") return usd(value as number);
  if (field === "startQuarter") return quarterLabel(value as HeadcountRequest["startQuarter"] & string);
  if (field === "type") return typeLabel(value as HeadcountRequest["type"] & string);
  return String(value);
}

const To = () => <ArrowRight aria-label="to" className="mx-1 inline size-3 align-[-1px] text-muted" strokeWidth={2} />;

function Delta({ label, children, rule }: { label: string; children: ReactNode; rule?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[2px]">
      <dt className="text-ink">{label}</dt>
      <dd className="flex items-baseline gap-2 text-right">
        {rule && <span className="font-mono text-small text-muted">{rule}</span>}
        <span>{children}</span>
      </dd>
    </div>
  );
}

function RecheckCard(props: Partial<z.infer<typeof recheckArgs>>) {
  const state = useAppState();
  const args = recheckArgs.safeParse(props);
  if (!args.success) return <CardSkeleton title="Re-checked after your edit" lines={3} />;
  const { requestId, before } = args.data;
  const submitted = state.requests.find((r) => r.request.id === requestId);
  const request = state.draft?.id === requestId ? state.draft : submitted?.request;
  if (!request) {
    return (
      <Card className="my-2" title="Re-checked after your edit" meta={requestId}>
        <p className="text-muted">This request is not in the app any more (the demo was reset).</p>
      </Card>
    );
  }
  // The same evaluation twice: as it was before the edit, and as it is now
  const asSubmitted = request !== state.draft ? submitted?.submittedAt : undefined;
  const now = evaluateInApp(state, request, asSubmitted);
  const was = evaluateInApp(state, { ...request, ...before }, asSubmitted);
  const fields = (Object.keys(before) as (keyof typeof FIELD_NAMES)[]).filter((f) => before[f] !== request[f]);
  const joined = now.approvers.filter((a) => !was.approvers.some((b) => b.personId === a.personId));
  const left = was.approvers.filter((a) => !now.approvers.some((b) => b.personId === a.personId));
  const status = now.readyToSubmit ? <Tag tone="green">Ready to submit</Tag> : <Tag tone="red">{now.blockers.length} to fix</Tag>;
  return (
    <Card
      className="my-2"
      title="Re-checked after your edit"
      meta={
        fields.length ? (
          <>
            {request.id} ·{" "}
            {fields.map((f, i) => (
              <span key={f} className="whitespace-nowrap">
                {i > 0 && ", "}
                {FIELD_NAMES[f]} {shown(f, before[f])}
                <To />
                {shown(f, request[f])}
              </span>
            ))}
          </>
        ) : (
          `${request.id} · live: follows the business case`
        )
      }
      aside={status}
    >
      <dl>
        {was.cost && now.cost && was.cost.fullyLoadedAnnual !== now.cost.fullyLoadedAnnual && (
          <>
            <Delta label="Run-rate" rule={joined.some((a) => a.ruleId === "POL-APR-02") || left.some((a) => a.ruleId === "POL-APR-02") ? "POL-APR-02" : undefined}>
              <span className="text-muted">{usd(was.cost.fullyLoadedAnnual)}</span>
              <To />
              <Figure value={now.cost.fullyLoadedAnnual} className="font-semibold" />
            </Delta>
            <Delta label="FY2027 impact">
              <span className="text-muted">{usd(was.cost.fiscalYearImpact)}</span>
              <To />
              <Figure value={now.cost.fiscalYearImpact} className="font-semibold" />
            </Delta>
          </>
        )}
        {joined.map((a) => (
          <Delta key={a.personId} label="Approvers" rule={a.ruleId}>
            {a.name} added
          </Delta>
        ))}
        {left.map((a) => (
          <Delta key={a.personId} label="Approvers" rule={a.ruleId}>
            {a.name} no longer needed
          </Delta>
        ))}
      </dl>
      {now.blockers.length > 0 ? (
        <ul className="mt-2 space-y-1.5 border-t border-hairline pt-2">
          {now.blockers.map((b) => (
            <li key={b.ruleId + b.title} className="flex items-center gap-2.5">
              <VerdictTag status={b.status} />
              <span className="min-w-0 flex-1">{blockerNeed(b, request)}</span>
              <span className="font-mono text-small text-muted">{b.ruleId}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 border-t border-hairline pt-2 text-ink">Every check passes. It is ready to submit.</p>
      )}
    </Card>
  );
}
