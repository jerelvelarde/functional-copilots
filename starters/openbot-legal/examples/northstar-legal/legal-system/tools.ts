// Northstar Legal's eleven tools, as pure functions of the state: server.ts serves them over MCP and saves
// the state after a write. Every count, amount, risk, route and evidence result the copilot shows comes
// from here, worked out by the web app's tested modules in lib/; the model never computes one.
//
// Arguments carry only matter ids, passage ids ("§8.2"), finding refs ("F3") and the person's own text.
// Never a rule id: OpenBot's safety floor reads every word of a call, and "PB-PAY-01" matches its
// payments pattern, so a call that named it would be handed to the person and never run. Rule ids
// appear in results only. Tested in tools.test.ts.

import { readFileSync } from "node:fs";
import path from "node:path";
import { checkSecurityEvidence } from "./evidence";
import { CURRENT_USER, getPerson } from "./lib/company";
import { type Contract, findPassage, parseContract } from "./lib/contract";
import { classifyComment } from "./lib/learning";
import { MATTER_IDS, type MatterRecord, getMatter, matterTitle } from "./lib/matters";
import { buildPlan, learnedLabel } from "./lib/plan";
import {
  type Finding,
  type LearnedRule,
  acceptedDeviations,
  deviations,
  recheckRedline,
  redlineSummary,
  reviewContract,
  routeApprovals,
  totalContractValue,
} from "./lib/review";
import type { ApproverId, Decision, LegalState, MatterState } from "./state";

export type ToolName =
  | "list_matters"
  | "get_matter"
  | "read_passage"
  | "propose_plan"
  | "review_contract"
  | "set_redline"
  | "set_reason"
  | "send_for_approval"
  | "get_approval_status"
  | "check_security_evidence"
  | "resubmit_for_approval";

export type ToolSpec = { name: ToolName; description: string; inputSchema: Record<string, unknown>; writes: boolean };

// ---------------------------------------------------------------------------------------------
// The tool list, as OpenBot sees it

const MATTER = {
  type: "string",
  enum: MATTER_IDS,
  description: "The matter: acme-msa (Acme Cloud, Master Services Agreement) or brightwater-order-form (Brightwater Metrics, Order Form).",
};
const REF = {
  type: "string",
  description: 'A finding ref from review_contract, such as "F3". Never a rule id.',
};
const one = (properties: Record<string, unknown> = {}) => ({
  type: "object",
  properties: { matterId: MATTER, ...properties },
  required: ["matterId", ...Object.keys(properties)],
});

