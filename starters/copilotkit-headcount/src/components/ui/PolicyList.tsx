// Policy results and the approval route, as computed by evaluateRequest().
//
// Each check is one line: a verdict tag with a word, the rule's name, the figure it tested and its
// rule id (the line it was tested against is in the tooltip and the sentence). A check that blocks
// (Fix, Missing) opens to its plain sentence by default; any row opens on a click to the sentence
// and the rule as written in policies.md, or, for a published skill, what the skill asks for.

"use client";

import { BookMarked, ChevronDown } from "lucide-react";
import { createContext, useContext, useState } from "react";
import type { ApprovalStep, Evaluation, HeadcountRequest, PolicyResult } from "@/lib/headcount";
import type { PolicyRule } from "@/lib/policy-rules";
import type { PublishedSkill } from "@/lib/store";
import { Avatar } from "./Avatar";
import type { SignerState } from "./ApprovalSeal";
import { Tag, VerdictTag } from "./Card";
import { ruleMeasure } from "./rule-measures";

/** The written policy, by rule id, read on the server (app/page.tsx) and provided once for the app. */
const PolicyRulesContext = createContext<Record<string, PolicyRule>>({});
export const PolicyRulesProvider = PolicyRulesContext.Provider;

const isSkillRow = (result: PolicyResult) => result.ruleId.startsWith("skill-");
const needsAttention = (result: PolicyResult) => result.status === "fail" || result.status === "missing" || result.status === "warn";

