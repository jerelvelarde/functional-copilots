// Concept: show the agent's work, the way Linear and Harvey do.
//
// CopilotChat's "turn" tool-call display (toolCallDisplay: "turn", set in ChatPanel.tsx) lets the
// agent work in the open: a row per tool call while the turn runs, folded into "Worked for 6s ·
// 7 steps" once the reply is done. A call joins that display only when its renderer opts in with
// `group: true`. This registers one wildcard renderer (useRenderTool with name "*") for the data
// tools, the ones with no card of their own, and writes each call as a sentence: present tense
// while it runs ("Checking the policy rules…"), past tense with its result when it is done
// ("Checked 9 rules · 1 to fix"). Never a raw tool name. The cards (useGenerativeUI.tsx) and the
// approval card (useSubmitForApproval.tsx) have renderers of their own, so they always show.
//
// TurnSummary is the folded line (the `workSummary` slot, set in ChatPanel.tsx): it names the
// steps the turn took ("Read FY2027 plan · Checked 9 rules") and leaves the cards out of it.

import { useRenderTool, type CopilotChatWorkSummaryProps } from "@copilotkit/react-core/v2";
import { WorkRow, WorkSummary } from "@/components/ui/WorkRow";
import { usd } from "@/components/ui/format";

type Args = Record<string, unknown>;
type Result = Record<string, unknown> & { error?: string };
type Words = {
  running: (args: Args) => string;
  done: (args: Args, result: Result) => { text: string; detail?: string };
  /** The step in a few words, for the folded summary line. */
  short: (args: Args, result: Result) => string;
};

const FIELDS: Record<string, string> = {
  roleTitle: "role title",
  level: "level",
  location: "location",
  startQuarter: "start quarter",
  type: "request type",
  baseSalary: "base salary",
  justification: "justification",
  aboveMidpointReason: "reason above the midpoint",
  planOffset: "plan offset",
  securityAccess: "security and access",
};

const fieldList = (fields: unknown) => (Array.isArray(fields) ? fields.map((f) => FIELDS[String(f)] ?? String(f)).join(", ") : "");
const money = (value: unknown) => (typeof value === "number" ? usd(value) : "");
const tier = (value: unknown) => String(value ?? "").replace("tier", "Tier ");

/** The words for each data tool: what it is doing, and what it did. */
const WORK: Record<string, Words> = {
  getHeadcountPlan: {
    running: () => "Reading the FY2027 headcount plan…",
    done: (_, r) => {
      const left = money((r.budget as Result | undefined)?.remaining);
      return { text: `Read the ${[r.team, r.fiscalYear].filter(Boolean).join(" ")} plan`, detail: left ? `${left} budget left` : undefined };
    },
    short: (_, r) => `Read ${r.fiscalYear ?? "FY2027"} plan`,
  },
  getCompBand: {
    running: (a) => `Looking up the ${a.level ?? ""} ${a.location ?? ""} salary band…`,
    done: (a, r) => ({ text: `Looked up the ${a.level} ${tier(r.tier)} band`, detail: r.mid ? `midpoint ${money(r.mid)}` : undefined }),
    short: (a) => `${a.level ?? ""} ${a.location ?? ""} band`.trim(),
  },
  calculateCost: {
    running: () => "Calculating the fully loaded cost…",
    done: (_, r) => {
      const cost = r.cost as Result | undefined;
      return { text: "Calculated the cost", detail: cost ? `${money(cost.fullyLoadedAnnual)} a year, ${money(cost.fiscalYearImpact)} in FY2027` : undefined };
    },
    short: (_, r) => {
      const cost = r.cost as Result | undefined;
      return cost ? `Priced at ${money(cost.fullyLoadedAnnual)}` : "Priced the hire";
    },
  },
  checkPolicy: {
    running: () => "Checking the policy rules…",
    done: (_, r) => {
      const results = Array.isArray(r.results) ? r.results.length : 0;
      const blockers = Array.isArray(r.blockers) ? r.blockers.length : 0;
      return { text: `Checked ${results} rules`, detail: blockers ? `${blockers} to fix` : "nothing to fix" };
    },
    short: (_, r) => (Array.isArray(r.results) ? `Checked ${r.results.length} rules` : "Checked the rules"),
  },
  startRequest: {
    running: () => "Starting the business case…",
    done: (_, r) =>
      r.started === false
        ? { text: "Did not start a new request", detail: `${r.openRequestId} is still open` }
        : { text: `Started ${r.requestId}`, detail: fieldList(r.changed) && `filled ${fieldList(r.changed)}` },
    short: (_, r) => (r.started === false ? "Kept the open request" : `Started ${r.requestId ?? "the request"}`),
  },
  updateRequest: {
    running: () => "Updating the business case…",
    done: (_, r) => {
      const refused = Array.isArray(r.refused) ? r.refused.map((x) => (x as Result).field) : [];
      const changed = fieldList(r.changed);
      if (!changed && refused.length) return { text: "Left your edit as it is", detail: `you set ${fieldList(refused)}` };
      return { text: `Updated ${r.requestId}`, detail: changed || undefined };
    },
    short: (_, r) => `Updated ${r.requestId ?? "the request"}`,
  },
};

function parseResult(result: unknown): Result {
  if (typeof result !== "string") return (result as Result) ?? {};
  try {
    const parsed = JSON.parse(result);
    return parsed && typeof parsed === "object" ? (parsed as Result) : {};
  } catch {
    return {};
  }
}

function ToolWork({ name, args, status, result }: { name: string; args?: Args; status: string; result?: unknown }) {
  const words = WORK[name];
  if (status !== "complete") return <WorkRow state="running" text={words ? words.running(args ?? {}) : "Working…"} />;
  const parsed = parseResult(result);
  if (parsed.error) return <WorkRow state="failed" text={words ? words.running(args ?? {}).replace(/…$/, "") : "A step"} detail={String(parsed.error)} />;
  const done = words ? words.done(args ?? {}, parsed) : { text: "Done" };
  return <WorkRow state="done" text={done.text} detail={done.detail} />;
}

export function useWorkRows() {
  useRenderTool(
    {
      name: "*",
      group: true, // join the "turn" display: rows while the agent works, folded once it replies
      render: ({ name, args, status, result }: { name: string; args?: Args; status: string; result?: unknown }) => (
        <ToolWork name={name} args={args} status={status} result={result} />
      ),
    },
    [],
  );
}

const parseArgs = (json: string): Args => {
  const parsed = parseResult(json);
  return parsed as Args;
};

/** The folded line of a turn, naming its data steps. Cards and the approval card are not steps. */
export function TurnSummary({ calls, ...props }: CopilotChatWorkSummaryProps) {
  const steps = calls.flatMap(({ toolCall, toolMessage }) => {
    const words = WORK[toolCall.function.name];
    if (!words) return [];
    return [words.short(parseArgs(toolCall.function.arguments), parseResult(toolMessage?.content))];
  });
  return <WorkSummary {...props} steps={steps} />;
}