export const TOOLS: readonly ToolSpec[] = [
  {
    name: "list_matters",
    description: "List the matters in the legal queue, each with its stage (unreviewed, reviewed, submitted, sent_back, resubmitted, approved) and its next step. Read-only.",
    inputSchema: { type: "object", properties: {}, required: [] },
    writes: false,
  },
  {
    name: "get_matter",
    description:
      "Read one matter: parties, kind, product, business owner, sections with their passage ids, word count, annual fee, initial term and total contract value (annual fee times initial term). Quote these figures; never compute your own. Read-only.",
    inputSchema: one(),
    writes: false,
  },
  {
    name: "read_passage",
    description: 'Quote one passage of the contract word for word, by its id ("§8.2"), for a citation. Read-only.',
    inputSchema: one({ passage: { type: "string", description: 'A passage id as the contract numbers it, such as "§8.2".' } }),
    writes: false,
  },
  {
    name: "propose_plan",
    description:
      "The review plan for a matter: 17 tasks in order, plus one for each published rule that applies (18 once PB-SEC-01 is published), each with the playbook rules it checks and the passages it reads. The last task waits for every approval. Read-only.",
    inputSchema: one(),
    writes: false,
  },
  {
    name: "review_contract",
    description:
      "Review a matter against the playbook and every published rule. Returns every finding with its ref (F1, F2, ...), status (pass, deviation, request), risk, rule id, cited passage, the vendor's words, Northstar's position and the redline on file (drafted, or the person's own with its re-check and reason); the counts; the total contract value; and the approval route with each approver's rule. Show these as returned; never count, add or rank them yourself. Read-only.",
    inputSchema: one(),
    writes: false,
  },
  {
    name: "set_redline",
    description:
      "Record the person's own clause for one finding, exactly as they wrote it, and re-check it against the finding's rule. Returns whether it still meets the rule and, if not, that a reason for the General Counsel is needed. Use the finding's ref, never its rule id.",
    inputSchema: one({ ref: REF, text: { type: "string", description: "The person's clause, exactly as they wrote it." } }),
    writes: true,
  },
  {
    name: "set_reason",
    description: "Record the person's reason, in their words, for accepting a deviation below the playbook. The General Counsel reads it with the approval. Use the finding's ref, never its rule id.",
    inputSchema: one({ ref: REF, reason: { type: "string", description: "The person's reason, in their own words." } }),
    writes: true,
  },
  {
    name: "send_for_approval",
    description:
      "Send the reviewed matter to its approval route (General Counsel, then Head of Security, then CFO, as the playbook routes it). Refuses while a deviation kept below the playbook has no reason. Call only when the person asks to send it. Returns the route and what happens next.",
    inputSchema: one(),
    writes: true,
  },
  {
    name: "get_approval_status",
    description:
      "Where a matter stands with its approvers: each approver's name, title, decision, date and their own words; anything that arrived since (such as the vendor's security evidence); the next step; and the matter's log. Quote approvers' words exactly. Read-only.",
    inputSchema: one(),
    writes: false,
  },
  {
    name: "check_security_evidence",
    description:
      "Check the vendor's security evidence (SOC 2 report and pen-test summary) against PB-SEC-01, the published rule: four lines, each pass or fail with its detail, and whether it passes overall. The result is decided here, in code; show it as returned. Read-only.",
    inputSchema: one(),
    writes: false,
  },
  {
    name: "resubmit_for_approval",
    description:
      "Send a matter that was sent back to the approver who sent it back, once their ask is met (for a security-evidence ask, once the evidence passes PB-SEC-01). Refuses otherwise, and refuses a second resubmit. Call only when the person asks. Returns the route and a message to repeat as written.",
    inputSchema: one(),
    writes: true,
  },
];

const TOOL_NAMES = TOOLS.map((t) => t.name);

// ---------------------------------------------------------------------------------------------
// What the tools read

const DATA = path.join(import.meta.dir, "../data");
const CONTRACTS: Record<string, Contract> = Object.fromEntries(MATTER_IDS.map((id) => [id, parseContract(readFileSync(path.join(DATA, "contracts", `${id}.md`), "utf8"))]));

