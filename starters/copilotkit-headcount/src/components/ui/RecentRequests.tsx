// The team's recent requests, read from approval-history.jsonl: what was asked, how it ended, and
// why approvers sent it back. Shown under an empty Business case, so the opening frame carries the
// history the copilot will later learn from. Every line comes from the file; nothing is invented.

import { dateLabel, typeLabel } from "./format";
import { Tag } from "./Card";
import { getPerson } from "@/lib/headcount";
import { daysAdded, type Decision } from "@/lib/learning";

type Row = { id: string; first: Decision; decisions: Decision[] };

function byRequest(history: Decision[], teamId: string): Row[] {
  const rows = new Map<string, Row>();
  for (const decision of history.filter((d) => d.team === teamId)) {
    const row = rows.get(decision.id) ?? { id: decision.id, first: decision, decisions: [] };
    row.decisions.push(decision);
    rows.set(decision.id, row);
  }
  return [...rows.values()].sort((a, b) => (a.first.submitted < b.first.submitted ? 1 : -1));
}

/** The day a decision landed: the decision's own submission date plus the days it took (cycleDays). */
export function decidedOn(decision: Decision): string | null {
  if (decision.cycleDays === null) return null;
  const date = new Date(`${decision.submitted.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + decision.cycleDays);
  return date.toISOString().slice(0, 10);
}

const OUTCOME = { approved: { label: "Approved", tone: "green" }, sent_back: { label: "Sent back", tone: "red" }, rejected: { label: "Rejected", tone: "red" } } as const;

export function RecentRequests({ history, teamId, teamName }: { history: Decision[]; teamId: string; teamName: string }) {
  const rows = byRequest(history, teamId);
  if (rows.length === 0) return null;
  return (
    <section aria-label={`Recent ${teamName} requests`}>
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-hairline pb-1.5">
        <h2 className="section-label">Recent {teamName} requests</h2>
        <span className="text-small text-muted">from the approval history</span>
      </div>
      <ul className="divide-y divide-hairline">
        {rows.map(({ id, first, decisions }) => {
          const last = decisions.at(-1)!;
          const outcome = OUTCOME[last.decision];
          const decided = decidedOn(last);
          const sendBacks = decisions.filter((d) => d.decision === "sent_back");
          return (
            <li key={id} className="grid gap-x-4 gap-y-0.5 py-2.5 @3xl:grid-cols-[minmax(0,1fr)_auto]">
              <p className="min-w-0">
                <span className="font-mono text-ink">{id}</span>
                <span className="text-ink"> · {first.role}</span>
                <span className="text-small text-muted">
                  {" "}
                  · {first.level} · {first.location} · {typeLabel(first.type as "net_new" | "backfill")}
                </span>
              </p>
              <p className="flex items-center gap-2 text-small text-muted @3xl:justify-end">
                <Tag tone={outcome.tone}>{outcome.label}</Tag>
                {decided ? dateLabel(decided) : `submitted ${dateLabel(last.submitted)}`}
                {sendBacks.length > 0 && ` after ${sendBacks.length} send-back${sendBacks.length === 1 ? "" : "s"}`}
              </p>
              {sendBacks.map((d) => {
                const days = daysAdded(d, history);
                return (
                  <p key={d.submitted + d.approver} className="text-small text-muted @3xl:col-span-2">
                    Sent back by {getPerson(d.approver).name}
                    {days !== null && ` (+${days} days)`}: <span className="text-ink">&ldquo;{d.comment}&rdquo;</span>
                  </p>
                );
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
