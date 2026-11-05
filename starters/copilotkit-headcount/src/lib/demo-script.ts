// Concept: a scripted brain for the mock model.
//
// lib/mock-model.ts stands in for the LLM so the whole chat loop runs without an API key. Each time
// BuiltInAgent calls the model, the mock asks nextStep() what to do. nextStep() reads the same prompt
// a real model gets (the system prompt with the app context, then the user, assistant and tool
// messages) and returns the next action: tool calls with exact arguments, or a short reply.
//
// Frontend tools run in the browser, so one user turn takes several model calls: the model asks for
// tools, the run ends, the browser runs them and starts a new run with the results. nextStep() is
// called each time and picks up where the turn left off, from the latest user message and the tool
// calls made since. It follows lib/agent-instructions.ts like the real model should: look facts up
// with tools, show the cards, take every number in a reply from a tool result, apply published
// skills, offer to submit in words, and call submitForApproval (which waits for the user's click) only
// when the user asks to submit. When a tool refuses (startRequest while another request is open,
// updateRequest on a value the user set), it relays the refusal and asks, like the real model should.
//
// It only knows the README's demo script. Anything else gets a short note listing the sentences it
// understands. Pure and deterministic: demo-script.test.ts plays the whole demo against it.

import type { LanguageModelV3Prompt, LanguageModelV3ToolResultOutput } from "@ai-sdk/provider";
import { FISCAL_YEAR, LOCATIONS, QUARTERS, STORY_DATE, nextQuarter, type Level, type Location, type Quarter, type RequestType } from "./headcount";

/** One tool call the model makes. The browser runs it and sends the result back. */
export type ToolCallRequest = { toolName: string; input: Record<string, unknown> };

/** What the model says or does next: a reply (text), tool calls, or text followed by tool calls. */
export type NextStep = { text: string; toolCalls: ToolCallRequest[] };

/** The sentences the mock understands, in demo order (README "Demo script"). */
export const DEMO_SENTENCES = [
  "I need approval to hire a senior engineer in New York next quarter.",
  "Net-new. It unblocks the multi-region failover work planned for Q2. Without it, on-call stays on four people and failover slips to Q4.",
  "Competing offer at $230,000.",
  "Submit it.",
  "I need approval to hire a senior SRE in Austin in Q2.",
] as const;

export function nextStep(prompt: LanguageModelV3Prompt): NextStep {
  const c = readConversation(prompt);
  const text = c.userText;
  if (!text) return reply(offScript());

  const edits = parseEdits(text);
  if (edits.length > 0) return afterHumanEdit(c, edits); // step 3: "I changed base salary from $212,000 to $225,000."
  const revertTo = parseRevert(text);
  if (revertTo !== null) return revertBase(c, revertTo); // the chip after step 3: "Revert to $212,000"
  if (confirmsOverride(c)) return applyOverride(c); // "yes" to "Want me to replace it?"
  if (wantsToSubmit(c)) return submit(c); // step 4: "Submit it."
  const hire = parseHireRequest(text, c.context.nextQuarter);
  if (hire) return hireRequest(c, hire); // steps 1 and 7
  const details = parseDetails(c);
  if (details) return addDetails(c, details); // step 2: "Net-new. It unblocks..."
  const reason = parseAboveMidpointReason(c);
  if (reason) return addAboveMidpointReason(c, reason); // step 3: "Competing offer at $230,000."

  // The suggestion chips (copilot/useSuggestionChips.ts)
  if (PLAN_QUESTION.test(text)) return planQuestion(c);
  const whatIfLocation = /\bcost\b/i.test(text) ? parseLocation(text) : null;
  if (whatIfLocation) return costWhatIf(c, whatIfLocation);
  if (STATUS_QUESTION.test(text)) return reply(requestStatus(c));

  return reply(offScript());
}

// ---------------------------------------------------------------------------------------------
// Reading the prompt: the app context from the system prompt, and the conversation so far

/** The request draft as the app sends it (lib/app-context.ts). Text people typed is under quotedText. */
export type DraftContext = {
  id: string;
  level: Level | null;
  location: Location | null;
  startQuarter: Quarter | null;
  type: RequestType | null;
  baseSalary: number | null;
  editedByUser: string[];
  sentBackBy: string | null;
  quotedText: { roleTitle: string; justification: string; aboveMidpointReason: string; planOffset: string; securityAccess: string; sentBackComment: string | null };
};

type RequestContext = {
  id: string;
  status: string;
  waitingFor: string | null;
  quotedText: { roleTitle: string };
  decisions: { approver: string; decision: string; quotedText: { comment: string } }[];
};

export type AppContext = {
  today: string;
  /** "next quarter", worked out in code (lib/headcount.ts nextQuarter). */
  nextQuarter: Quarter | null;
  team: string;
  draft: DraftContext | null;
  requests: RequestContext[];
  /** The published skills' markdown, or "None yet." */
  skills: string;
};

type Call = { name: string; input: Record<string, unknown>; result: unknown };

export type Conversation = {
  context: AppContext;
  /** The latest user message: what this turn is about. */
  userText: string;
  /** Tool calls made since the latest user message, oldest first, with their results. */
  turnCalls: Call[];
  /** Every tool call in the conversation, oldest first. */
  allCalls: Call[];
  /** The assistant's last reply before the latest user message. */
  lastReply: string;
};

