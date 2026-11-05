// Concept: business logic as pure functions.
//
// Every number the copilot shows comes from this file: comp bands, the cost model, plan fit,
// budget fit, the approver chain and the policy check. Frontend tools, generative UI cards and the
// Business case panel all call these functions, so the model never does arithmetic.
// headcount.test.ts pins the worked example from ../shared-data/README.md.

import bandsData from "@/data/comp-bands.json";
import company from "@/data/company.json";
import planData from "@/data/headcount-plan.json";

export const LEVELS = ["L3", "L4", "L5", "L6", "L7"] as const;
export const LOCATIONS = ["New York", "San Francisco", "Seattle", "Boston", "Austin", "Remote (US)"] as const;
export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export const REQUEST_TYPES = ["net_new", "backfill"] as const;

export type Level = (typeof LEVELS)[number];
export type Location = (typeof LOCATIONS)[number];
export type Quarter = (typeof QUARTERS)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type Team = (typeof planData.teams)[number];
export type Person = (typeof company.people)[number];
type Tier = keyof typeof bandsData.bands;

/** The workshop date. Pinned so the lead-time rule gives the same answer whenever the demo runs. */
export const STORY_DATE = "2026-11-05";
export const FISCAL_YEAR = company.fiscalYear.label;
export const TEAM_IDS: readonly string[] = planData.teams.map((t) => t.id);
export const PERSON_IDS: readonly string[] = company.people.map((p) => p.id);

/** Now on the story clock: STORY_DATE with the real time of day, so every date the app stamps agrees with "today". */
export function storyNow(now: Date = new Date()): string {
  return `${STORY_DATE}T${now.toISOString().slice(11)}`;
}
/** POL-APR-02: the CFO joins above this fully loaded annual cost. */
export const CFO_THRESHOLD = company.approvalThresholds.cfoAboveFullyLoadedAnnual;

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function getTeam(id: string): Team {
  const team = planData.teams.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown team "${id}"`);
  return team;
}

export function getPerson(id: string): Person {
  const person = company.people.find((p) => p.id === id);
  if (!person) throw new Error(`Unknown person "${id}"`);
  return person;
}

function personWithRole(role: string): Person {
  const person = company.people.find((p) => p.role === role);
  if (!person) throw new Error(`Nobody has role "${role}"`);
  return person;
}

/** The person signed in for the demo, and her team. */
export const CURRENT_USER = getPerson("dana");
export const CURRENT_TEAM = getTeam(CURRENT_USER.team);

// ---------------------------------------------------------------------------------------------
// The request (the business case both the human and the agent edit)

export type HeadcountRequest = {
  id: string;
  teamId: string;
  roleTitle: string;
  level: Level | null;
  location: Location | null;
  startQuarter: Quarter | null;
  type: RequestType | null;
  baseSalary: number | null;
  justification: string;
  /** POL-COMP-01: required when the base is above the band midpoint. */
  aboveMidpointReason: string;
  /** POL-HC-02: a net-new request outside the plan names an offsetting reduction or new budget. */
  planOffset: string;
  /** Not in the written policy. A published skill asks for it (SkillCheck below). */
  securityAccess: string;
};

export function emptyRequest(id: string, teamId: string = CURRENT_TEAM.id): HeadcountRequest {
  return {
    id,
    teamId,
    roleTitle: "",
    level: null,
    location: null,
    startQuarter: null,
    type: null,
    baseSalary: null,
    justification: "",
    aboveMidpointReason: "",
    planOffset: "",
    securityAccess: "",
  };
}

// ---------------------------------------------------------------------------------------------
// Published skills, as the policy check sees them. A skill is a lesson a person published in the
// Insights panel (lib/learning.ts drafts it). When it asks for a section of the request, the check
// below enforces it like a rule, citing the skill's id and version instead of a POL id.

/** The request sections a published skill can ask for. */
export const SKILL_FIELDS = ["securityAccess"] as const;
export type SkillField = (typeof SKILL_FIELDS)[number];

export type SkillCheck = {
  id: string;
  version: number;
  title: string;
  /** The team whose requests the skill applies to. */
  teamId: string;
  /** The section the skill asks for, if any: the draft field, what the panel calls it, and what it must cover. */
  requires: { field: SkillField; label: string; asks: string } | null;
};

/** The skills that apply to a team's requests and ask for a section. */
export function skillRequirements(skills: readonly SkillCheck[], teamId: string): (SkillCheck & { requires: NonNullable<SkillCheck["requires"]> })[] {
  return skills.filter((skill): skill is SkillCheck & { requires: NonNullable<SkillCheck["requires"]> } => skill.teamId === teamId && skill.requires !== null);
}

// ---------------------------------------------------------------------------------------------
// The calendar, worked out in code so the model never does date arithmetic. The fiscal year is the
// calendar year (company.json), and the plan covers FY2027.

/** "Q4 FY2026" for 2026-11-05. */
export function fiscalQuarterLabel(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${QUARTERS[Math.floor((month - 1) / 3)]} FY${year}`;
}

