// Concept: approvals stay with people. Submitted requests wait here; the presenter acts as each
// approver in turn (POL-APR-01/02). Each request reads like a handoff ("Dana Kim's request is ready
// for your review") with the four facts an approver decides on (the justification in full), and the
// seal beside the route, so each signature reads at a glance: a green ring for an approval, a broken
// red one for a send-back. Every decision and comment is recorded in the log, and send-backs feed
// Insights.

"use client";

import { CornerUpLeft } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ApprovalSeal, type SealSigner, type SignerState } from "@/components/ui/ApprovalSeal";
import { Button, Tag, type Tone } from "@/components/ui/Card";
import { ApprovalChain } from "@/components/ui/PolicyList";
import { dateLabel, personName, quarterLabel, typeLabel, usd } from "@/components/ui/format";
import { CURRENT_USER, FISCAL_YEAR, getPerson } from "@/lib/headcount";
import type { DecisionKind } from "@/lib/learning";
import { currentStep, evaluateInApp, recordDecision, reopenRequest, useAppState, type ApprovalDecision, type SubmittedRequest } from "@/lib/store";

const STATUS_TAG: Record<SubmittedRequest["status"], { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "outline" },
  approved: { label: "Approved", tone: "green" },
  sent_back: { label: "Sent back", tone: "red" },
  rejected: { label: "Rejected", tone: "red" },
};

const DECIDED: Record<DecisionKind, string> = { approved: "approved", sent_back: "sent it back", rejected: "rejected it" };

/** The handoff line at the top of each request. */
function handoff(r: SubmittedRequest): string {
  const requester = CURRENT_USER.name;
  const last = r.decisions.at(-1);
  if (r.status === "pending") return `${requester}'s request is ready for your review`;
  if (r.status === "approved") return `${requester}'s request is approved`;
  return `${r.status === "sent_back" ? "Sent back" : "Rejected"} by ${last ? personName(last.approverId) : "an approver"}`;
}

export function ApprovalsInbox() {
  const { requests, draft } = useAppState();
  if (requests.length === 0) {
    return (
      <article aria-label="Approvals" className="rounded-md border border-hairline bg-surface px-5 py-8 @3xl:px-8">
        <h1 className="text-title font-semibold tracking-[-0.01em] text-ink">Nothing to review yet</h1>
        <p className="mt-2 max-w-[50ch] text-muted">
          A request lands here when someone clicks Submit, in the copilot&apos;s approval card or on the Business case. Then you act as each approver in turn:
          approve it, send it back with a comment, or reject it.
        </p>
      </article>
    );
  }
  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <RequestRow key={r.request.id} submitted={r} reopenDisabled={draft !== null} />
      ))}
    </div>
  );
}