// BuiltInAgent writes each context entry into the system prompt as "<description>:\n<value>\n",
// after a "## Context from the application" heading. These match the descriptions in useAppContext.ts.
const CONTEXT_HEADINGS = {
  user: (line: string) => line.startsWith("The signed-in user"),
  draft: (line: string) => line.startsWith("The request draft in the Business case panel"),
  requests: (line: string) => line.startsWith("Requests submitted in this session"),
  skills: (line: string) => line.startsWith("Published skills"),
  plan: (line: string) => line.includes("headcount plan for"),
};

export function readAppContext(system: string): AppContext {
  const start = system.indexOf("## Context from the application");
  const sections: Partial<Record<keyof typeof CONTEXT_HEADINGS, string[]>> = {};
  let current: keyof typeof CONTEXT_HEADINGS | null = null;
  for (const line of start === -1 ? [] : system.slice(start).split("\n")) {
    const heading = line.endsWith(":")
      ? (Object.keys(CONTEXT_HEADINGS) as (keyof typeof CONTEXT_HEADINGS)[]).find((key) => CONTEXT_HEADINGS[key](line))
      : undefined;
    if (heading) {
      current = heading;
      sections[heading] = [];
    } else if (current) sections[current]?.push(line);
  }
  const value = (key: keyof typeof CONTEXT_HEADINGS) => (sections[key] ?? []).join("\n").trim();
  const user = parseJson(value("user")) as { today?: string; team?: string; nextQuarter?: Quarter | null } | string;
  const draft = parseJson(value("draft"));
  const requests = parseJson(value("requests"));
  return {
    today: (typeof user === "object" && user?.today) || STORY_DATE,
    nextQuarter: typeof user === "object" && user && "nextQuarter" in user ? (user.nextQuarter ?? null) : nextQuarter(STORY_DATE),
    team: (typeof user === "object" && user?.team) || "your team",
    draft: isObject(draft) && typeof draft.id === "string" ? (draft as DraftContext) : null,
    requests: Array.isArray(requests) ? (requests as RequestContext[]) : [],
    skills: value("skills") || "None yet.",
  };
}

export function readConversation(prompt: LanguageModelV3Prompt): Conversation {
  const system: string[] = [];
  const allCalls: Call[] = [];
  const byId = new Map<string, Call>();
  let userText = "";
  let turnStart = 0;
  let latestReply = "";
  let lastReply = "";

  for (const message of prompt) {
    if (message.role === "system") system.push(message.content);
    if (message.role === "user") {
      userText = message.content.map((part) => (part.type === "text" ? part.text : "")).join("").trim();
      turnStart = allCalls.length;
      lastReply = latestReply;
    }
    if (message.role === "assistant") {
      for (const part of message.content) {
        if (part.type === "text" && part.text.trim()) latestReply = part.text;
        if (part.type === "tool-call") {
          const call: Call = { name: part.toolName, input: isObject(part.input) ? part.input : {}, result: undefined };
          allCalls.push(call);
          byId.set(part.toolCallId, call);
        }
      }
    }
    if (message.role === "tool") {
      for (const part of message.content) {
        const call = part.type === "tool-result" ? byId.get(part.toolCallId) : undefined;
        if (call && part.type === "tool-result") call.result = readToolOutput(part.output);
      }
    }
  }

  return { context: readAppContext(system.join("\n")), userText, turnCalls: allCalls.slice(turnStart), allCalls, lastReply };
}