/** "What to do" from a published skill's markdown, for its row's expanded text. */
function skillGuidance(markdown: string): string {
  const section = markdown.split(/^## /m).find((part) => part.startsWith("What to do"));
  return (section ?? markdown).replace(/^What to do\s*/, "").trim();
}

export function PolicyList({
  results,
  evaluation,
  request,
  skills = [],
  compact = false,
}: {
  results: PolicyResult[];
  evaluation?: Evaluation;
  request?: HeadcountRequest;
  skills?: PublishedSkill[];
  /** In the chat: one line per rule, with the sentence only where a person needs to act. */
  compact?: boolean;
}) {
  const rules = results.filter((r) => !isSkillRow(r));
  const fromSkills = results.filter(isSkillRow);
  const row = (result: PolicyResult) => (
    <PolicyRow key={result.ruleId + result.title} result={result} evaluation={evaluation} request={request} skills={skills} compact={compact} />
  );
  return (
    <div>
      <ul className="divide-y divide-hairline">{rules.map(row)}</ul>
      {fromSkills.length > 0 && (
        <>
          <p className="mt-3 flex items-center gap-1.5 border-b border-hairline pb-1.5 text-small font-medium text-muted">
            <BookMarked aria-hidden className="size-3.5" strokeWidth={1.75} />
            From published skills
          </p>
          <ul className="divide-y divide-hairline">{fromSkills.map(row)}</ul>
        </>
      )}
    </div>
  );
}

function PolicyRow({
  result,
  evaluation,
  request,
  skills,
  compact,
}: {
  result: PolicyResult;
  evaluation?: Evaluation;
  request?: HeadcountRequest;
  skills: PublishedSkill[];
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rules = useContext(PolicyRulesContext);
  const skill = isSkillRow(result) ? skills.find((s) => result.ruleId === `${s.id} v${s.version}`) : undefined;
  const rule = rules[result.ruleId];
  const measure = evaluation && request ? ruleMeasure(result, evaluation, request) : null;
  const expandable = Boolean(rule || skill);
  // In the chat: the sentence only where a person needs to act. On the page: one line per rule, and
  // the sentence opens by default only for what blocks (Fix, Missing); the rest open on a click.
  const blocks = result.status === "fail" || result.status === "missing";
  const showSentence = compact ? needsAttention(result) : blocks || open;
  // The lead time's line is its deadline; every other rule's is the figure it tested
  const figure = measure && (result.ruleId === "POL-HC-04" ? measure.threshold : measure.value);

  return (
    <li className={skill ? "bg-paper" : ""}>
      <button
        type="button"
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        onClick={() => setOpen((v) => !v)}
        title={measure ? [measure.value, measure.threshold].filter(Boolean).join(" · ") : undefined}
        className={`grid w-full grid-cols-[72px_minmax(0,1fr)] gap-x-2.5 text-left ${compact ? "py-2" : "py-1"} ${skill ? "px-2" : ""} ${expandable ? "cursor-pointer hover:bg-paper" : "cursor-default"}`}
      >
        <VerdictTag status={result.status} className="mt-px" />
        <span className="min-w-0">
          <span className={`flex items-baseline justify-between gap-x-3 ${compact ? "flex-wrap" : ""}`}>
            <span className={`min-w-0 font-medium text-ink ${compact ? "" : "truncate"}`}>{result.title}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              {figure && !compact && <span className="font-semibold">{figure}</span>}
              {!(skill && !compact) && <span className="font-mono text-small text-muted">{result.ruleId}</span>}
              {expandable && <ChevronDown aria-hidden className={`size-3.5 self-center text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />}
            </span>
          </span>
          {/* A published skill's id and version are long: on the page they sit under its name */}
          {skill && !compact && <span className="block font-mono text-small text-muted">{result.ruleId}</span>}
          {showSentence && <span className="mt-0.5 block text-small text-muted">{result.detail}</span>}
        </span>
      </button>
      {open && (rule || skill) && (
        <div className={`mb-2 ml-[82px] rounded-sm bg-stone px-3 py-2 text-small text-ink ${skill ? "mr-2" : ""}`}>
          {rule && (
            <>
              <span className="font-mono">{rule.id}</span> <span className="font-semibold">{rule.title}.</span> {rule.text}
            </>
          )}
          {skill && (
            <>
              <span className="mb-1 block font-semibold">{skill.title}</span>
              <span className="block whitespace-pre-line">{skillGuidance(skill.markdown)}</span>
            </>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------------------------
// The approval route: who signs, in order, and why each person is on it

const STATE_TAG: Record<SignerState, { label: string; tone: "outline" | "green" | "red" }> = {
  pending: { label: "Not signed", tone: "outline" },
  approved: { label: "Approved", tone: "green" },
  sent_back: { label: "Sent back", tone: "red" },
  rejected: { label: "Rejected", tone: "red" },
};

function Reason({ step }: { step: ApprovalStep }) {
  if (step.ruleId === "POL-APR-02") {
    return (
      <>
        Added by <span className="font-mono">POL-APR-02</span> · {step.reason.replace(/^CFO: /, "")}
      </>
    );
  }
  return (
    <>
      {step.reason} · <span className="font-mono">{step.ruleId}</span>
    </>
  );
}

export function ApprovalChain({
  steps,
  states,
  waitingIndex,
  compact = false,
}: {
  steps: ApprovalStep[];
  /** Each step's signature, in order. Omitted for a draft: nobody has signed yet. */
  states?: SignerState[];
  /** The step whose turn it is, in a pending request. */
  waitingIndex?: number;
  compact?: boolean;
}) {
  if (steps.length === 0) return <p className="py-2 text-small text-muted">Approvers appear once the level and cost are known.</p>;
  return (
    <ol className="divide-y divide-hairline">
      {steps.map((step, index) => {
        const state = states?.[index] ?? "pending";
        const tag = index === waitingIndex ? { label: "Reviewing now", tone: "outline" as const } : STATE_TAG[state];
        return (
          <li key={step.personId} className={`flex gap-2.5 ${compact ? "py-1.5" : "py-2"}`}>
            <Avatar name={step.name} size={compact ? 24 : 28} tone={state === "approved" ? "green" : "stone"} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium">{step.name}</span>
                  <span className="text-small text-muted">
                    {" "}
                    · <span className="whitespace-nowrap">{step.title}</span>
                  </span>
                </span>
                {(states || !compact) && <Tag tone={tag.tone}>{tag.label}</Tag>}
              </div>
              <div className="text-small text-muted">
                <Reason step={step} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