function RequestRow({ submitted: r, reopenDisabled }: { submitted: SubmittedRequest; reopenDisabled: boolean }) {
  const state = useAppState();
  const step = currentStep(r);
  const status = STATUS_TAG[r.status];
  const { request } = r;
  // The checks as submitted: only skills published by then apply.
  const evaluation = evaluateInApp(state, request, r.submittedAt);
  const states: SignerState[] = r.chain.map((_, i) => r.decisions[i]?.decision ?? "pending");
  const signers: SealSigner[] = r.chain.map((s, i) => ({ name: s.name, state: states[i] }));
  const checks = evaluation.results.map((x) => ({ id: x.ruleId, status: x.status }));
  const pass = checks.filter((c) => c.status === "pass").length;
  const notes = checks.filter((c) => c.status === "warn").length;
  const log = [...r.earlierDecisions, ...r.decisions];

  return (
    <article aria-label={`${request.id} ${request.roleTitle}`} className="rounded-md border border-hairline bg-surface">
      <header className="flex items-start gap-3 border-b border-hairline px-5 py-4">
        <Avatar name={CURRENT_USER.name} size={32} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">{handoff(r)}</h2>
          <p className="mt-0.5 text-small text-muted">
            <span className="font-mono text-ink">{request.id}</span> · submitted {dateLabel(r.submittedAt)} via{" "}
            {r.submittedVia === "copilot" ? "the copilot's approval card" : "the Business case"}
            {r.earlierDecisions.length > 0 && " · resubmitted"}
          </p>
        </div>
        <Tag tone={status.tone}>{status.label}</Tag>
      </header>

      {/* The four facts an approver decides on */}
      <dl className="grid grid-cols-2 gap-px border-b border-hairline bg-hairline @3xl:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
        <Fact label="Role" value={request.roleTitle} nowrap />
        <Fact nowrap label="Level · location" value={`${request.level} · ${request.location}`} sub={[request.startQuarter && quarterLabel(request.startQuarter), request.type && typeLabel(request.type)].filter(Boolean).join(" · ")} />
        <Fact nowrap label={`Run-rate · ${FISCAL_YEAR} impact`} value={`${usd(r.fullyLoadedAnnual)} a year`} sub={`${usd(r.fiscalYearImpact)} in ${FISCAL_YEAR}`} />
        <Fact label="Justification" value={request.justification} />
      </dl>

      <div className="grid grid-cols-1 gap-6 px-5 py-4 @4xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="min-w-0 space-y-5">
          {step && <DecisionForm key={`${request.id}-${r.decisions.length}`} requestId={request.id} approverId={step.personId} approverTitle={step.title} />}
          {r.status === "sent_back" && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => reopenRequest(request.id)} disabled={reopenDisabled} title={reopenDisabled ? "Submit or discard the open draft first" : ""}>
                <CornerUpLeft aria-hidden className="size-3.5" />
                Reopen in Business case
              </Button>
              {reopenDisabled && <span className="text-small text-muted">Submit or discard the open draft first.</span>}
            </div>
          )}
          <DecisionLog decisions={log} />
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-hairline pb-1.5">
            <h3 className="section-label">Approval route</h3>
            <span className="text-small text-muted">
              As submitted · {pass} of {checks.length} pass{notes ? ` · ${notes} ${notes === 1 ? "note" : "notes"}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-4">
            <figure className="flex shrink-0 flex-col items-center gap-1 pt-1">
              <ApprovalSeal requestId={request.id} checks={checks} signers={signers} size={88} />
              <figcaption className="font-mono text-small text-ink">{request.id}</figcaption>
            </figure>
            <div className="min-w-0 flex-1">
              <ApprovalChain steps={r.chain} states={states} waitingIndex={step ? r.decisions.length : undefined} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Fact({ label, value, sub, nowrap }: { label: string; value: string; sub?: string; nowrap?: boolean }) {
  return (
    <div className={`min-w-0 bg-surface px-5 py-3 ${nowrap ? "@3xl:whitespace-nowrap" : ""}`}>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink [text-wrap:pretty]">{value}</dd>
      {sub && <dd className="text-small text-muted">{sub}</dd>}
    </div>
  );
}

function DecisionLog({ decisions }: { decisions: ApprovalDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <section aria-label="Decision log">
      <h3 className="section-label mb-2 border-b border-hairline pb-1.5">Decision log</h3>
      <ol className="space-y-3">
        {decisions.map((d) => {
          const person = getPerson(d.approverId);
          return (
            <li key={d.at + d.approverId} className="flex gap-2.5">
              <Avatar name={person.name} size={24} tone={d.decision === "approved" ? "green" : "stone"} />
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{person.name}</span> {DECIDED[d.decision]}
                </p>
                <p className="text-small text-muted">
                  <span className="whitespace-nowrap">{person.title}</span> · <span className="whitespace-nowrap">{dateLabel(d.at)}</span>
                </p>
                {d.comment && <p className="mt-0.5 text-ink">&ldquo;{d.comment}&rdquo;</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DecisionForm({ requestId, approverId, approverTitle }: { requestId: string; approverId: string; approverTitle: string }) {
  const [comment, setComment] = useState("");
  const needsComment = comment.trim() === "";
  const decide = (decision: DecisionKind) => recordDecision(requestId, decision, comment);
  const name = personName(approverId);
  return (
    <section aria-label={`Decision as ${name}`} className="rounded-md bg-stone px-4 py-3.5">
      <p className="flex items-center gap-2">
        <Avatar name={name} size={24} tone="paper" />
        <span>
          Acting as <span className="font-semibold">{name}</span>, {approverTitle}
        </span>
      </p>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-small text-muted">Comment · required to send back or reject</span>
        <textarea
          className="w-full rounded-[5px] border border-rule bg-surface px-2.5 py-1.5 text-body text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-green focus:shadow-[0_0_0_3px_rgb(30_70_52/0.12)]"
          rows={2}
          placeholder="e.g. What production access does this role get?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => decide("approved")}>
          Approve
        </Button>
        <Button onClick={() => decide("sent_back")} disabled={needsComment}>
          Send back
        </Button>
        <Button variant="danger" onClick={() => decide("rejected")} disabled={needsComment}>
          Reject
        </Button>
        {needsComment && <span className="text-small text-muted">Add a comment to send back or reject.</span>}
      </div>
    </section>
  );
}
