// Concept: editable shared state, the human side.
//
// The Business case is the same draft the agent writes with updateRequest. Edits commit on blur or
// Enter (selects on change); each committed edit is reported to the agent through onHumanEdit.
// Everything derived (the seal in the header, the policy check and the cost statement in the rail,
// the approval route under the fields) is computed from the draft on every render: never stored,
// never typed by the model. Each field names its rule and says where its value came from
// (components/ui/field-sources.ts): "copilot · L5 Tier 1 midpoint", "edited by you".

"use client";

import { BookMarked, Check, ChevronDown, CircleAlert, CornerUpLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ApprovalSeal, SealWithKey, type SealCheck, type SealSigner } from "@/components/ui/ApprovalSeal";
import { BandBar } from "@/components/ui/BandBar";
import { Button, Tag } from "@/components/ui/Card";
import { CostTable } from "@/components/ui/CostTable";
import { fieldSource } from "@/components/ui/field-sources";
import { ApprovalChain, PolicyList } from "@/components/ui/PolicyList";
import { RecentRequests } from "@/components/ui/RecentRequests";
import { blockerNeed } from "@/components/ui/rule-measures";
import { dateLabel, parseMoney, personName, quarterLabel, typeLabel, usd } from "@/components/ui/format";
import { useApprovalCardWaiting } from "@/copilot/approval-card-state";
import {
  CURRENT_TEAM,
  LEVELS,
  LOCATIONS,
  QUARTERS,
  REQUEST_TYPES,
  getCompBand,
  getTeam,
  latestApprovalDate,
  skillRequirements,
  startDate,
  type CompBand,
  type HeadcountRequest,
  type Level,
} from "@/lib/headcount";
import type { Decision } from "@/lib/learning";
import bands from "@/data/comp-bands.json";
import {
  createDraft,
  discardDraft,
  evaluateInApp,
  submitDraft,
  updateDraft,
  useAppState,
  type DraftEdit,
  type DraftField,
  type DraftPatch,
} from "@/lib/store";

type Props = { onHumanEdit: (edit: DraftEdit) => void; history: Decision[] };

/** "L5 · Senior": the level and its seniority word from comp-bands.json, never a role title. */
const levelLabel = (level: Level) => {
  const word = /^(Senior|Staff|Principal)\b/.exec(bands.levels[level])?.[1];
  return word ? `${level} · ${word}` : level;
};

