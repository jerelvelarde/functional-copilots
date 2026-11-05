// Concept: learning later, with a person deciding what the copilot learns.
//
// Reads approval-history.jsonl plus this session's decisions, groups approver comments by reason,
// and drafts a skill for the send-back that keeps recurring (lib/learning.ts). The panel is a
// recommendation review: what keeps coming back (a signal built only from the data), the evidence in
// the approvers' own words, and the proposed skill as a document. Nothing reaches the agent until a
// person clicks Publish; published skills go into the agent's context (copilot/useAppContext.ts)
// and persist in localStorage.

"use client";

import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Tag } from "@/components/ui/Card";
import { SkillDocument } from "@/components/ui/SkillDocument";
import { dateLabel } from "@/components/ui/format";
import { getPerson, getTeam } from "@/lib/headcount";
import { groupFeedback, proposeSkills, type Decision, type ReasonGroup, type ReasonKey, type SendBack, type SkillProposal } from "@/lib/learning";
import { dismissSkill, publishSkill, sessionDecisions, useAppState, type AppState } from "@/lib/store";

type Review = "proposed" | "published" | "dismissed";

const reviewOf = (state: AppState, proposal: SkillProposal): Review =>
  state.publishedSkills.some((s) => s.id === proposal.id) ? "published" : state.dismissedSkillIds.includes(proposal.id) ? "dismissed" : "proposed";

/** Proposals still waiting for a person to publish or dismiss them: the Insights tab's count. */
export function pendingReviews(state: AppState, history: Decision[]): number {
  return proposeSkills(groupFeedback([...history, ...sessionDecisions(state)])).filter((p) => reviewOf(state, p) === "proposed").length;
}

/** How each kind of recommendation is named. The title is a plain sentence about what keeps happening. */
const RECOMMENDATION: Partial<Record<ReasonKey, { type: string; title: (team: string) => string }>> = {
  security_access: { type: "Missing coverage", title: (team) => `Approvers send back ${team} requests that skip security and access` },
};