/** The titles of rules a person can publish (lib/learning.ts drafts them). */
const RULE_TITLES: Record<string, string> = { "PB-SEC-01": "Security evidence for data processors" };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const COUNT_WORDS = ["none", "one", "two", "three", "four", "five", "six"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);
const listNames = (names: readonly string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

type Result = { ok: true; [key: string]: unknown } | { ok: false; error: string };
type Outcome = { result: Result; state: LegalState };

class Refusal extends Error {}
const refuse = (error: string): never => {
  throw new Refusal(error);
};

const learnedRules = (state: LegalState): LearnedRule[] => state.publishedRules.map((r) => ({ id: r.id, version: r.version, title: RULE_TITLES[r.id] ?? r.id }));

type RefFinding = Finding & { ref: string };
const findingsFor = (state: LegalState, matter: MatterRecord): RefFinding[] => reviewContract(matter, learnedRules(state)).map((f, i) => ({ ...f, ref: `F${i + 1}` }));

/** The redlines on file keyed by rule id, as lib/review.ts reads them. */
const redlinesByRule = (findings: readonly RefFinding[], m: MatterState) =>
  Object.fromEntries(findings.filter((f) => f.ruleId && m.redlines[f.ref]).map((f) => [f.ruleId!, m.redlines[f.ref]]));

/** Deviations kept below the playbook (a person's clause that does not meet the rule) with no reason yet. */
const missingReasons = (findings: readonly RefFinding[], m: MatterState) => {
  const accepted = new Set(acceptedDeviations(findings, redlinesByRule(findings, m)).map((f) => f.ruleId));
  return findings.filter((f) => f.status === "deviation" && accepted.has(f.ruleId) && !m.reasons[f.ref]?.trim());
};

function matterArg(state: LegalState, args: Record<string, unknown>): { matter: MatterRecord; m: MatterState } {
  const id = args.matterId;
  if (typeof id !== "string" || !MATTER_IDS.includes(id) || !state.matters[id])
    refuse(`${typeof id === "string" && id ? `Unknown matter "${id}".` : "Missing matterId."} Valid matter ids: ${MATTER_IDS.join(", ")}.`);
  return { matter: getMatter(id as string), m: state.matters[id as string] };
}

function refArg(findings: readonly RefFinding[], args: Record<string, unknown>, matterId: string): RefFinding {
  const ref = typeof args.ref === "string" ? args.ref.trim().toUpperCase() : "";
  const found = findings.find((f) => f.ref === ref);
  if (!found) refuse(`${ref ? `Unknown finding ref "${args.ref}"` : "Missing ref"} for ${matterId}. Valid refs: ${findings.map((f) => `${f.ref} (${f.cite}, ${f.topic})`).join("; ")}.`);
  return found as RefFinding;
}

function textArg(args: Record<string, unknown>, key: "text" | "reason"): string {
  const value = typeof args[key] === "string" ? (args[key] as string).trim() : "";
  if (!value) refuse(`Missing ${key}: send the person's own words.`);
  if (value.length > 4000) refuse(`The ${key} is over 4,000 characters. Send the person's words for this one finding only.`);
  return value;
}

/** Redlines and reasons change only before the review goes to the approvers. */
function assertEditable(matter: MatterRecord, m: MatterState) {
  if (m.stage !== "unreviewed" && m.stage !== "reviewed")
    refuse(`The ${matterTitle(matter)} review is with the approvers (stage ${m.stage}), so its redlines and reasons are locked. Nothing was changed.`);
}

const personName = (id: string) => getPerson(id).name;

/** "2026-11-05T14:05" -> "Thu Nov 5, 2:05 pm": said the same way every time, so the model never formats a date. */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function whenText(at: string | null): string | null {
  if (!at) return null;
  const [date, time = "00:00"] = at.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const day = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${day} ${MONTHS[mo - 1]} ${d}, ${hour}:${String(mi).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

const STATUS_LABEL: Record<Decision["status"], string> = {
  approved: "Approved",
  sent_back: "Sent back",
  pending: "Reviewing now",
  queued: "Queued",
};

const decisionView = (d: Decision) => {
  const person = getPerson(d.approverId);
  return { name: person.name, title: person.title, status: d.status, label: STATUS_LABEL[d.status], at: d.at, when: whenText(d.at), comment: d.comment };
};

function nextStep(matter: MatterRecord, m: MatterState): string {
  const waiting = m.route.find((d) => d.status === "pending");
  const sentBack = m.route.find((d) => d.status === "sent_back");
  switch (m.stage) {
    case "unreviewed":
      return "Not reviewed yet.";
    case "reviewed":
      return "Reviewed; not sent for approval yet.";
    case "submitted":
    case "resubmitted":
      return waiting ? `Waiting on ${personName(waiting.approverId)}.` : "Waiting on the approvers.";
    case "sent_back":
      return sentBack ? `Resubmit to ${personName(sentBack.approverId)} once ${getPerson(sentBack.approverId).name.split(" ")[0]}'s ask is met.` : "Resubmit once the ask is met.";
    case "approved":
      return `All approved. The redline package can go to ${matter.vendorShort}.`;
  }
}

/** What reached Northstar Legal after the last decision on the route: on Friday, Acme's security evidence. */
function arrivedSince(state: LegalState, matter: MatterRecord, m: MatterState) {
  const since = [m.submittedAt, ...m.route.map((d) => d.at)].filter((at): at is string => !!at).sort().at(-1);
  const e = m.evidence;
  if (!since || !e || e.receivedAt <= since || e.receivedAt > state.now) return [];
  const pieces = [e.soc2 ? `SOC 2 ${e.soc2.reportType} report` : null, e.penTest ? "pen-test summary" : null].filter(Boolean) as string[];
  return [{ what: `${matter.vendorShort}'s ${listNames(pieces)}`, at: e.receivedAt, when: whenText(e.receivedAt) }];
}

/** One sentence the copilot can say as given: the count is the code's, never the model's. */
export function evidenceSummary(lines: readonly { check: string; status: "pass" | "fail" }[]): string {
  const failed = lines.filter((l) => l.status === "fail");
  if (failed.length === 0) return `All ${lines.length} PB-SEC-01 checks pass.`;
  return `${failed.length} of ${lines.length} PB-SEC-01 checks fail: ${failed.map((l) => l.check).join("; ")}.`;
}

function publishedSec(state: LegalState) {
  const rule = state.publishedRules.find((r) => r.id === "PB-SEC-01");
  if (!rule) refuse("PB-SEC-01 is not published yet, so there is no security-evidence rule to check against. Nothing was checked.");
  return rule!;
}

// ---------------------------------------------------------------------------------------------
// The handlers

type Handler = (state: LegalState, args: Record<string, unknown>) => Outcome;
const read = (work: (state: LegalState, args: Record<string, unknown>) => Record<string, unknown>): Handler => (state, args) => ({ result: { ok: true, ...work(state, args) }, state });
/** A write works on a copy; the caller's state object is never changed. */
const write =
  (work: (next: LegalState, args: Record<string, unknown>) => Record<string, unknown>): Handler =>
  (state, args) => {
    const next = structuredClone(state);
    return { result: { ok: true, ...work(next, args) }, state: next };
  };

const HANDLERS: Record<ToolName, Handler> = {
  list_matters: read((state) => ({
    now: state.now,
    matters: MATTER_IDS.map((id) => {
      const matter = getMatter(id);
      const m = state.matters[id];
      return { matterId: id, matterNumber: matter.matterNumber, vendor: matter.vendorShort, kind: matter.kind, product: matter.product, receivedAt: matter.receivedAt, stage: m.stage, next: nextStep(matter, m) };
    }),
  })),

  get_matter: read((state, args) => {
    const { matter, m } = matterArg(state, args);
    const contract = CONTRACTS[matter.id];
    const owner = getPerson(matter.businessOwner);
    const total = totalContractValue(matter.terms);
    return {
      matterId: matter.id,
      matterNumber: matter.matterNumber,
      title: matterTitle(matter),
      vendor: matter.vendorShort,
      vendorLegalName: matter.vendor,
      kind: matter.kind,
      product: matter.product,
      parties: matter.terms.parties.value,
      businessOwner: { name: owner.name, title: owner.title },
      receivedAt: matter.receivedAt,
      pricingHoldsUntil: matter.pricingHoldsUntil,
      sectionCount: contract.sections.length,
      sections: contract.sections.map((s) => ({ number: s.number, title: s.title, passages: s.passages.map((p) => p.id) })),
      words: contract.words,
      annualFee: matter.terms.annualFee.value,
      initialTermMonths: matter.terms.initialTermMonths.value,
      totalContractValue: total,
      totalContractValueText: `${usd(total)} (${usd(matter.terms.annualFee.value)} a year for ${matter.terms.initialTermMonths.value} months)`,
      stage: m.stage,
    };
  }),

  read_passage: read((state, args) => {
    const { matter } = matterArg(state, args);
    const contract = CONTRACTS[matter.id];
    const raw = typeof args.passage === "string" ? args.passage.trim() : "";
    const id = /^\d+\.\d+$/.test(raw) ? `§${raw}` : raw.replace(/^§\s+/, "§");
    const passage = findPassage(contract, id);
    if (!passage) refuse(`${raw ? `No passage "${raw}"` : "Missing passage"} in ${matterTitle(matter)}. Valid passage ids: ${contract.sections.flatMap((s) => s.passages.map((p) => p.id)).join(", ")}.`);
    const section = contract.sections.find((s) => s.number === passage!.section)!;
    return { matterId: matter.id, passage: passage!.id, section: `${section.number}. ${section.title}`, caption: passage!.caption, text: passage!.text };
  }),

  propose_plan: read((state, args) => {
    const { matter } = matterArg(state, args);
    const plan = buildPlan(matter, learnedRules(state));
    return {
      matterId: matter.id,
      taskCount: plan.length,
      tasks: plan.map((t, i) => ({
        n: i + 1,
        id: t.id,
        title: t.title,
        rules: t.ruleIds,
        reads: [...new Set(t.terms.map((key) => matter.terms[key].cite))],
        ...(t.learned ? { learned: learnedLabel(t.learned).slice(1, -1) } : {}),
      })),
      note: `Task ${plan.length} waits until every approver has approved.`,
    };
  }),

  review_contract: read((state, args) => {
    const { matter, m } = matterArg(state, args);
    const findings = findingsFor(state, matter);
    const devs = deviations(findings);
    const missing = new Set(missingReasons(findings, m).map((f) => f.ref));
    const total = totalContractValue(matter.terms);
    const risk = (r: string) => devs.filter((f) => f.risk === r).length;
    return {
      matterId: matter.id,
      title: matterTitle(matter),
      publishedRulesApplied: state.publishedRules.map((r) => `${r.id} v${r.version}`),
      counts: {
        checks: findings.length,
        deviations: devs.length,
        high: risk("high"),
        medium: risk("medium"),
        low: risk("low"),
        passes: findings.filter((f) => f.status === "pass").length,
        requests: findings.filter((f) => f.status === "request").length,
      },
      findings: findings.map((f) => {
        const own = m.redlines[f.ref];
        const redline = own ?? f.redline;
        return {
          ref: f.ref,
          topic: f.topic,
          status: f.status,
          risk: f.risk,
          ruleId: f.ruleId,
          cite: f.cite,
          quote: f.quote,
          vendorWrote: f.vendorWrote,
          position: f.position,
          redline,
          redlineBy: own ? "person" : redline ? "drafted" : null,
          ...(own && f.ruleId ? { recheck: recheckRedline(f.ruleId, own) } : {}),
          ...(m.reasons[f.ref] ? { reason: m.reasons[f.ref] } : {}),
          needsReason: missing.has(f.ref),
          ...(f.learned ? { learned: `${f.learned.id} v${f.learned.version}` } : {}),
        };
      }),
      annualFee: matter.terms.annualFee.value,
      initialTermMonths: matter.terms.initialTermMonths.value,
      totalContractValue: total,
      totalContractValueText: usd(total),
      route: routeApprovals(findings, total).map((s) => ({ name: s.name, title: s.title, ruleId: s.ruleId, reason: s.reason })),
    };
  }),

  set_redline: write((next, args) => {
    const { matter, m } = matterArg(next, args);
    const findings = findingsFor(next, matter);
    const f = refArg(findings, args, matter.id);
    const text = textArg(args, "text");
    if (f.status !== "deviation" && f.status !== "request")
      refuse(`${f.ref} (${f.cite}, ${f.topic}) ${f.status === "pass" ? "meets the playbook" : "has no rule"}, so there is nothing to redline. Findings with a redline: ${findings.filter((x) => x.status === "deviation" || x.status === "request").map((x) => `${x.ref} (${x.cite})`).join(", ")}.`);
    assertEditable(matter, m);
    m.redlines[f.ref] = text;
    m.stage = "reviewed";
    const recheck = recheckRedline(f.ruleId!, text);
    const needsReason = f.status === "deviation" && !recheck.meets && !m.reasons[f.ref]?.trim();
    m.log.push({ at: next.now, by: CURRENT_USER.name, event: `Set the ${f.cite} redline (${f.ref}): ${recheck.meets ? "meets" : "still deviates from"} ${f.ruleId}` });
    return {
      matterId: matter.id,
      ref: f.ref,
      cite: f.cite,
      topic: f.topic,
      ruleId: f.ruleId,
      recorded: text,
      recheck,
      summary: redlineSummary(f.ruleId!, text),
      needsReason,
      next: needsReason ? `Ask the person for the reason to give ${personName("rachel")} (General Counsel) for accepting ${f.cite} below the playbook. Keep their clause as written.` : null,
    };
  }),

  set_reason: write((next, args) => {
    const { matter, m } = matterArg(next, args);
    const findings = findingsFor(next, matter);
    const f = refArg(findings, args, matter.id);
    const reason = textArg(args, "reason");
    if (f.status !== "deviation")
      refuse(`${f.ref} (${f.cite}, ${f.topic}) is not a deviation, so it needs no reason. Deviations: ${findings.filter((x) => x.status === "deviation").map((x) => `${x.ref} (${x.cite})`).join(", ")}.`);
    assertEditable(matter, m);
    m.reasons[f.ref] = reason;
    m.stage = "reviewed";
    m.log.push({ at: next.now, by: CURRENT_USER.name, event: `Gave the reason for ${f.cite} (${f.ref})` });
    return { matterId: matter.id, ref: f.ref, cite: f.cite, recorded: reason, stillNeedReason: missingReasons(findings, m).map((x) => x.ref) };
  }),

  send_for_approval: write((next, args) => {
    const { matter, m } = matterArg(next, args);
    if (m.stage === "sent_back") refuse(`${matterTitle(matter)} was sent back. ${nextStep(matter, m)} Nothing was sent.`);
    if (m.stage !== "unreviewed" && m.stage !== "reviewed") refuse(`${matterTitle(matter)} is already with the approvers (stage ${m.stage}). ${nextStep(matter, m)} Nothing was sent.`);
    const findings = findingsFor(next, matter);
    const missing = missingReasons(findings, m);
    if (missing.length)
      refuse(
        `Not sent: ${missing.map((f) => `${f.ref} (${f.cite}, ${f.topic})`).join("; ")} ${missing.length === 1 ? "keeps a clause" : "keep clauses"} below the playbook with no reason for ${personName("rachel")} yet. Ask the person for the reason, record it with set_reason, then send.`,
      );
    const route = routeApprovals(findings, totalContractValue(matter.terms));
    m.route = route.map((s, i): Decision => ({ approverId: s.personId as ApproverId, status: i === 0 ? "pending" : "queued", at: null, comment: "" }));
    m.submittedAt = next.now;
    m.stage = route.length ? "submitted" : "approved";
    const names = route.map((s) => s.name);
    m.log.push({ at: next.now, by: CURRENT_USER.name, event: route.length ? `Sent for approval: ${names.join(" → ")}` : "No approval needed" });
    return {
      matterId: matter.id,
      stage: m.stage,
      submittedAt: m.submittedAt,
      route: route.map((s, i) => ({ name: s.name, title: s.title, ruleId: s.ruleId, reason: s.reason, status: m.route[i].status })),
      message: route.length
        ? `Sent to ${listNames(names)} for approval. ${names[0]} is first. Nothing goes to ${matter.vendorShort} until ${names.length === 1 ? `${names[0]} approves` : `all ${countWord(names.length)} approve`}.`
        : `No approval needed: no deviations and under the CFO line. The redline package can go to ${matter.vendorShort}.`,
    };
  }),

  get_approval_status: read((state, args) => {
    const { matter, m } = matterArg(state, args);
    return {
      matterId: matter.id,
      title: matterTitle(matter),
      stage: m.stage,
      submittedAt: m.submittedAt,
      route: m.route.map(decisionView),
      arrivedSince: arrivedSince(state, matter, m),
      next: nextStep(matter, m),
      log: m.log,
    };
  }),

  check_security_evidence: read((state, args) => {
    const { matter, m } = matterArg(state, args);
    const rule = publishedSec(state);
    const check = checkSecurityEvidence(m.evidence, state.now);
    return {
      matterId: matter.id,
      rule: `${rule.id} v${rule.version}`,
      publishedBy: rule.publishedBy,
      publishedAt: rule.publishedAt,
      asOf: state.now.slice(0, 10),
      evidenceReceivedAt: m.evidence?.receivedAt ?? null,
      passed: check.passed,
      summary: evidenceSummary(check.lines),
      lines: check.lines,
    };
  }),

  resubmit_for_approval: write((next, args) => {
    const { matter, m } = matterArg(next, args);
    const title = matterTitle(matter);
    if (m.stage === "unreviewed" || m.stage === "reviewed") refuse(`${title} has not been sent for approval, so there is nothing to resubmit. Nothing was changed.`);
    if (m.stage !== "sent_back") refuse(`${title} is not sent back (stage ${m.stage}), so there is nothing to resubmit. ${nextStep(matter, m)} Nothing was changed.`);
    const at = m.route.findIndex((d) => d.status === "sent_back");
    if (at < 0) refuse(`${title} is marked sent back but no approver sent it back. Nothing was changed.`);
    const back = m.route[at];
    const who = personName(back.approverId);
    if (classifyComment(back.comment) !== "security_evidence")
      refuse(`Northstar Legal cannot check ${who}'s ask in code, so it will not resubmit it. Nothing was changed.`);
    const rule = publishedSec(next);
    const check = checkSecurityEvidence(m.evidence, next.now);
    if (!check.passed)
      refuse(
        `Not resubmitted: ${matter.vendorShort}'s evidence does not meet ${rule.id} v${rule.version} yet, so ${who}'s ask is not met. Failing: ${check.lines
          .filter((l) => l.status === "fail")
          .map((l) => `${l.check}: ${l.detail}`)
          .join(" ")} Nothing was changed.`,
      );
    m.route[at] = { approverId: back.approverId, status: "pending", at: null, comment: "" };
    m.stage = "resubmitted";
    m.log.push({ at: next.now, by: CURRENT_USER.name, event: `Resubmitted to ${who} with ${matter.vendorShort}'s security evidence (${rule.id} v${rule.version}: passed)` });
    const after = m.route.slice(at + 1).find((d) => d.status === "queued");
    const n = m.route.length;
    return {
      matterId: matter.id,
      stage: m.stage,
      route: m.route.map(decisionView),
      evidence: { rule: `${rule.id} v${rule.version}`, passed: true },
      message: `Resubmitted to ${who} with the evidence. ${after ? `${personName(after.approverId)} is next.` : `${who} is the last approver.`} Nothing goes to ${matter.vendorShort} until ${n === 1 ? `${who} approves` : `all ${countWord(n)} approve`}.`,
    };
  }),
};

/**
 * Runs one tool. A refusal or bad input returns `{ ok: false, error }` with the same state object, so
 * nothing is saved; success returns `ok: true` and, for a write, a new state. Anything else thrown is a
 * bug, and the server answers it without saving.
 */
export function callTool(state: LegalState, name: string, args: Record<string, unknown>): { result: unknown; state: LegalState } {
  const handler = (HANDLERS as Record<string, Handler | undefined>)[name];
  if (!handler || !TOOL_NAMES.includes(name as ToolName)) return { result: { ok: false, error: `Unknown tool "${name}". Northstar Legal's tools: ${TOOL_NAMES.join(", ")}.` }, state };
  try {
    return handler(state, args && typeof args === "object" && !Array.isArray(args) ? args : {});
  } catch (error) {
    if (error instanceof Refusal) return { result: { ok: false, error: error.message }, state };
    throw error;
  }
}