/** Frontend tool results arrive as text: the handler's return value as JSON, or "" for a card. */
function readToolOutput(output: LanguageModelV3ToolResultOutput): unknown {
  switch (output.type) {
    case "text":
      return parseJson(output.value);
    case "json":
      return output.value;
    case "error-text":
    case "error-json":
      return { error: output.value };
    case "execution-denied":
      return { error: output.reason ?? "The tool call was denied." };
    case "content":
      return parseJson(output.value.map((part) => (part.type === "text" ? part.text : "")).join(""));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

// ---------------------------------------------------------------------------------------------
// Reading the user's words

export type HireAsk = { level: Level | null; location: Location | null; startQuarter: Quarter | null; role: string };

/** "I need approval to hire a senior engineer in New York next quarter." */
export function parseHireRequest(text: string, next: Quarter | null = nextQuarter(STORY_DATE)): HireAsk | null {
  if (!/\bhire\b|\bhiring\b/i.test(text)) return null;
  return { level: parseLevel(text), location: parseLocation(text), startQuarter: parseQuarter(text, next), role: parseRole(text) };
}

/** The agent instructions: "senior engineer" is L5, "staff" is L6, "principal" is L7. */
export function parseLevel(text: string): Level | null {
  const explicit = /\bL([3-7])\b/i.exec(text);
  if (explicit) return `L${explicit[1]}` as Level;
  if (/\bprincipal\b/i.test(text)) return "L7";
  if (/\bstaff\b/i.test(text)) return "L6";
  if (/\bsenior\b|\bsr\.?\s/i.test(text)) return "L5";
  return null;
}

const LOCATION_ALIASES: [RegExp, Location][] = [
  [/\bNYC\b|\bNY\b/, "New York"],
  [/\bSF\b|\bBay Area\b/i, "San Francisco"],
  [/\bremote\b/i, "Remote (US)"],
];

export function parseLocation(text: string): Location | null {
  const named = LOCATIONS.find((location) => text.toLowerCase().includes(location.toLowerCase()));
  return named ?? LOCATION_ALIASES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** "Q2" is Q2. "next quarter" is nextQuarter from the app context: the code works it out, not the model. */
export function parseQuarter(text: string, next: Quarter | null = nextQuarter(STORY_DATE)): Quarter | null {
  const explicit = /\bQ([1-4])\b/i.exec(text);
  if (explicit && QUARTERS.includes(`Q${explicit[1]}` as Quarter)) return `Q${explicit[1]}` as Quarter;
  return /\bnext quarter\b/i.test(text) ? next : null;
}

const ROLES: [RegExp, string][] = [
  [/\bSREs?\b|site reliability/i, "Site Reliability Engineer"],
  [/\bplatform engineer/i, "Platform Engineer"],
  [/\binfrastructure engineer/i, "Infrastructure Engineer"],
  [/\b(machine learning|ML) engineer/i, "Machine Learning Engineer"],
];

function parseRole(text: string): string {
  return ROLES.find(([pattern]) => pattern.test(text))?.[1] ?? "Software Engineer";
}

// The edit messages copilot/useTellCopilot.ts sends: "I changed <label> from A to B.", "I set <label>
// to B.", 'I updated <label>: "..."'. Edits queued while the agent was busy arrive together in one
// message, one sentence each. The labels mirror LABELS in copilot/edit-queue.ts.
const EDITED_FIELDS = {
  "base salary": "baseSalary",
  "the level": "level",
  "the start quarter": "startQuarter",
  "the location": "location",
  "the request type": "type",
  "the role title": "roleTitle",
  "the justification": "justification",
  "the reason for going above the midpoint": "aboveMidpointReason",
  "the offset for going outside the plan": "planOffset",
  'the "Security and access" section': "securityAccess",
} as const;

type EditedField = (typeof EDITED_FIELDS)[keyof typeof EDITED_FIELDS];

const escapeRegExp = (text: string) => text.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
const EDIT_LABELS = Object.keys(EDITED_FIELDS).map(escapeRegExp).join("|");
const EDIT_PATTERN = new RegExp(`(?:^|\\s)I (?:changed|set|updated) (${EDIT_LABELS})(?: from | to |: )`, "g");

/** The fields a human-edit message reports, in order. Empty when the message is not one. */
export function parseEdits(text: string): EditedField[] {
  if (!/^I (?:changed|set|updated) /.test(text)) return [];
  const fields = [...text.matchAll(EDIT_PATTERN)].map((match) => EDITED_FIELDS[match[1] as keyof typeof EDITED_FIELDS]);
  return [...new Set(fields)];
}

const SAYS_YES = /^(yes|yep|yeah|sure|ok(ay)?|go ahead|do it|please do)\b/i;

/** "Yes" to "Want me to replace it?", after updateRequest refused to overwrite a value the user set. */
function confirmsOverride(c: Conversation): boolean {
  return SAYS_YES.test(c.userText) && /Want me to replace (it|them)/.test(c.lastReply);
}

function wantsToSubmit(c: Conversation): boolean {
  if (/\bsubmit\b/i.test(c.userText)) return !/\b(don'?t|do not|not)\s+submit\b/i.test(c.userText);
  // "Yes" to "Want me to submit it?"
  return SAYS_YES.test(c.userText) && /submit it\?/i.test(c.lastReply);
}

const sentencesOf = (text: string) => (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);

type Details = { type?: RequestType; justification?: string };

/** "Net-new. It unblocks the multi-region failover work planned for Q2. Without it, ..." */
function parseDetails(c: Conversation): Details | null {
  const text = c.userText;
  const type: RequestType | undefined = /\bnet[- ]?new\b/i.test(text) ? "net_new" : /\bbackfill\b/i.test(text) ? "backfill" : undefined;
  const sentences = sentencesOf(text);
  const answersOurQuestion = /net-new or a backfill|what does the role unblock/i.test(c.lastReply) && sentences.length >= 2;
  if (!type && !answersOurQuestion) return null;
  // The justification is the user's own words, minus a short sentence that only names the type.
  const isTypeOnly = (s: string) => s.split(/\s+/).length <= 4 && /net[- ]?new|backfill/i.test(s);
  const justification = sentences.filter((s) => !isTypeOnly(s)).join(" ");
  return { type, justification: justification || undefined };
}

const REASON_WORDS = /competing offer|counter-?offer|scarce skill|internal parity|\bparity\b|\bretention\b/i;

/** "Competing offer at $230,000." becomes the one-line reason (POL-COMP-01). */
function parseAboveMidpointReason(c: Conversation): string | null {
  const text = c.userText.trim();
  const answersOurQuestion = /reason for going above the midpoint/i.test(c.lastReply) && sentencesOf(text).length <= 2;
  return REASON_WORDS.test(text) || answersOurQuestion ? text.replace(/\.$/, "") : null;
}

const PLAN_QUESTION = /how much (headcount|budget)|headcount and budget|\bleft this year\b|(reqs?|budget|headcount) .*\bleft\b/i;
const STATUS_QUESTION = /where is my request|status of my request|approval status|approval chain/i;

// ---------------------------------------------------------------------------------------------
// The tool results, as the handlers in copilot/ return them

type BandResult = { level: Level; title: string; location: Location; tier: string; min: number; mid: number; max: number; teamHasOffice: boolean };
type PlanResult = {
  team: string;
  fiscalYear: string;
  quarters: { quarter: Quarter; approvedNetNew: number; opened: number; remaining: number }[];
  openReqs: { id: string; role: string; level: string; location: string; quarter: string }[];
  budget: { budget: number; committed: number; remaining: number };
};
type CostResult = {
  inputs: { level: Level; baseSalary: number; startQuarter: Quarter };
  cost: { fullyLoadedAnnual: number; fiscalYearImpact: number };
  budget: { remaining: number; leftAfter: number; fits: boolean };
  cfoThreshold: number;
  aboveCfoThreshold: boolean;
};
type PolicyCheckResult = {
  requestId: string;
  readyToSubmit: boolean;
  results: { ruleId: string; status: string; detail: string }[];
  approvers: { name: string; title: string; reason: string }[];
  blockers: string[];
};
type UpdateResult = { ok: true; requestId: string; changed: string[]; refused: { field: string; userValue: unknown; proposed: unknown }[]; draft: { roleTitle: string } };
type StartResult = { started: true; requestId: string; changed: string[]; draft: { roleTitle: string } } | { started: false; openRequestId: string; reason: string };
type SubmitResult = { submitted: true; requestId: string; approvers: string[] } | { submitted: false; reason: string };

/** The last call to a tool in this turn, if it was made. */
const madeThisTurn = (c: Conversation, name: string) => c.turnCalls.findLast((call) => call.name === name);
/** The last result of a tool anywhere in the conversation that passes `match`. */
const latestResult = <T>(c: Conversation, name: string, match: (result: T) => boolean = () => true) =>
  c.allCalls.findLast((call) => call.name === name && isObject(call.result) && !("error" in call.result) && match(call.result as T))?.result as
    | T
    | undefined;

/** The result of a call made this turn, or the error to report if it failed. */
function resultOf<T>(c: Conversation, name: string): { ok: T } | { error: string } {
  const result = madeThisTurn(c, name)?.result;
  if (isObject(result) && "error" in result) return { error: `${name}: ${String(result.error)}` };
  if (!isObject(result)) return { error: `${name} returned nothing.` };
  return { ok: result as T };
}

// ---------------------------------------------------------------------------------------------
// The demo steps. Each one is a short sequence; the tool calls already made this turn say which
// stage comes next. Independent calls go out together, like a model's parallel tool calls.

const call = (toolName: string, input: Record<string, unknown> = {}): ToolCallRequest => ({ toolName, input });
const calls = (...toolCalls: ToolCallRequest[]): NextStep => ({ text: "", toolCalls });
const reply = (text: string): NextStep => ({ text, toolCalls: [] });
const failed = (error: string) => reply(`Something went wrong, so I stopped: ${error}`);

/** Steps 1 and 7: read the plan and the band, start the request, show the cost and the policy check, ask for the rest. */
function hireRequest(c: Conversation, ask: HireAsk): NextStep {
  const { level, location, startQuarter } = ask;
  if (!level || !location || !startQuarter) {
    const missing = [!level && "the level (senior, staff or principal)", !location && "the location", !startQuarter && "the start quarter"].filter(Boolean);
    return reply(`To start the business case I need ${joinAnd(missing as string[])}.`);
  }

  if (!madeThisTurn(c, "getCompBand")) return calls(call("getHeadcountPlan"), call("getCompBand", { level, location }));
  const band = resultOf<BandResult>(c, "getCompBand");
  if ("error" in band) return failed(band.error);
  const { mid, title } = band.ok;

  const skill = securityAccessSkill(c.context.skills);
  if (!madeThisTurn(c, "startRequest")) {
    return calls(
      call("startRequest", {
        roleTitle: title.replace("Software Engineer", ask.role),
        level,
        location,
        startQuarter,
        baseSalary: mid, // the band midpoint, as the instructions say
        ...(skill ? { securityAccess: draftSecurityAccess(skill) } : {}), // only when a person published the skill
      }),
      call("calculateCost", { level, baseSalary: mid, startQuarter }),
    );
  }
  const start = resultOf<StartResult>(c, "startRequest");
  if ("error" in start) return failed(start.error);
  // Another request is open: startRequest changed nothing. Say so and ask; never repurpose it.
  if (!start.ok.started) return reply(openRequestBlocks(c, start.ok.openRequestId));
  const requestId = start.ok.requestId;

  if (!madeThisTurn(c, "showCostBreakdown")) {
    return calls(call("showCostBreakdown", { level, location, baseSalary: mid, startQuarter }), call("checkPolicy"));
  }
  if (!madeThisTurn(c, "showPolicyCheck")) return calls(call("showPolicyCheck", { requestId }));

  const cost = resultOf<CostResult>(c, "calculateCost");
  const plan = resultOf<PlanResult>(c, "getHeadcountPlan");
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in cost) return failed(cost.error);
  if ("error" in plan) return failed(plan.error);
  if ("error" in check) return failed(check.error);

  const fy = plan.ok.fiscalYear;
  const lines = [
    `I started ${requestId} in the Business case: ${start.ok.draft.roleTitle}, ${level}, ${location}, ${startQuarter} ${fy}.`,
    [
      `The base is the ${usd(mid)} midpoint of the ${level} ${tierLabel(band.ok.tier)} band (POL-COMP-01), and ${planFit(plan.ok, startQuarter)}.`,
      `Fully loaded that is ${usd(cost.ok.cost.fullyLoadedAnnual)} a year; the ${usd(cost.ok.cost.fiscalYearImpact)} ${fy} impact ${
        cost.ok.budget.fits ? "fits" : "is more than"
      } the ${usd(cost.ok.budget.remaining)} left in the budget (POL-FIN-01).`,
    ].join(" "),
  ];
  if (skill) lines.push(`I also drafted the Security and access section, because a published skill asks for it on ${c.context.team} requests. Please check it.`);
  // POL-HC-01 and POL-HC-02 wait for the request type and the justification: the question below.
  const others = check.ok.blockers.filter((b) => !b.startsWith("POL-HC-01") && !b.startsWith("POL-HC-02"));
  if (others.length > 0) lines.push(`Also to fix: ${others.join(" ")}`);
  lines.push(
    "To finish it I need two things (POL-HC-01): is this net-new or a backfill, and in two sentences, what does the role unblock and what happens if it isn't filled?",
  );
  return reply(lines.join("\n\n"));
}

/** Step 2: write the request type and the justification, re-check, offer to submit. */
function addDetails(c: Conversation, details: Details): NextStep {
  if (!madeThisTurn(c, "updateRequest")) {
    if (!c.context.draft) return reply(NO_REQUEST_OPEN);
    return calls(call("updateRequest", { ...(details.type && { type: details.type }), ...(details.justification && { justification: details.justification }) }));
  }
  const update = resultOf<UpdateResult>(c, "updateRequest");
  if ("error" in update) return failed(update.error);
  if (update.ok.refused.length > 0 && update.ok.changed.length === 0) return reply(askBeforeReplacing(update.ok));
  if (!madeThisTurn(c, "checkPolicy")) return calls(call("checkPolicy"));
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in check) return failed(check.error);
  if (!madeThisTurn(c, "showPolicyCheck")) return calls(call("showPolicyCheck", { requestId: check.ok.requestId }));

  const lines = [`Thanks, I added that to ${check.ok.requestId}.`];
  if (update.ok.refused.length > 0) lines.push(askBeforeReplacing(update.ok));
  const draft = c.context.draft;
  if (check.ok.readyToSubmit) {
    const plan = latestResult<PlanResult>(c, "getHeadcountPlan");
    const rule = (id: string) => check.ok.results.find((r) => r.ruleId === id);
    if (rule("POL-HC-03")) lines.push("As a backfill it skips the plan check (POL-HC-03).");
    else if (plan && draft?.startQuarter && rule("POL-HC-02")?.status === "pass") lines.push(`Plan fit passes: ${planFit(plan, draft.startQuarter)}.`);
    const cost = draft ? costOfDraft(c, draft) : undefined;
    const noCfo = cost && !cost.aboveCfoThreshold && !hasCfo(check.ok) ? ` No CFO step: ${usd(cost.cost.fullyLoadedAnnual)} fully loaded is under ${usd(cost.cfoThreshold)} (POL-APR-02).` : "";
    lines.push(`It is ready to submit and goes to ${chain(check.ok)} (POL-APR-01).${noCfo} Want me to submit it?`);
  } else {
    lines.push(stillToFix(check.ok));
  }
  return reply(lines.join(" "));
}

const COST_FIELDS = ["baseSalary", "level", "startQuarter"] as const;
type CostField = (typeof COST_FIELDS)[number];

/**
 * Step 3: the human edited the draft (one field or several). Re-check without being asked, show the
 * re-check card (what moved, from the code: lib/headcount.ts via useGenerativeUI.tsx showRecheck) and
 * say it in at most two short sentences, then ask for what a rule now needs.
 */
function afterHumanEdit(c: Conversation, edits: EditedField[]): NextStep {
  if (!c.context.draft) return reply("That request is no longer open in the Business case, so there is nothing to re-check.");
  const costField = edits.find((field): field is CostField => (COST_FIELDS as readonly string[]).includes(field));
  const costChanged = costField !== undefined;
  if (!madeThisTurn(c, "checkPolicy")) return calls(...(costChanged ? [call("calculateCost")] : []), call("checkPolicy"));
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in check) return failed(check.error);
  // calculateCost fails when the edit cleared an input (say, the base salary). Then there is no cost to show.
  const costResult = costChanged ? resultOf<CostResult>(c, "calculateCost") : null;
  const cost = costResult && "ok" in costResult ? costResult : null;

  if (!madeThisTurn(c, "showRecheck")) {
    return calls(call("showRecheck", { requestId: check.ok.requestId, before: previousValues(c.userText) }));
  }

  const parts: string[] = [];
  if (cost) {
    const { inputs, cost: numbers } = cost.ok;
    const now = {
      baseSalary: `Base salary is now ${usd(inputs.baseSalary)}`,
      level: `The level is now ${inputs.level}`,
      startQuarter: `The start is now ${inputs.startQuarter} ${FISCAL_YEAR}`,
    }[costField!];
    parts.push(`${now}: ${usd(numbers.fullyLoadedAnnual)} a year.`);
  } else {
    parts.push(`I re-checked ${check.ok.requestId}.`);
  }
  parts.push(...chainChange(c, check.ok));

  const comp = check.ok.results.find((r) => r.ruleId === "POL-COMP-01");
  const needsReason = comp?.status === "fail" && /midpoint/.test(comp.detail);
  if (needsReason) parts.push("What's the reason for going above the midpoint (POL-COMP-01)?");
  else if (check.ok.readyToSubmit) parts.push(`${check.ok.requestId} is ready to submit. Want me to submit it?`);
  else parts.push(stillToFix(check.ok));
  return reply(parts.join(" "));
}

/** Who joined or left the chain, against the last policy check before this turn (POL-APR-02). */
function chainChange(c: Conversation, check: PolicyCheckResult): string[] {
  const before = c.allCalls.slice(0, c.allCalls.length - c.turnCalls.length).findLast((x) => x.name === "checkPolicy" && isObject(x.result) && Array.isArray(x.result.approvers))
    ?.result as PolicyCheckResult | undefined;
  const cfo = check.approvers.find(isCfo);
  const cfoBefore = before?.approvers.find(isCfo);
  if (cfo && !cfoBefore) return [`${cfo.name} (CFO) now joins (POL-APR-02).`];
  if (cfoBefore && !cfo) return [`${cfoBefore.name} (CFO) is no longer in the chain (POL-APR-02).`];
  return [];
}

const QUARTER_OF = /^(Q[1-4])\b/;
const TYPE_OF: Record<string, RequestType> = { "Net-new": "net_new", Backfill: "backfill" };

/**
 * The values the edit replaced, read from the edit message ("I changed base salary from $212,000 to
 * $225,000."), so the re-check card can set before beside after. Only fields the card compares.
 */
export function previousValues(text: string): Record<string, string | number> {
  const before: Record<string, string | number> = {};
  for (const [, label, value] of text.matchAll(/I changed (base salary|the level|the location|the start quarter|the request type) from (.+?) to /g)) {
    if (label === "base salary") {
      const amount = Number(value.replace(/[$,]/g, ""));
      if (Number.isFinite(amount) && amount > 0) before.baseSalary = amount;
    } else if (label === "the level" && /^L[3-7]$/.test(value)) before.level = value;
    else if (label === "the location" && (LOCATIONS as readonly string[]).includes(value)) before.location = value;
    else if (label === "the start quarter" && QUARTER_OF.test(value)) before.startQuarter = QUARTER_OF.exec(value)![1];
    else if (label === "the request type" && TYPE_OF[value]) before.type = TYPE_OF[value];
  }
  return before;
}

/** Chip: "Revert to $212,000". The user asked, so updateRequest may replace the base they set. */
function revertBase(c: Conversation, amount: number): NextStep {
  if (!c.context.draft) return reply(NO_REQUEST_OPEN);
  if (!madeThisTurn(c, "updateRequest")) return calls(call("updateRequest", { baseSalary: amount, userAsked: true }));
  const update = resultOf<UpdateResult>(c, "updateRequest");
  if ("error" in update) return failed(update.error);
  if (!madeThisTurn(c, "checkPolicy")) return calls(call("calculateCost"), call("checkPolicy"));
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  const cost = resultOf<CostResult>(c, "calculateCost");
  if ("error" in check) return failed(check.error);
  if ("error" in cost) return failed(cost.error);
  if (!madeThisTurn(c, "showRecheck")) {
    // The base it replaced: the last cost worked out before this turn
    const previous = c.allCalls.slice(0, c.allCalls.length - c.turnCalls.length).findLast((x) => x.name === "calculateCost" && isObject(x.result) && isObject(x.result.inputs))
      ?.result as CostResult | undefined;
    const before = previous && previous.inputs.baseSalary !== amount ? { baseSalary: previous.inputs.baseSalary } : {};
    return calls(call("showRecheck", { requestId: check.ok.requestId, before }));
  }
  const parts = [`Base salary is back to ${usd(amount)}: ${usd(cost.ok.cost.fullyLoadedAnnual)} a year.`, ...chainChange(c, check.ok)];
  parts.push(check.ok.readyToSubmit ? `${check.ok.requestId} is ready to submit. Want me to submit it?` : stillToFix(check.ok));
  return reply(parts.join(" "));
}

/** "Revert to $212,000" (the chip) or "revert the base to $212,000". */
function parseRevert(text: string): number | null {
  const match = /^revert\b[^$]*\$([\d,]+)/i.exec(text.trim());
  const amount = match ? Number(match[1].replace(/,/g, "")) : NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** Step 3, the answer: "Competing offer at $230,000." */
function addAboveMidpointReason(c: Conversation, reason: string): NextStep {
  if (!madeThisTurn(c, "updateRequest")) {
    if (!c.context.draft) return reply(NO_REQUEST_OPEN);
    return calls(call("updateRequest", { aboveMidpointReason: reason }));
  }
  const update = resultOf<UpdateResult>(c, "updateRequest");
  if ("error" in update) return failed(update.error);
  if (update.ok.refused.length > 0) return reply(askBeforeReplacing(update.ok));
  if (!madeThisTurn(c, "checkPolicy")) return calls(call("checkPolicy"));
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in check) return failed(check.error);
  if (!madeThisTurn(c, "showPolicyCheck")) return calls(call("showPolicyCheck", { requestId: check.ok.requestId }));
  const next = check.ok.readyToSubmit
    ? `It is ready to submit and goes to ${chain(check.ok)}. Want me to submit it?`
    : stillToFix(check.ok);
  return reply(`I added the reason to ${check.ok.requestId} (POL-COMP-01). ${next}`);
}

/** Step 4: only the person's click submits. The model's part is to ask, with submitForApproval. */
function submit(c: Conversation): NextStep {
  if (madeThisTurn(c, "submitForApproval")) {
    // The card's answer: { submitted: true, requestId, approvers } only if the person clicked Submit
    const outcome = madeThisTurn(c, "submitForApproval")?.result as SubmitResult | undefined;
    if (outcome?.submitted === true) {
      return reply(`Submitted ${outcome.requestId}. It goes to ${outcome.approvers.join(", then ")}. You can follow it in the Approvals inbox.`);
    }
    const reason = outcome?.submitted === false ? outcome.reason : "the approval card did not answer.";
    const id = c.context.draft?.id;
    return reply(
      /keep editing/i.test(reason)
        ? `OK, nothing was submitted.${id ? ` ${id} is still open in the Business case.` : ""}`
        : `Nothing was submitted: ${reason}`,
    );
  }
  if (!madeThisTurn(c, "checkPolicy")) {
    if (!c.context.draft) return reply("There is no draft open to submit. Tell me who you need to hire and I will start one.");
    return calls(call("checkPolicy"));
  }
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in check) return failed(check.error);
  if (!check.ok.readyToSubmit) return reply(`${check.ok.requestId} is not ready yet. ${stillToFix(check.ok)}`);
  return {
    text: "Here is the summary. Nothing is sent until you click Submit for approval.",
    toolCalls: [call("submitForApproval", { requestId: check.ok.requestId })],
  };
}