export function BusinessCase({ onHumanEdit, history }: Props) {
  const state = useAppState();
  const draft = state.draft;
  const waitingOn = useApprovalCardWaiting();

  if (!draft) return <NoRequest history={history} />;

  const evaluation = evaluateInApp(state, draft);
  const band = draft.level && draft.location ? getCompBand(draft.level, draft.location) : null;
  const aboveMid = band !== null && draft.baseSalary !== null && draft.baseSalary > band.mid;
  const outsidePlan = evaluation.plan !== null && !evaluation.plan.fits;
  // A published skill that applies to this team asks for the section (lib/headcount.ts SkillCheck)
  const securitySkill = skillRequirements(state.publishedSkills, draft.teamId).find((skill) => skill.requires.field === "securityAccess");
  const showSecurity = Boolean(securitySkill) || draft.securityAccess !== "";
  const compCheck = evaluation.results.find((r) => r.ruleId === "POL-COMP-01");
  const needsReason = aboveMid && !draft.aboveMidpointReason.trim();
  const cardWaiting = waitingOn === draft.id; // the copilot's approval card is open on this draft

  const commit = <F extends DraftField>(field: F, value: HeadcountRequest[F]) => {
    const before = draft[field];
    const { changed } = updateDraft({ [field]: value } as DraftPatch, "human");
    if (changed.length > 0) onHumanEdit({ draftId: draft.id, field, before, after: value } as DraftEdit);
  };
  const source = (field: DraftField) => fieldSource(field, state.editedBy[field], draft, band);
  const filledByCopilot = Object.values(state.editedBy).filter((w) => w === "agent").length;
  const editedByYou = Object.values(state.editedBy).filter((w) => w === "human").length;

  // The seal: one petal per check, one ring per approver. Nobody has signed a draft.
  const checks: SealCheck[] = evaluation.results.map((r) => ({ id: r.ruleId, status: r.status }));
  const signers: SealSigner[] = evaluation.approvers.map((step) => ({ name: step.name, state: "pending" }));
  const passing = checks.filter((c) => c.status === "pass").length;
  const blockers = evaluation.blockers;
  const meta = [getTeam(draft.teamId).name, draft.type && typeLabel(draft.type), draft.level, draft.location, draft.startQuarter && quarterLabel(draft.startQuarter)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article aria-label={`Business case ${draft.id}`} className="rounded-md border border-hairline bg-surface">
      {/* The header row: the document's title and number, its seal, and the one primary action */}
      <header className="flex flex-col gap-4 border-b border-hairline px-5 py-4 @4xl:flex-row @4xl:items-center @4xl:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-title text-ink">{draft.roleTitle || "Untitled request"}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted">
            <span className="font-mono text-ink">{draft.id}</span>
            {state.sentBack ? <Tag tone="red">Sent back</Tag> : <Tag>Draft</Tag>}
            {meta && <span>{meta}</span>}
          </p>
          {state.sentBack && (
            <p className="mt-3 flex items-start gap-2 text-ink">
              <CornerUpLeft aria-hidden className="mt-1 size-3.5 shrink-0 text-red" />
              <span>
                <span className="font-medium">Sent back by {personName(state.sentBack.approverId)}:</span> &ldquo;{state.sentBack.comment}&rdquo;
              </span>
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
          <SealWithKey requestId={draft.id} checks={checks} signers={signers} />
          <div className="flex min-w-0 flex-col items-start gap-1.5 @4xl:min-w-[200px] @4xl:items-end">
            {cardWaiting ? (
              <Button disabled title="The copilot's approval card is open: submit or keep editing there">
                Waiting for your click in the copilot
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!evaluation.readyToSubmit}
                onClick={() => submitDraft("panel")}
                title={evaluation.readyToSubmit ? "" : "Fix the checks marked Fix or Missing first"}
              >
                Submit for approval
              </Button>
            )}
            {evaluation.readyToSubmit ? (
              <span className="flex items-center gap-1 text-small font-medium text-ink">
                <Check aria-hidden className="size-3.5" strokeWidth={2.25} />
                Ready to submit
              </span>
            ) : (
              <div className="space-y-0.5 text-small font-medium text-red @4xl:text-right">
                <span className="sr-only">{blockers.length} to fix: </span>
                {blockers.slice(0, 2).map((b) => (
                  <p key={b.ruleId + b.title} className="flex items-center gap-1.5 @4xl:justify-end">
                    <CircleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={2.25} />
                    {blockerNeed(b, draft)} · <span className="font-mono font-normal">{b.ruleId}</span>
                  </p>
                ))}
                {blockers.length > 2 && <p className="font-normal">and {blockers.length - 2} more in the policy check</p>}
              </div>
            )}
            <button
              type="button"
              className="text-small text-muted underline-offset-[3px] hover:text-ink hover:underline"
              onClick={() => {
                if (window.confirm(`Discard ${draft.id}?`)) discardDraft();
              }}
            >
              Discard draft
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 px-5 pb-6 pt-4 @4xl:grid-cols-[minmax(0,1fr)_400px] @4xl:px-6">
        {/* Left: the fields both the human and the agent write, then who signs */}
        <div className="min-w-0 space-y-6">
          <section aria-label="Request">
            <SectionHead title="Request">
              {filledByCopilot > 0 && `${filledByCopilot} filled by the copilot`}
              {filledByCopilot > 0 && editedByYou > 0 && " · "}
              {editedByYou > 0 && `${editedByYou} edited by you`}
            </SectionHead>
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 @md:grid-cols-2">
              <Field label="Role title" source={source("roleTitle")} rule="POL-HC-01">
                <TextInput value={draft.roleTitle} placeholder="Senior Software Engineer" onCommit={(v) => commit("roleTitle", v)} />
              </Field>
              <Field label="Request type" source={source("type")} rule="POL-HC-02">
                <Select value={draft.type} options={REQUEST_TYPES.map((t) => [t, typeLabel(t)])} onCommit={(v) => commit("type", v)} />
              </Field>
              <Field label="Level" source={source("level")} rule="POL-COMP-01">
                <Select value={draft.level} options={LEVELS.map((l) => [l, levelLabel(l)])} onCommit={(v) => commit("level", v)} />
              </Field>
              <Field label="Location" source={source("location")} rule="POL-COMP-02">
                <Select value={draft.location} options={LOCATIONS.map((l) => [l, l])} onCommit={(v) => commit("location", v)} />
              </Field>
              <Field
                label="Start quarter"
                source={source("startQuarter")}
                rule="POL-HC-04"
                hint={draft.startQuarter ? `Approve by ${dateLabel(latestApprovalDate(draft.startQuarter))}` : undefined}
              >
                <Select
                  value={draft.startQuarter}
                  options={QUARTERS.map((q) => [q, `${quarterLabel(q)} · starts ${dateLabel(startDate(q)).replace(", 2027", "")}`])}
                  onCommit={(v) => commit("startQuarter", v)}
                />
              </Field>
              <Field
                label="Base salary"
                source={source("baseSalary")}
                rule="POL-COMP-01"
                hint={
                  band ? (
                    <span className="flex flex-col gap-1.5">
                      <span>{bandHint(band)}</span>
                      {draft.baseSalary !== null && <BandBar band={band} base={draft.baseSalary} needsAction={compCheck?.status === "fail"} />}
                    </span>
                  ) : (
                    "The band shows once level and location are set."
                  )
                }
              >
                <MoneyInput value={draft.baseSalary} onCommit={(v) => commit("baseSalary", v)} />
              </Field>
              {(aboveMid || draft.aboveMidpointReason) && (
                <Field
                  label="Reason for going above the midpoint"
                  source={source("aboveMidpointReason")}
                  rule="POL-COMP-01"
                  required={needsReason}
                  hint={band && draft.baseSalary !== null ? `${usd(draft.baseSalary)} is above the ${usd(band.mid)} midpoint. One line: a competing offer, a scarce skill or internal parity.` : undefined}
                  wide
                >
                  <TextInput
                    value={draft.aboveMidpointReason}
                    placeholder="One line, e.g. a competing offer"
                    invalid={needsReason}
                    onCommit={(v) => commit("aboveMidpointReason", v)}
                  />
                </Field>
              )}
              {(outsidePlan || draft.planOffset) && (
                <Field label="Offsetting reduction or new budget" source={source("planOffset")} rule="POL-HC-02" required={outsidePlan && !draft.planOffset.trim()} wide>
                  <TextInput
                    value={draft.planOffset}
                    placeholder="The req or budget this hire is funded from"
                    invalid={outsidePlan && !draft.planOffset.trim()}
                    onCommit={(v) => commit("planOffset", v)}
                  />
                </Field>
              )}
              <Field label="Justification" source={source("justification")} rule="POL-HC-01" hint="Two sentences: what it unblocks, and what happens if the role is not filled." wide>
                <TextArea value={draft.justification} onCommit={(v) => commit("justification", v)} />
              </Field>
              {showSecurity && (
                <Field
                  label="Security and access"
                  source={source("securityAccess")}
                  rule={securitySkill ? `${securitySkill.id} v${securitySkill.version}` : undefined}
                  badge={securitySkill && <Tag icon={<BookMarked aria-hidden className="size-3" strokeWidth={2} />}>from a published skill</Tag>}
                  hint="Which systems, what access level, who reviews it."
                  required={Boolean(securitySkill) && !draft.securityAccess.trim()}
                  wide
                >
                  <TextArea value={draft.securityAccess} invalid={Boolean(securitySkill) && !draft.securityAccess.trim()} onCommit={(v) => commit("securityAccess", v)} />
                </Field>
              )}
            </div>
          </section>
          <section aria-label="Approval route">
            <SectionHead title="Approval route">
              <span className="font-mono">POL-APR-01</span> · {evaluation.approvers.length ? `0 of ${evaluation.approvers.length} signed` : "not routed yet"}
            </SectionHead>
            <ApprovalChain steps={evaluation.approvers} />
          </section>
        </div>

        {/* Right: derived on every render from the draft, never stored, never typed by the model */}
        <div className="min-w-0 space-y-5">
          <section aria-label="Policy check">
            <SectionHead title="Policy check">
              {evaluation.readyToSubmit ? (
                <span className="font-medium text-ink">Ready to submit</span>
              ) : (
                <>
                  <span className="font-medium text-red">{blockers.length} to fix</span> · {passing} of {checks.length} pass
                </>
              )}
            </SectionHead>
            <PolicyList results={evaluation.results} evaluation={evaluation} request={draft} skills={state.publishedSkills} />
          </section>
          <section aria-label="Cost">
            <SectionHead title="Cost">Derived · USD</SectionHead>
            {evaluation.cost && draft.level ? (
              <CostTable cost={evaluation.cost} budget={evaluation.budget} level={draft.level} />
            ) : (
              <p className="text-muted">Needs a level, a base salary and a start quarter.</p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}

function NoRequest({ history }: { history: Decision[] }) {
  return (
    <article aria-label="Business case" className="rounded-md border border-hairline bg-surface">
      <div className="flex flex-col gap-6 px-5 py-7 @3xl:flex-row @3xl:items-center @3xl:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-title text-ink">No request open</h1>
          <p className="mt-2 max-w-[50ch] text-muted">
            Describe the hire to the copilot, for example &ldquo;I need approval to hire a senior engineer in New York next quarter.&rdquo; It drafts the business case
            here, prices it and checks it against the FY2027 plan and the written policy. You can edit any field, and nothing is submitted until you click.
          </p>
          <Button className="mt-4" onClick={() => createDraft()}>
            Start a blank request
          </Button>
        </div>
        <figure className="flex w-[220px] shrink-0 flex-col items-center gap-2 text-center">
          <ApprovalSeal requestId="no request" checks={[]} signers={[]} size={88} label="Approval seal: no request open yet" />
          <figcaption className="text-small text-muted">The seal fills as the request does: a petal for each check that passes, a ring for each approver who signs.</figcaption>
        </figure>
      </div>
      <div className="border-t border-hairline px-5 pb-5 pt-4 @3xl:px-8">
        <RecentRequests history={history} teamId={CURRENT_TEAM.id} teamName={CURRENT_TEAM.name} />
      </div>
    </article>
  );
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-hairline pb-1.5">
      <h2 className="section-label">{title}</h2>
      {children && <span className="text-small text-muted">{children}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Fields, and inputs that keep a local value while you type and commit on blur or Enter. When the
// agent changes the draft, the new value flows in through `value`.

const bandHint = (band: CompBand) => `${band.level} ${band.tier.replace("tier", "Tier ")}: ${usd(band.min)} to ${usd(band.max)}, midpoint ${usd(band.mid)}`;

function SourceTag({ source }: { source: string }) {
  return source === "edited by you" ? <Tag tone="outline">{source}</Tag> : <Tag>{source}</Tag>;
}

function Field({
  label,
  hint,
  source,
  rule,
  badge,
  required,
  wide,
  children,
}: {
  label: string;
  hint?: ReactNode;
  source?: string | null;
  rule?: string;
  badge?: ReactNode;
  required?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${wide ? "@md:col-span-2" : ""}`}>
      <span className="mb-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-small">
        <span className="font-medium text-ink">{label}</span>
        {required && <Tag tone="red">Required</Tag>}
        {badge}
        {rule && <span className="ml-auto font-mono text-muted">{rule}</span>}
      </span>
      {children}
      {(source || hint) && (
        <span className="mt-1.5 flex flex-col items-start gap-1 text-small text-muted">
          {source && <SourceTag source={source} />}
          {hint && <span className="block">{hint}</span>}
        </span>
      )}
    </label>
  );
}

const inputClass = (invalid = false) =>
  `w-full rounded-[5px] border bg-surface px-2.5 text-body text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-green focus:shadow-[0_0_0_3px_rgb(30_70_52/0.12)] ${
    invalid ? "border-red shadow-[0_0_0_3px_rgb(180_35_24/0.08)]" : "border-rule hover:border-[#bdb9ae]"
  }`;

function useLocal<T>(value: T) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return [local, setLocal] as const;
}

function TextInput({ value, placeholder, invalid, onCommit }: { value: string; placeholder?: string; invalid?: boolean; onCommit: (v: string) => void }) {
  const [local, setLocal] = useLocal(value);
  return (
    <input
      className={`${inputClass(invalid)} h-8`}
      value={local}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onCommit(local.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function TextArea({ value, invalid, onCommit }: { value: string; invalid?: boolean; onCommit: (v: string) => void }) {
  const [local, setLocal] = useLocal(value);
  return (
    <textarea
      className={`${inputClass(invalid)} min-h-[68px] resize-y py-1.5`}
      rows={3}
      value={local}
      aria-invalid={invalid || undefined}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onCommit(local.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.currentTarget.blur()}
    />
  );
}

function MoneyInput({ value, onCommit }: { value: number | null; onCommit: (v: number | null) => void }) {
  const shown = value === null ? "" : value.toLocaleString("en-US");
  const [local, setLocal] = useLocal(shown);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">$</span>
      <input
        className={`${inputClass()} h-8 pl-6 tabular-nums`}
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          // "225,000.00", "$225k" and "225000" are all 225000. Anything ambiguous is rejected: the field goes back to its value.
          const parsed = parseMoney(local);
          if (parsed.ok && parsed.value !== value) onCommit(parsed.value);
          else setLocal(shown);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    </div>
  );
}

function Select<T extends string>({ value, options, onCommit }: { value: T | null; options: (readonly [T, string])[]; onCommit: (v: T) => void }) {
  return (
    <div className="relative">
      <select className={`${inputClass()} h-8 cursor-pointer appearance-none pr-8`} value={value ?? ""} onChange={(e) => onCommit(e.target.value as T)}>
        {value === null && <option value="">Choose…</option>}
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
