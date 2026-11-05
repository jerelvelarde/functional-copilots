// Concept: human in the loop. The agent can ask to submit; only a person's click submits.
//
// useHumanInTheLoop registers a tool whose result is the user's choice. While the card waits
// (status "executing") it gets a respond() function, and Submit for approval or Keep editing calls
// it once. respond() exists only in that state. The card previews where the request goes and why
// each approver is on it. Afterwards it collapses to a one-line receipt rendered from the tool's
// result, not from the live draft, so it reads the same when the chat re-mounts it. While it waits,
// it tells the page (approval-card-state.ts), so the Business case's own Submit steps back: one
// primary action on screen at a time.

import { ToolCallStatus, useHumanInTheLoop, type ReactHumanInTheLoop } from "@copilotkit/react-core/v2";
import { CircleCheck, CornerUpLeft } from "lucide-react";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { z } from "zod";
import { Button, Card, Tag } from "@/components/ui/Card";
import { ApprovalChain } from "@/components/ui/PolicyList";
import { quarterLabel, typeLabel, usd } from "@/components/ui/format";
import { FISCAL_YEAR } from "@/lib/headcount";
import { evaluateInApp, submitDraft, useAppState } from "@/lib/store";
import { approvalCardClosed, approvalCardOpened } from "./approval-card-state";
import { CardSkeleton } from "./useGenerativeUI";

const args = z.object({ requestId: z.string().describe("The draft's id, e.g. REQ-2027-021") });
type Args = z.infer<typeof args>;
type Props = ComponentProps<ReactHumanInTheLoop<Args>["render"]>;

/** What the agent gets back. */
type Outcome = { submitted: true; requestId: string; approvers: string[] } | { submitted: false; reason: string };

export function useSubmitForApproval() {
  useHumanInTheLoop<Args>(
    {
      name: "submitForApproval",
      description:
        "Ask the user to submit the current draft for approval. Shows an approval-ready summary with Submit and Keep editing buttons. Nothing is submitted unless the user clicks Submit. Call it only when the user asks to submit and checkPolicy has no blockers.",
      parameters: args,
      render: SubmitForApprovalCard,
    },
    [],
  );
}

function SubmitForApprovalCard(props: Props) {
  const state = useAppState();
  // Waiting on the open draft: say so to the page until answered or unmounted
  const waitingOn = props.status === ToolCallStatus.Executing && state.draft?.id === props.args.requestId ? (props.args.requestId ?? null) : null;
  useEffect(() => {
    if (!waitingOn) return;
    approvalCardOpened(waitingOn);
    return () => approvalCardClosed(waitingOn);
  }, [waitingOn]);

  if (props.status === ToolCallStatus.Complete) return <Receipt result={props.result} />;
  if (props.status === ToolCallStatus.InProgress) return <CardSkeleton title="Submit for approval?" lines={4} />;

  const { respond } = props;
  const answer = (outcome: Outcome) => void respond(outcome);
  const draft = state.draft;

  if (!draft || draft.id !== props.args.requestId) {
    // The person already submitted from the panel, or started another draft. Let them close this out.
    const alreadySubmitted = state.requests.find((r) => r.request.id === props.args.requestId);
    return (
      <Card className="my-2" title={`Submit ${props.args.requestId} for approval?`}>
        <p className="mb-3 text-muted">{alreadySubmitted ? "Already submitted from the Business case." : "This draft is no longer open."}</p>
        <Button
          onClick={() =>
            answer(
              alreadySubmitted
                ? { submitted: true, requestId: alreadySubmitted.request.id, approvers: alreadySubmitted.chain.map((s) => s.name) }
                : { submitted: false, reason: "The draft is no longer open." },
            )
          }
        >
          OK
        </Button>
      </Card>
    );
  }

  const evaluation = evaluateInApp(state, draft);
  const submit = () => {
    try {
      const submitted = submitDraft("copilot");
      answer({ submitted: true, requestId: submitted.request.id, approvers: submitted.chain.map((s) => `${s.name} (${s.title})`) });
    } catch (error) {
      answer({ submitted: false, reason: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <Card
      className="my-2"
      title={`Submit ${draft.id} for approval?`}
      meta="Nothing is sent until you click Submit for approval."
      aside={evaluation.readyToSubmit ? <Tag tone="green">Ready</Tag> : <Tag tone="red">{evaluation.blockers.length} to fix</Tag>}
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5">
        <Fact label="Role">
          {draft.roleTitle} · {draft.level} · {draft.location}
        </Fact>
        <Fact label="Start">
          {draft.startQuarter && quarterLabel(draft.startQuarter)} · {draft.type && typeLabel(draft.type)}
        </Fact>
        {evaluation.cost && (
          <>
            <Fact label="Run-rate">{usd(evaluation.cost.fullyLoadedAnnual)} a year, fully loaded</Fact>
            <Fact label={FISCAL_YEAR}>{usd(evaluation.cost.fiscalYearImpact)} impact</Fact>
          </>
        )}
      </dl>
      <h4 className="section-label mb-1 mt-3 border-b border-hairline pb-1">Goes to, in order</h4>
      <ApprovalChain steps={evaluation.approvers} compact />
      {!evaluation.readyToSubmit && (
        <ul className="mt-3 space-y-0.5 text-small text-red">
          {evaluation.blockers.map((b) => (
            <li key={b.ruleId}>
              <span className="font-mono">{b.ruleId}</span> {b.detail}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3.5 flex gap-2">
        <Button variant="primary" disabled={!evaluation.readyToSubmit} onClick={submit}>
          Submit for approval
        </Button>
        <Button onClick={() => answer({ submitted: false, reason: "The user wants to keep editing." })}>Keep editing</Button>
      </div>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </>
  );
}

const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** After the decision, the card collapses to one line. */
function Receipt({ result }: { result: string }) {
  let outcome: Outcome | null = null;
  try {
    outcome = JSON.parse(result) as Outcome;
  } catch {
    // Not JSON: show it as text below.
  }
  if (outcome?.submitted) {
    const names = outcome.approvers.map((a) => a.replace(/\s*\(.*\)$/, ""));
    return (
      <p data-testid="approval-receipt" className="my-2 flex items-start gap-2 rounded-md border border-hairline bg-surface px-3 py-2 text-small text-ink">
        <CircleCheck aria-hidden className="mt-px size-3.5 shrink-0 text-ink" strokeWidth={2.25} />
        <span>
          Submitted <span className="font-mono">{outcome.requestId}</span> to {joinNames(names)}
        </span>
      </p>
    );
  }
  return (
    <p data-testid="approval-receipt" className="my-2 flex items-start gap-2 rounded-md border border-hairline bg-surface px-3 py-2 text-small text-muted">
      <CornerUpLeft aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2.25} />
      <span>{outcome && !outcome.submitted && /keep editing/i.test(outcome.reason) ? "Kept editing · nothing was submitted" : `Not submitted · ${outcome && !outcome.submitted ? outcome.reason : result}`}</span>
    </p>
  );
}