/** Chip: "How much headcount and budget does Platform have left this year?" */
function planQuestion(c: Conversation): NextStep {
  if (!madeThisTurn(c, "getHeadcountPlan")) return calls(call("getHeadcountPlan"));
  const plan = resultOf<PlanResult>(c, "getHeadcountPlan");
  if ("error" in plan) return failed(plan.error);
  const { team, fiscalYear, quarters, openReqs, budget } = plan.ok;
  const lines = [
    `${team} has these approved net-new reqs left in ${fiscalYear} (POL-HC-02): ${quarters.map((q) => `${q.quarter} ${q.remaining}`).join(", ")}.`,
    `The personnel budget has ${usd(budget.remaining)} left: ${usd(budget.budget)}, with ${usd(budget.committed)} committed (POL-FIN-01).`,
  ];
  if (openReqs.length > 0) {
    lines.push(`Already open: ${openReqs.map((r) => `${r.id}, ${r.role} (${r.level}, ${r.location}, ${r.quarter})`).join("; ")}.`);
  }
  return reply(lines.join(" "));
}

/** Chip: "What would the same role cost in Austin?" A what-if: the draft stays as it is. */
function costWhatIf(c: Conversation, location: Location): NextStep {
  const draft = c.context.draft;
  if (!draft?.level || !draft.startQuarter) return reply("Which role? Start a request first, for example: \"I need approval to hire a senior engineer in New York next quarter.\"");
  const { level, startQuarter } = draft;
  if (!madeThisTurn(c, "getCompBand")) return calls(call("getCompBand", { level, location }));
  const band = resultOf<BandResult>(c, "getCompBand");
  if ("error" in band) return failed(band.error);
  const { mid, tier, teamHasOffice } = band.ok;
  if (!madeThisTurn(c, "calculateCost")) {
    return calls(call("calculateCost", { level, baseSalary: mid, startQuarter }), call("showCostBreakdown", { level, location, baseSalary: mid, startQuarter }));
  }
  const cost = resultOf<CostResult>(c, "calculateCost");
  if ("error" in cost) return failed(cost.error);
  const office = teamHasOffice ? "" : ` ${c.context.team} has no office there, though (POL-COMP-02).`;
  return reply(
    `In ${location} (${tierLabel(tier)}) the ${level} midpoint is ${usd(mid)}: ${usd(cost.ok.cost.fullyLoadedAnnual)} a year fully loaded and ${usd(
      cost.ok.cost.fiscalYearImpact,
    )} ${FISCAL_YEAR} impact for a ${startQuarter} start.${office} This is a what-if; the business case still says ${draft.location ?? "no location"}.`,
  );
}