/** The plan-year quarter after the one `date` falls in: Q1 on the story date. Null when that quarter is outside the plan year. */
export function nextQuarter(date: string): Quarter | null {
  const [year, month] = date.split("-").map(Number);
  const index = Math.floor((month - 1) / 3) + 1; // the next quarter's index in `year` (4 means Q1 of next year)
  const [nextYear, nextIndex] = index === 4 ? [year + 1, 0] : [year, index];
  return `FY${nextYear}` === FISCAL_YEAR ? QUARTERS[nextIndex] : null;
}

/** The first plan-year start quarter that approval can still reach 60 days ahead of (POL-HC-04). */
export function earliestStartQuarter(date: string): Quarter | null {
  return QUARTERS.find((quarter) => date <= latestApprovalDate(quarter)) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Comp bands (POL-COMP-01, POL-COMP-02)

export type CompBand = {
  level: Level;
  title: string;
  location: Location;
  tier: Tier;
  min: number;
  mid: number;
  max: number;
};

export function getCompBand(level: Level, location: Location): CompBand {
  const tier = bandsData.locations[location] as Tier;
  const band = bandsData.bands[tier][level];
  return { level, title: bandsData.levels[level], location, tier, ...band };
}

export type BandPosition = "below_min" | "below_mid" | "at_mid" | "above_mid" | "above_max";

export function bandPosition(band: CompBand, base: number): BandPosition {
  if (base < band.min) return "below_min";
  if (base > band.max) return "above_max";
  if (base > band.mid) return "above_mid";
  return base === band.mid ? "at_mid" : "below_mid";
}

export function hasOffice(team: Team, location: Location): boolean {
  return location === "Remote (US)" || team.officeLocations.includes(location);
}

// ---------------------------------------------------------------------------------------------
// Dates (POL-HC-04)

const DAY_MS = 24 * 60 * 60 * 1000;

/** Default start date: the first day of the quarter's second month. */
export function startDate(quarter: Quarter): string {
  const quarterStart = new Date(`${company.fiscalYear.quarters[quarter].start}T00:00:00Z`);
  quarterStart.setUTCMonth(quarterStart.getUTCMonth() + 1);
  return quarterStart.toISOString().slice(0, 10);
}

/** Whole months employed in the fiscal year, from the start date to the year end. */
export function monthsInFiscalYear(quarter: Quarter): number {
  const start = new Date(`${startDate(quarter)}T00:00:00Z`);
  return 12 - start.getUTCMonth();
}

/** Recruiting needs 60 days, so approval must land this many days before the start date. */
export function latestApprovalDate(quarter: Quarter): string {
  const start = new Date(`${startDate(quarter)}T00:00:00Z`).getTime();
  return new Date(start - company.approvalThresholds.recruitingLeadTimeDays * DAY_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------------------------
// Cost model (POL-FIN-02)

export type CostInput = { level: Level; baseSalary: number; startQuarter: Quarter; agency?: boolean };

export type CostBreakdown = {
  base: number;
  bonus: number;
  equity: number;
  benefits: number;
  taxes: number;
  fullyLoadedAnnual: number;
  monthsInFiscalYear: number;
  proratedAnnual: number;
  recruiting: number;
  equipment: number;
  oneTime: number;
  fiscalYearImpact: number;
};

export function calculateCost({ level, baseSalary, startQuarter, agency = false }: CostInput): CostBreakdown {
  const model = company.costModel;
  const base = Math.round(baseSalary);
  const bonus = Math.round(base * model.targetBonusRateByLevel[level]);
  const equity = model.annualEquityByLevel[level];
  const benefits = Math.round(base * model.benefitsRate);
  const taxes = Math.round(base * model.employerTaxRate);
  const fullyLoadedAnnual = base + bonus + equity + benefits + taxes;

  const months = monthsInFiscalYear(startQuarter);
  const proratedAnnual = Math.round((fullyLoadedAnnual * months) / 12);
  const recruiting = agency ? Math.round(base * model.oneTime.recruitingAgencyRateOfBase) : model.oneTime.recruitingInternal;
  const equipment = model.oneTime.equipment;
  const oneTime = recruiting + equipment;

  return {
    base,
    bonus,
    equity,
    benefits,
    taxes,
    fullyLoadedAnnual,
    monthsInFiscalYear: months,
    proratedAnnual,
    recruiting,
    equipment,
    oneTime,
    fiscalYearImpact: proratedAnnual + oneTime,
  };
}

// ---------------------------------------------------------------------------------------------
// Plan fit (POL-HC-02, POL-HC-03) and budget fit (POL-FIN-01)

export type PlanFit = {
  quarter: Quarter;
  approved: number;
  opened: number;
  remaining: number;
  fits: boolean;
  /** Backfills skip the plan check (POL-HC-03). */
  skipped: boolean;
};

export function checkPlanFit(team: Team, quarter: Quarter, type: RequestType): PlanFit {
  const approved = team.approvedNetNew[quarter];
  const opened = team.opened[quarter];
  const remaining = approved - opened;
  const skipped = type === "backfill";
  return { quarter, approved, opened, remaining, fits: skipped || remaining >= 1, skipped };
}

export type BudgetFit = {
  budget: number;
  /** The plan's committed figure plus the FY impact of requests fully approved in this session. */
  committed: number;
  /** The part of `committed` that comes from requests approved in this session. */
  approvedInSession: number;
  remaining: number;
  fiscalYearImpact: number;
  leftAfter: number;
  fits: boolean;
};

/**
 * POL-FIN-01: budget minus committed. "Committed" is the plan's figure (headcount-plan.json) plus the
 * FY impact of requests fully approved in this session. Pending and sent-back requests are not
 * committed yet, so they do not count.
 */
export function checkBudgetFit(team: Team, fiscalYearImpact: number, approvedInSession = 0): BudgetFit {
  const committed = team.committed + approvedInSession;
  const remaining = team.personnelBudget - committed;
  const leftAfter = remaining - fiscalYearImpact;
  return {
    budget: team.personnelBudget,
    committed,
    approvedInSession,
    remaining,
    fiscalYearImpact,
    leftAfter,
    fits: leftAfter >= 0,
  };
}

/** One row per quarter, for the plan summary and the getHeadcountPlan tool. */
export function planSummary(team: Team, approvedInSession = 0) {
  return {
    team: team.name,
    department: team.department,
    fiscalYear: FISCAL_YEAR,
    currentHeadcount: team.currentHeadcount,
    quarters: QUARTERS.map((quarter) => {
      const { approved, opened, remaining } = checkPlanFit(team, quarter, "net_new");
      return { quarter, startDate: startDate(quarter), approvedNetNew: approved, opened, remaining };
    }),
    openReqs: team.openReqs,
    budget: checkBudgetFit(team, 0, approvedInSession),
    officeLocations: team.officeLocations,
  };
}

// ---------------------------------------------------------------------------------------------
// Approver routing (POL-APR-01, POL-APR-02)

export type ApprovalStep = {
  personId: string;
  name: string;
  title: string;
  ruleId: "POL-APR-01" | "POL-APR-02";
  reason: string;
};

export function cfoReasons(input: { level: Level; fullyLoadedAnnual: number; outsidePlan: boolean }): string[] {
  const reasons: string[] = [];
  if (input.fullyLoadedAnnual > CFO_THRESHOLD) {
    reasons.push(`fully loaded ${usd(input.fullyLoadedAnnual)} is above ${usd(CFO_THRESHOLD)}`);
  }
  if (company.approvalThresholds.cfoForLevels.includes(input.level)) reasons.push(`${input.level} roles need the CFO`);
  if (input.outsidePlan) reasons.push("the request is outside the headcount plan");
  return reasons;
}

export function routeApprovers(input: {
  team: Team;
  level: Level;
  fullyLoadedAnnual: number;
  outsidePlan: boolean;
}): ApprovalStep[] {
  const step = (person: Person, ruleId: ApprovalStep["ruleId"], reason: string): ApprovalStep => ({
    personId: person.id,
    name: person.name,
    title: person.title,
    ruleId,
    reason,
  });
  const departmentHead = getPerson(input.team.departmentHead ?? personWithRole("department_head").id);
  const chain = [
    step(departmentHead, "POL-APR-01", "Department head"),
    step(personWithRole("finance_bp"), "POL-APR-01", "Finance Business Partner"),
  ];
  const reasons = cfoReasons(input);
  if (reasons.length > 0) chain.push(step(personWithRole("cfo"), "POL-APR-02", `CFO: ${reasons.join("; ")}`));
  return chain;
}

// ---------------------------------------------------------------------------------------------
// The policy check: every rule in policies.md, evaluated against one request

export type CheckStatus = "pass" | "warn" | "fail" | "missing" | "info";

export type PolicyResult = { ruleId: string; title: string; status: CheckStatus; detail: string };

export type Evaluation = {
  requestId: string;
  results: PolicyResult[];
  band: CompBand | null;
  cost: CostBreakdown | null;
  plan: PlanFit | null;
  budget: BudgetFit | null;
  approvers: ApprovalStep[];
  /** Results that stop a submission: anything failed or missing. */
  blockers: PolicyResult[];
  readyToSubmit: boolean;
};

export function countSentences(text: string): number {
  return text
    .replace(/\be\.g\./gi, "eg") // "e.g." and "i.e." do not end a sentence
    .replace(/\bi\.e\./gi, "ie")
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export type EvaluateOptions = {
  today?: string;
  /** Published skills. Each one that applies to the request's team and asks for a section adds a check. */
  skills?: readonly SkillCheck[];
  /** FY impact of requests fully approved in this session: committed, so it lowers the budget left (POL-FIN-01). */
  approvedInSession?: number;
};

export function evaluateRequest(request: HeadcountRequest, { today = STORY_DATE, skills = [], approvedInSession = 0 }: EvaluateOptions = {}): Evaluation {
  const team = getTeam(request.teamId);
  const { level, location, startQuarter, type, baseSalary } = request;
  const results: PolicyResult[] = [];
  const add = (ruleId: string, title: string, status: CheckStatus, detail: string) =>
    results.push({ ruleId, title, status, detail });

  // POL-HC-01 Required fields
  const missing = [
    !request.roleTitle.trim() && "role title",
    !level && "level",
    !location && "location",
    !startQuarter && "start quarter",
    !type && "request type",
    !request.justification.trim() && "justification",
  ].filter((field): field is string => Boolean(field));
  if (missing.length > 0) add("POL-HC-01", "Required fields", "missing", `Missing: ${missing.join(", ")}.`);
  else if (countSentences(request.justification) < 2)
    add("POL-HC-01", "Required fields", "fail", "Justification needs two sentences: what it unblocks, and what happens if the role is not filled.");
  else add("POL-HC-01", "Required fields", "pass", "All required fields are filled in.");

  // POL-HC-02 Plan fit (POL-HC-03 for backfills)
  let plan: PlanFit | null = null;
  if (!startQuarter || !type) {
    const needs = [!startQuarter && "a start quarter", !type && "a request type"].filter(Boolean).join(" and ");
    add("POL-HC-02", "Plan fit", "missing", `Needs ${needs}.`);
  }
  else {
    plan = checkPlanFit(team, startQuarter, type);
    if (plan.skipped) add("POL-HC-03", "Backfill", "pass", "Backfills skip the plan check, but still go to the Finance BP.");
    else if (plan.fits)
      add("POL-HC-02", "Plan fit", "pass", `${startQuarter}: ${plan.approved} approved net-new, ${plan.opened} already opened, ${plan.remaining} left.`);
    else if (!request.planOffset.trim())
      add(
        "POL-HC-02",
        "Plan fit",
        "fail",
        `${startQuarter}: no net-new left (${plan.approved} approved, ${plan.opened} opened). Outside the plan: name an offsetting reduction or new budget. The CFO joins (POL-APR-02).`,
      );
    else
      add("POL-HC-02", "Plan fit", "warn", `${startQuarter}: outside the plan, with an offset: "${request.planOffset.trim()}". The CFO joins (POL-APR-02).`);
  }

  // POL-HC-04 Lead time
  if (!startQuarter) add("POL-HC-04", "Lead time", "missing", "Needs a start quarter.");
  else {
    const months = monthsInFiscalYear(startQuarter);
    const approveBy = latestApprovalDate(startQuarter);
    const detail = `Starts ${longDate(startDate(startQuarter))} (${months} months in ${FISCAL_YEAR}). Approval needed by ${longDate(approveBy)}.`;
    add("POL-HC-04", "Lead time", today <= approveBy ? "pass" : "fail", today <= approveBy ? detail : `Too late: ${detail}`);
  }

  // POL-COMP-02 Location
  if (!location) add("POL-COMP-02", "Location", "missing", "Needs a location.");
  else {
    const tier = bandsData.locations[location].replace("tier", "Tier ");
    if (hasOffice(team, location)) add("POL-COMP-02", "Location", "pass", `${location} is ${tier}, and ${team.name} has an office there.`);
    else add("POL-COMP-02", "Location", "fail", `${team.name} has no ${location} office. Offices: ${team.officeLocations.join(", ")}, or Remote (US).`);
  }

  // POL-COMP-01 Band
  const band = level && location ? getCompBand(level, location) : null;
  if (!band || baseSalary === null) add("POL-COMP-01", "Salary band", "missing", "Needs a level, a location and a base salary.");
  else {
    const range = `${band.level} ${band.tier.replace("tier", "Tier ")}: ${usd(band.min)} to ${usd(band.max)}, midpoint ${usd(band.mid)}`;
    const position = bandPosition(band, baseSalary);
    if (position === "below_min") add("POL-COMP-01", "Salary band", "fail", `${usd(baseSalary)} is below the band (${range}).`);
    else if (position === "above_max")
      add("POL-COMP-01", "Salary band", "fail", `${usd(baseSalary)} is above the band maximum (${range}). Needs a Compensation Committee exception, out of scope here.`);
    else if (position === "above_mid" && !request.aboveMidpointReason.trim())
      add("POL-COMP-01", "Salary band", "fail", `${usd(baseSalary)} is above the ${usd(band.mid)} midpoint: add a one-line reason (competing offer, scarce skill, internal parity).`);
    else if (position === "above_mid")
      add("POL-COMP-01", "Salary band", "pass", `${usd(baseSalary)} is above the midpoint, reason given: "${request.aboveMidpointReason.trim()}".`);
    else add("POL-COMP-01", "Salary band", "pass", `${usd(baseSalary)} is ${position === "at_mid" ? "at the midpoint" : "inside the band"} (${range}).`);
  }

  // POL-FIN-02 Cost model, POL-FIN-01 Budget fit
  const cost = level && baseSalary !== null && startQuarter ? calculateCost({ level, baseSalary, startQuarter }) : null;
  let budget: BudgetFit | null = null;
  if (!cost) {
    add("POL-FIN-02", "Cost", "missing", "Needs a level, a base salary and a start quarter.");
    add("POL-FIN-01", "Budget fit", "missing", "Needs the cost first.");
  } else {
    add(
      "POL-FIN-02",
      "Cost",
      "info",
      `Fully loaded ${usd(cost.fullyLoadedAnnual)} a year. ${FISCAL_YEAR} impact ${usd(cost.fiscalYearImpact)} (${cost.monthsInFiscalYear} months plus ${usd(cost.oneTime)} one-time).`,
    );
    budget = checkBudgetFit(team, cost.fiscalYearImpact, approvedInSession);
    add(
      "POL-FIN-01",
      "Budget fit",
      budget.fits ? "pass" : "fail",
      budget.fits
        ? `Fits the ${usd(budget.remaining)} remaining, leaving ${usd(budget.leftAfter)}.`
        : `${usd(cost.fiscalYearImpact)} is more than the ${usd(budget.remaining)} remaining.`,
    );
  }

  // POL-APR-01 Chain, POL-APR-02 CFO
  let approvers: ApprovalStep[] = [];
  if (!level || !cost) add("POL-APR-01", "Approvers", "missing", "Needs a level and the cost first.");
  else {
    const outsidePlan = plan ? !plan.fits : false;
    approvers = routeApprovers({ team, level, fullyLoadedAnnual: cost.fullyLoadedAnnual, outsidePlan });
    add("POL-APR-01", "Approval chain", "info", approvers.map((step) => step.name).join(", then "));
    const reasons = cfoReasons({ level, fullyLoadedAnnual: cost.fullyLoadedAnnual, outsidePlan });
    const cfo = approvers.find((step) => step.ruleId === "POL-APR-02");
    if (cfo) add("POL-APR-02", "CFO", "warn", `${cfo.name} (CFO) joins: ${reasons.join("; ")}.`);
    else
      add("POL-APR-02", "CFO", "pass", `No CFO: ${usd(cost.fullyLoadedAnnual)} is under ${usd(CFO_THRESHOLD)}.`);
  }

  // Published skills: a section a person's published lesson asks for blocks like a rule until it is filled
  for (const skill of skillRequirements(skills, request.teamId)) {
    const ruleId = `${skill.id} v${skill.version}`;
    const { field, label, asks } = skill.requires;
    if (request[field].trim()) add(ruleId, label, "pass", `Filled in, as the published skill "${skill.title}" asks.`);
    else add(ruleId, label, "missing", `The published skill "${skill.title}" asks for this section: ${asks}.`);
  }

  const blockers = results.filter((r) => r.status === "fail" || r.status === "missing");
  return { requestId: request.id, results, band, cost, plan, budget, approvers, blockers, readyToSubmit: blockers.length === 0 };
}