export function Insights({ history }: { history: Decision[] }) {
  const state = useAppState();
  const session = sessionDecisions(state);
  const groups = groupFeedback([...history, ...session]);
  const proposals = proposeSkills(groups);
  const others = groups.filter((g) => !proposals.some((p) => p.reason === g.key));

  return (
    <div className="space-y-6">
      {proposals.map((proposal) => (
        <Recommendation key={proposal.id} proposal={proposal} review={reviewOf(state, proposal)} />
      ))}

      {others.length > 0 && (
        <section aria-label="Other approver feedback">
          <h2 className="section-label mb-1 border-b border-hairline pb-1.5">Also in approver comments</h2>
          <ul className="divide-y divide-hairline">
            {others.map((group) => (
              <li key={group.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{group.label}</span>
                  <span className="text-small text-muted"> · {group.teams.map((t) => getTeam(t).name).join(", ")}</span>
                </span>
                <span className="text-small text-muted">
                  {countLabel(group.sendBacks.length, "send-back")} · {countLabel(group.mentions.length, "mention")} · {watchNote(group)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="max-w-[66ch] text-small text-muted">
        This demo drafts skills offline with a keyword classifier and a template, so it runs the same every time. In production, CopilotKit Intelligence&apos;s
        Automatic Learning proposes skills from real conversations, and a person still reviews them before they go live.{" "}
        <a className="underline hover:text-ink" href="https://docs.copilotkit.ai/intelligence/overview" target="_blank" rel="noreferrer">
          Read about CopilotKit Intelligence
        </a>
        .
      </p>
    </div>
  );
}

function Recommendation({ proposal, review }: { proposal: SkillProposal; review: Review }) {
  const state = useAppState();
  const team = getTeam(proposal.teamId).name;
  const naming = RECOMMENDATION[proposal.reason];
  const published = state.publishedSkills.find((s) => s.id === proposal.id);
  const version = published?.version ?? 1;

  return (
    <article aria-label="Recommendation" className="rounded-md border border-hairline bg-surface">
      <header className="border-b border-hairline px-5 py-5 @3xl:px-6">
        <h1 className="max-w-[34ch] text-title font-semibold tracking-[-0.01em] text-ink [text-wrap:balance] @3xl:max-w-none">
          {naming ? naming.title(team) : proposal.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <Tag>{naming?.type ?? "Recurring send-back"}</Tag>
          {review === "published" && <Tag tone="green">Published</Tag>}
          {review === "dismissed" && <Tag tone="outline">Dismissed</Tag>}
          <p className="text-muted">{signal(proposal.evidence)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-label="Evidence" className="border-b border-hairline px-5 py-5 @3xl:px-6 @4xl:border-r @4xl:border-b-0">
          <h2 className="section-label mb-3">Evidence · in the approvers&apos; words</h2>
          <ol className="space-y-4">
            {proposal.evidence.map((d) => (
              <Quote key={`${d.id}-${d.approver}-${d.submitted}`} sendBack={d} />
            ))}
          </ol>
        </section>
        <section aria-label="Proposed skill" className="bg-paper px-5 py-5 @3xl:px-6">
          <SkillDocument
            markdown={published?.markdown ?? proposal.markdown}
            number={`${proposal.id} · ${review === "published" ? `v${version}` : "draft"}`}
          />
        </section>
      </div>

      <footer className="flex flex-col gap-3 border-t border-hairline px-5 py-4 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:px-6">
        {review === "proposed" && (
          <>
            <p className="max-w-[54ch] text-small text-muted">
              Nothing reaches the copilot until a person publishes it. Once published, the copilot reads the skill on every turn and the policy check asks for its
              section on {team} requests.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => dismissSkill(proposal.id)}>Dismiss</Button>
              <Button variant="primary" onClick={() => publishSkill(proposal)}>
                Publish to the copilot
              </Button>
            </div>
          </>
        )}
        {review === "published" && published && (
          <>
            <PublishedStamp version={version} />
            <p className="text-small text-muted @3xl:text-right">
              Published {dateLabel(published.publishedAt)}. The policy check now cites <span className="font-mono text-ink">{`${published.id} v${published.version}`}</span> on{" "}
              {team} requests.
            </p>
          </>
        )}
        {review === "dismissed" && <p className="text-small text-muted">Dismissed. The copilot does not see this skill.</p>}
      </footer>
    </article>
  );
}

function PublishedStamp({ version }: { version: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-green px-2 py-0.5 text-small font-medium text-green">
      <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2} />
      <span className="font-mono">v{version}</span> · published · offered to the copilot on every turn
    </span>
  );
}

function Quote({ sendBack: d }: { sendBack: SendBack }) {
  const person = getPerson(d.approver);
  return (
    <li className="flex gap-3">
      <Avatar name={person.name} size={28} />
      <div className="min-w-0">
        <p>
          <span className="font-medium">{person.name}</span>
          <span className="text-small text-muted"> · {person.title}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-muted">
          <span className="font-mono text-ink" title={d.role}>
            {d.id}
          </span>
          <span>· sent back {dateLabel(d.submitted)}</span>
          {d.daysAdded !== null && <Tag tone="outline">+{d.daysAdded} days</Tag>}
          {d.source === "session" && <Tag>this session</Tag>}
        </p>
        <blockquote className="mt-1.5 text-ink">&ldquo;{d.comment}&rdquo;</blockquote>
      </div>
    </li>
  );
}

const countLabel = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/**
 * "3 send-backs before today · 1 this session · 7 to 8 days each before resubmission". Days come from
 * the dates (lib/learning.ts daysAdded); this session's send-back has none yet, so it is counted
 * but not given days.
 */
function signal(evidence: SendBack[]) {
  const before = evidence.filter((d) => d.source === "history").length;
  const session = evidence.filter((d) => d.source === "session").length;
  const days = evidence.map((d) => d.daysAdded).filter((d): d is number => d !== null);
  const range = days.length ? (Math.min(...days) === Math.max(...days) ? `${days[0]}` : `${Math.min(...days)} to ${Math.max(...days)}`) : null;
  return [
    `${countLabel(before, "send-back")} before today`,
    session ? `${session} this session` : null,
    range ? `${range} days ${days.length === 1 ? "" : "each "}before resubmission` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function watchNote(group: ReasonGroup) {
  if (group.coveredBy) return `covered by ${group.coveredBy}`;
  if (group.key === "fy_runrate_split") return "feedback only; the cost statement already shows both";
  return "watching";
}