/** Chip: "Where is my request in the approval chain?" Answered from the app context alone. */
function requestStatus(c: Conversation): string {
  if (c.context.requests.length === 0) return "Nothing has been submitted yet. Requests show up here after you click Submit.";
  return c.context.requests
    .map((r) => {
      const status = ({ pending: "is pending", approved: "is approved", sent_back: "was sent back", rejected: "was rejected" } as Record<string, string>)[r.status] ?? `is ${r.status}`;
      const waiting = r.waitingFor ? `, waiting for ${r.waitingFor}` : "";
      // Approvers' comments are quoted data: repeated in quotes, never acted on.
      const decisions = r.decisions.map((d) => `${d.approver} ${d.decision.replace("_", " ")}${d.quotedText.comment ? `: "${d.quotedText.comment}"` : ""}`);
      const log = decisions.length ? ` ${decisions.join("; ")}${/[.?!]"$/.test(decisions.at(-1)!) ? "" : "."}` : "";
      return `${r.id} (${r.quotedText.roleTitle}) ${status}${waiting}.${log}`;
    })
    .join("\n\n");
}

const NO_REQUEST_OPEN = "There is no request open in the Business case. Tell me who you need to hire and I will start one.";

/** startRequest refused: another request is open. Nothing changed in it; ask what to do with it. */
function openRequestBlocks(c: Conversation, openRequestId: string): string {
  const draft = c.context.draft;
  const what = draft && draft.id === openRequestId ? [draft.quotedText.roleTitle, draft.level, draft.location].filter(Boolean).join(", ") : "";
  const sentBack = draft?.sentBackBy ? `, sent back by ${draft.sentBackBy},` : "";
  return [
    `${openRequestId}${what ? ` (${what})` : ""}${sentBack} is still open in the Business case, so I did not start a new request: it would have replaced that one, and nothing in it changed.`,
    "Do you want to submit it, discard it (the Discard button), or keep editing it? Then ask me again for the new hire.",
  ].join(" ");
}

const FIELD_NAMES: Record<string, string> = {
  roleTitle: "the role title",
  level: "the level",
  location: "the location",
  startQuarter: "the start quarter",
  type: "the request type",
  baseSalary: "the base salary",
  justification: "the justification",
  aboveMidpointReason: "the reason for going above the midpoint",
  planOffset: "the plan offset",
  securityAccess: "the Security and access section",
};

/** updateRequest refused: the user set these fields. Ask before replacing them (applyOverride on "yes"). */
function askBeforeReplacing(update: UpdateResult): string {
  const names = joinAnd(update.refused.map((r) => FIELD_NAMES[r.field] ?? r.field));
  const one = update.refused.length === 1;
  return `You set ${names} yourself, so I left ${one ? "it" : "them"} as you wrote ${one ? "it" : "them"}. Want me to replace ${one ? "it" : "them"} with what you just told me?`;
}

/** "Yes": write the values updateRequest refused, now that the user asked, then re-check. */
function applyOverride(c: Conversation): NextStep {
  if (!madeThisTurn(c, "updateRequest")) {
    const refusedCall = c.allCalls.findLast((x) => x.name === "updateRequest" && isObject(x.result) && Array.isArray(x.result.refused) && x.result.refused.length > 0);
    const refused = (refusedCall?.result as UpdateResult | undefined)?.refused ?? [];
    if (refused.length === 0) return reply("There is nothing waiting to be replaced.");
    return calls(call("updateRequest", { ...Object.fromEntries(refused.map((r) => [r.field, r.proposed])), userAsked: true }));
  }
  const update = resultOf<UpdateResult>(c, "updateRequest");
  if ("error" in update) return failed(update.error);
  if (!madeThisTurn(c, "checkPolicy")) return calls(call("checkPolicy"));
  const check = resultOf<PolicyCheckResult>(c, "checkPolicy");
  if ("error" in check) return failed(check.error);
  if (!madeThisTurn(c, "showPolicyCheck")) return calls(call("showPolicyCheck", { requestId: check.ok.requestId }));
  const next = check.ok.readyToSubmit ? "It is ready to submit. Want me to submit it?" : stillToFix(check.ok);
  return reply(`Done, I replaced ${joinAnd(update.ok.changed.map((f) => FIELD_NAMES[f] ?? f))} in ${check.ok.requestId}. ${next}`);
}

function offScript(): string {
  return [
    "I'm the scripted mock model, so I only know the workshop demo. (It runs when COPILOT_MODEL=mock or OPENAI_API_KEY is not set.) Try these, in order:",
    `1. "${DEMO_SENTENCES[0]}"`,
    `2. "${DEMO_SENTENCES[1]}"`,
    `3. Change Base salary to 225000 in the Business case, then: "${DEMO_SENTENCES[2]}"`,
    `4. "${DEMO_SENTENCES[3]}"`,
    `5. After the approvals, publish the skill in Insights, then: "${DEMO_SENTENCES[4]}"`,
    "To ask anything else, set OPENAI_API_KEY in .env.local and restart.",
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Published skills (lib/learning.ts writes them; useAppContext.ts sends them)

/** The published skill that asks for a "Security and access" section, if a person published one. */
function securityAccessSkill(skills: string): string | null {
  return skills.split(/\n-{3,}\n/).find((skill) => /Security and access/i.test(skill)) ?? null;
}

/** A first draft of the section, built from what the skill asks for. The user checks it. */
function draftSecurityAccess(skill: string): string {
  const systems = /for example ([^)]+)\)/i.exec(skill)?.[1];
  const reviewer = /who reviews the access[^(]*\(([^)]+)\)/i.exec(skill)?.[1];
  return [
    `Systems: ${systems ? systems.replace(/, ([^,]+)$/, " and $1") : "production systems"}.`,
    "Access level: read-only from the start date, deploy rights after onboarding, no standing admin rights.",
    `Review: ${reviewer ? reviewer.replace(/, /, " (") + ")" : "the security team"}, every quarter.`,
  ].join(" ");
}

// ---------------------------------------------------------------------------------------------
// Wording. Every number comes from a tool result; nothing here does arithmetic.

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd = (amount: number) => currency.format(amount);
const tierLabel = (tier: string) => tier.replace("tier", "Tier ");
const isCfo = (approver: { reason: string }) => approver.reason.startsWith("CFO");
const hasCfo = (check: PolicyCheckResult) => check.approvers.some(isCfo);
const chain = (check: PolicyCheckResult) => check.approvers.map((a) => (isCfo(a) ? `${a.name} (CFO)` : a.name)).join(", then ");
const stillToFix = (check: PolicyCheckResult) => `Still to fix before it can be submitted: ${check.blockers.join(" ")}`;

function joinAnd(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function planFit(plan: PlanResult, quarter: Quarter): string {
  const row = plan.quarters.find((q) => q.quarter === quarter);
  if (!row) return `the plan has no row for ${quarter}`;
  if (row.remaining < 1) return `${quarter} has no approved net-new reqs left (POL-HC-02), so a net-new hire needs the CFO and an offset`;
  return `${quarter} still has ${row.remaining} approved net-new req${row.remaining === 1 ? "" : "s"} (POL-HC-02)`;
}

/** The latest calculateCost result for exactly the draft's inputs, so a what-if never leaks in. */
function costOfDraft(c: Conversation, draft: DraftContext): CostResult | undefined {
  return latestResult<CostResult>(
    c,
    "calculateCost",
    (r) => r.inputs.level === draft.level && r.inputs.baseSalary === draft.baseSalary && r.inputs.startQuarter === draft.startQuarter,
  );
}
