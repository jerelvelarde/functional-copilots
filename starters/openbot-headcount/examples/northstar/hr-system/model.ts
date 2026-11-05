/**
 * Northstar HR, the workshop's stand-in for a real HR system (Workday, Greenhouse, an internal API).
 *
 * Everything here is deterministic and reads the package's own copy of the shared data in `../data`.
 * The coworker never does arithmetic: it asks these functions and quotes what they return, so the
 * numbers in Slack, in the web app and in the deck are the same numbers. Every result names the
 * policy rule it applied, so the coworker can cite it.
 *
 * Pure functions only. `server.ts` puts them behind MCP.
 */
import { readFileSync } from "node:fs";

type Level = "L3" | "L4" | "L5" | "L6" | "L7";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type Tier = "tier1" | "tier2" | "tier3";
type Band = { min: number; mid: number; max: number };

type Person = {
  id: string;
  name: string;
  title: string;
  team: string;
  role: string;
};

type Company = {
  fiscalYear: {
    label: string;
    start: string;
    end: string;
    quarters: Record<Quarter, { start: string; end: string }>;
  };
  people: Person[];
  costModel: {
    benefitsRate: number;
    employerTaxRate: number;
    targetBonusRateByLevel: Record<Level, number>;
    annualEquityByLevel: Record<Level, number>;
    oneTime: {
      recruitingInternal: number;
      recruitingAgencyRateOfBase: number;
      equipment: number;
    };
  };
  approvalThresholds: {
    cfoAboveFullyLoadedAnnual: number;
    cfoForLevels: string[];
    recruitingLeadTimeDays: number;
  };
};

type Team = {
  id: string;
  name: string;
  department: string;
  departmentHead: string | null;
  manager: string | null;
  currentHeadcount: number;
  approvedNetNew: Record<Quarter, number>;
  opened: Record<Quarter, number>;
  openReqs: Record<string, unknown>[];
  personnelBudget: number;
  committed: number;
  officeLocations: string[];
};

type Plan = { fiscalYear: string; teams: Team[] };

type Bands = {
  locations: Record<string, Tier>;
  levels: Record<Level, string>;
  bands: Record<Tier, Record<Level, Band>>;
};

export type HrData = {
  company: Company;
  plan: Plan;
  bands: Bands;
};

/** A request the coworker cannot evaluate as asked. The message is written for the coworker. */
export class HrInputError extends Error {}

export function loadData(
  directory: URL = new URL("../data/", import.meta.url),
): HrData {
  const read = (name: string) =>
    JSON.parse(readFileSync(new URL(name, directory), "utf8"));
  return {
    company: read("company.json"),
    plan: read("headcount-plan.json"),
    bands: read("comp-bands.json"),
  };
}

const LEVELS: Level[] = ["L3", "L4", "L5", "L6", "L7"];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
const TIER_LABEL: Record<Tier, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
};

const usd = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const plain = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const cents = (value: number) => Math.round(value * 100) / 100;

export function level(value: unknown): Level {
  const text = String(value ?? "")
    .trim()
    .toUpperCase();
  if ((LEVELS as string[]).includes(text)) return text as Level;
  throw new HrInputError(
    `Level "${String(value)}" is not one of ${LEVELS.join(", ")}. L3 Software Engineer, L4 Software Engineer II, L5 Senior Software Engineer, L6 Staff Software Engineer, L7 Principal Software Engineer.`,
  );
}

export function quarter(value: unknown): Quarter {
  const match = /Q([1-4])/i.exec(String(value ?? ""));
  if (match) return `Q${match[1]}` as Quarter;
  throw new HrInputError(
    `Start quarter "${String(value)}" is not one of Q1, Q2, Q3, Q4 (FY2027).`,
  );
}

export function location(data: HrData, value: unknown): string {
  const text = String(value ?? "").trim();
  const known = Object.keys(data.bands.locations);
  const exact = known.find((name) => name.toLowerCase() === text.toLowerCase());
  if (exact) return exact;
  if (/^remote/i.test(text)) return "Remote (US)";
  if (/^(nyc|ny)$/i.test(text)) return "New York";
  if (/^(sf|bay area)$/i.test(text)) return "San Francisco";
  throw new HrInputError(
    `Location "${text}" has no band. Northstar hires in: ${known.join(", ")} (POL-COMP-02).`,
  );
}

export function team(data: HrData, value: unknown): Team {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  const teams = data.plan.teams;
  const list = teams
    .map((candidate) => `${candidate.id} (${candidate.name})`)
    .join(", ");
  // Refused rather than matched: every name starts with "", so an empty team used to become the
  // first team in the plan, and a requester from another team got Platform's plan and budget.
  if (!text)
    throw new HrInputError(
      `No team given. Ask the requester which team the role is for. Teams: ${list}.`,
    );
  const found =
    teams.find(
      (candidate) =>
        candidate.id === text || candidate.name.toLowerCase() === text,
    ) ??
    // A prefix ("plat", "customer") only from three characters on, so one letter cannot pick a team.
    (text.length >= 3
      ? teams.find(
          (candidate) =>
            candidate.id.startsWith(text) ||
            candidate.name.toLowerCase().startsWith(text),
        )
      : undefined);
  if (found) return found;
  throw new HrInputError(
    `Team "${String(value)}" is not in the FY2027 plan. Teams: ${list}.`,
  );
}

function person(data: HrData, id: string | null) {
  const found = data.company.people.find((candidate) => candidate.id === id);
  return found ? { name: found.name, title: found.title } : null;
}

function personWithRole(data: HrData, role: string) {
  const found = data.company.people.find(
    (candidate) => candidate.role === role,
  );
  return found ? { name: found.name, title: found.title } : null;
}

/** Today's date, or `NORTHSTAR_TODAY` (YYYY-MM-DD) so a rehearsal can pin the demo date. */
export function today(environment = process.env): string {
  const pinned = environment.NORTHSTAR_TODAY?.trim();
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned;
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/** The quarter after the one `date` falls in, named in FY2027 terms where it lands in FY2027. */
export function fiscalContext(data: HrData, date: string) {
  const fy = data.company.fiscalYear;
  const quarters = Object.entries(fy.quarters) as [
    Quarter,
    { start: string; end: string },
  ][];
  const current = quarters.find(
    ([, range]) => date >= range.start && date <= range.end,
  );
  let next: string;
  if (date < fy.start) next = `Q1 ${fy.label}`;
  else if (current && current[0] !== "Q4")
    next = `Q${Number(current[0][1]) + 1} ${fy.label}`;
  else next = `after ${fy.label} (outside this plan)`;
  return {
    today: date,
    fiscalYear: `${fy.label} runs ${fy.start} to ${fy.end}`,
    currentQuarter: current ? `${current[0]} ${fy.label}` : "before FY2027",
    nextQuarter: next,
  };
}

/**
 * Requests submitted to Northstar HR for a team that no approver has decided yet. In this stand-in
 * that is every request it holds: the approvers decide in the real HR system, which it does not
 * model, so nothing here ever moves a request out of pending.
 */
function pendingFor(
  submitted: Iterable<StoredRequest>,
  teamId: string,
): StoredRequest[] {
  return [...submitted].filter((stored) => stored.request.teamId === teamId);
}

/**
 * POL-HC-02's count for one quarter: approved net-new minus reqs already opened, and minus the
 * net-new requests submitted here that are still pending, because each of those holds one of the
 * quarter's slots until an approver decides it. With nothing pending this is exactly approved minus
 * opened, the figure the web app shows (1 left for Platform in Q1). Never below zero.
 */
function slots(team: Team, q: Quarter, pending: StoredRequest[]) {
  const holding = pending.filter(
    (stored) =>
      stored.request.type === "net_new" && stored.request.quarter === q,
  );
  const approved = team.approvedNetNew[q];
  const opened = team.opened[q];
  return {
    approved,
    opened,
    pending: holding.length,
    pendingIds: holding.map((stored) => stored.id),
    remaining: Math.max(0, approved - opened - holding.length),
  };
}

/** POL-FIN-01's remaining budget, less the FY2027 impact of this team's pending requests. */
function budgetLeft(team: Team, pending: StoredRequest[]) {
  const pendingImpact = pending.reduce(
    (sum, stored) => sum + stored.figures.fy2027Impact,
    0,
  );
  const remaining = team.personnelBudget - team.committed - pendingImpact;
  return {
    personnelBudget: team.personnelBudget,
    committed: team.committed,
    pending: pendingImpact,
    pendingIds: pending.map((stored) => stored.id),
    remaining,
    display: pendingImpact
      ? `${usd(team.personnelBudget)} budget - ${usd(team.committed)} committed - ${usd(pendingImpact)} pending in Northstar HR (${pending.map((stored) => stored.id).join(", ")}) = ${usd(remaining)} remaining`
      : `${usd(team.personnelBudget)} budget - ${usd(team.committed)} committed = ${usd(remaining)} remaining`,
  };
}

export function teamPlan(
  data: HrData,
  teamName: unknown,
  submitted: Iterable<StoredRequest> = [],
) {
  const found = team(data, teamName);
  const pending = pendingFor(submitted, found.id);
  return {
    team: {
      id: found.id,
      name: found.name,
      department: found.department,
      departmentHead: person(data, found.departmentHead),
      manager: person(data, found.manager),
      currentHeadcount: found.currentHeadcount,
    },
    netNewByQuarter: Object.fromEntries(
      QUARTERS.map((q) => {
        const quarterSlots = slots(found, q, pending);
        return [
          q,
          {
            ...quarterSlots,
            display: `${quarterSlots.remaining} left (${quarterSlots.pending} pending)`,
          },
        ];
      }),
    ),
    openReqs: found.openReqs,
    budget: budgetLeft(found, pending),
    officeLocations: found.officeLocations,
    fiscal: fiscalContext(data, today()),
    policy: ["POL-HC-02", "POL-FIN-01", "POL-COMP-02"],
    source: `headcount-plan.json (${data.plan.fiscalYear}), plus requests pending in Northstar HR`,
  };
}

export function compBand(data: HrData, levelValue: unknown, where: unknown) {
  const lvl = level(levelValue);
  const loc = location(data, where);
  const tier = data.bands.locations[loc] as Tier;
  const band = data.bands.bands[tier][lvl];
  return {
    level: lvl,
    title: data.bands.levels[lvl],
    location: loc,
    tier: TIER_LABEL[tier],
    band,
    display: `${lvl} ${TIER_LABEL[tier]} (${loc}): ${usd(band.min)} to ${usd(band.max)}, midpoint ${usd(band.mid)}`,
    policy: ["POL-COMP-01", "POL-COMP-02"],
    source: "comp-bands.json",
  };
}

export type CostInput = {
  level: unknown;
  location: unknown;
  start_quarter: unknown;
  base_salary?: unknown;
  start_date?: unknown;
  recruiting?: unknown;
};

/** POL-FIN-02 exactly as written, with the start date from POL-HC-04. */
export function hireCost(data: HrData, input: CostInput) {
  const band = compBand(data, input.level, input.location);
  const lvl = band.level;
  const q = quarter(input.start_quarter);
  const model = data.company.costModel;
  const fy = data.company.fiscalYear;

  const proposed =
    input.base_salary === undefined ||
    input.base_salary === null ||
    input.base_salary === ""
      ? undefined
      : Number(String(input.base_salary).replace(/[$,\s]/g, ""));
  if (proposed !== undefined && !(Number.isFinite(proposed) && proposed > 0))
    throw new HrInputError(
      `Base salary "${String(input.base_salary)}" is not a number of dollars.`,
    );
  const base = proposed ?? band.band.mid;

  const quarterStart = fy.quarters[q].start;
  const defaultStart = `${quarterStart.slice(0, 5)}${String(Number(quarterStart.slice(5, 7)) + 1).padStart(2, "0")}-01`;
  const startDate =
    typeof input.start_date === "string" && input.start_date.trim()
      ? input.start_date.trim()
      : defaultStart;
  if (!/^\d{4}-\d{2}-01$/.test(startDate))
    throw new HrInputError(
      `Start date "${startDate}" is not the first day of a month. POL-FIN-01 prorates by months employed and the written policy does not say how to count a partial month, so give a start date on the 1st (the default is the first day of the quarter's second month, POL-HC-04).`,
    );
  if (startDate < fy.start || startDate > fy.end)
    throw new HrInputError(
      `Start date ${startDate} is outside ${fy.label} (${fy.start} to ${fy.end}).`,
    );
  // Plan fit is judged per start quarter (POL-HC-02), so a date in another quarter would be checked
  // against the wrong quarter's slots.
  const range = fy.quarters[q];
  if (startDate < range.start || startDate > range.end)
    throw new HrInputError(
      `Start date ${startDate} is not in ${q} ${fy.label} (${range.start} to ${range.end}). Give a start date inside the start quarter, or change start_quarter (POL-HC-02, POL-HC-04).`,
    );
  const startMonth = Number(startDate.slice(5, 7));
  const months = 12 - startMonth + 1;

  const recruitingKind =
    String(input.recruiting ?? "internal").toLowerCase() === "agency"
      ? "agency"
      : "internal";

  const targetBonusRate = model.targetBonusRateByLevel[lvl];
  const targetBonus = cents(base * targetBonusRate);
  const annualEquity = model.annualEquityByLevel[lvl];
  const benefits = cents(base * model.benefitsRate);
  const employerTaxes = cents(base * model.employerTaxRate);
  const fullyLoaded = cents(
    base + targetBonus + annualEquity + benefits + employerTaxes,
  );
  const prorated = cents((fullyLoaded * months) / 12);
  const recruiting =
    recruitingKind === "agency"
      ? cents(base * model.oneTime.recruitingAgencyRateOfBase)
      : model.oneTime.recruitingInternal;
  const oneTime = cents(recruiting + model.oneTime.equipment);
  const fyImpactExact = cents(prorated + oneTime);
  const fyImpact = Math.round(fyImpactExact);

  const position =
    base > band.band.max
      ? "above_max"
      : base < band.band.min
        ? "below_min"
        : base > band.band.mid
          ? "above_midpoint"
          : base === band.band.mid
            ? "at_midpoint"
            : "below_midpoint";

  const latestApproval = addDays(
    startDate,
    -data.company.approvalThresholds.recruitingLeadTimeDays,
  );
  const now = today();
  const cfoLimit = data.company.approvalThresholds.cfoAboveFullyLoadedAnnual;

  return {
    level: lvl,
    title: band.title,
    location: band.location,
    tier: band.tier,
    band: band.band,
    base: {
      amount: base,
      source: proposed === undefined ? "band midpoint" : "proposed",
      position,
      needsReason: position === "above_midpoint",
      outOfScope: position === "above_max",
      belowBand: position === "below_min",
      note:
        position === "above_max"
          ? "Above the band maximum: needs a Compensation Committee exception and is out of scope for this workflow (POL-COMP-01)."
          : position === "above_midpoint"
            ? "Above the band midpoint: needs a one-line reason, e.g. competing offer, scarce skill, internal parity (POL-COMP-01)."
            : position === "below_min"
              ? "Below the band minimum: the base must sit inside the band (POL-COMP-01)."
              : "Inside the band, at or below the midpoint (POL-COMP-01).",
    },
    annual: {
      base,
      targetBonus,
      targetBonusRate,
      annualEquity,
      benefits,
      benefitsRate: model.benefitsRate,
      employerTaxes,
      employerTaxRate: model.employerTaxRate,
      fullyLoaded,
      display: `${plain(base)} + ${plain(targetBonus)} bonus + ${plain(annualEquity)} equity + ${plain(benefits)} benefits + ${plain(employerTaxes)} taxes = ${usd(fullyLoaded)}`,
    },
    annualRunRate: {
      amount: fullyLoaded,
      display: `${usd(fullyLoaded)} per year (fully loaded annual cost)`,
    },
    start: {
      date: startDate,
      source:
        startDate === defaultStart
          ? "default: first day of the start quarter's second month (POL-HC-04)"
          : "requested",
      monthsInFiscalYear: months,
      latestApprovalDate: latestApproval,
      leadTimeOk: now <= latestApproval,
      leadTimeNote:
        now <= latestApproval
          ? `Approve by ${latestApproval} to keep the 60-day recruiting lead time (POL-HC-04); that is ${daysBetween(now, latestApproval)} days from ${now}.`
          : `Too late for this start date: it needed approval by ${latestApproval} (60-day lead time, POL-HC-04). Today is ${now}.`,
    },
    fiscalYearImpact: {
      proratedFullyLoaded: prorated,
      oneTime: {
        recruiting,
        recruitingKind,
        equipment: model.oneTime.equipment,
        total: oneTime,
      },
      amount: fyImpact,
      rounded: fyImpact !== fyImpactExact,
      display: `${plain(fullyLoaded)} x ${months}/12 = ${plain(prorated)}, plus ${plain(oneTime)} one-time = ${usd(fyImpact)}${fyImpact !== fyImpactExact ? " (rounded)" : ""}`,
    },
    cfoThreshold: {
      limit: cfoLimit,
      fullyLoadedAbove: fullyLoaded > cfoLimit,
      display:
        fullyLoaded > cfoLimit
          ? `${usd(fullyLoaded)} is above ${usd(cfoLimit)}: the CFO is added (POL-APR-02).`
          : `${usd(fullyLoaded)} is under ${usd(cfoLimit)}: no CFO on cost grounds (POL-APR-02).`,
    },
    policy: ["POL-FIN-02", "POL-HC-04", "POL-COMP-01"],
    source: "company.json costModel, comp-bands.json",
  };
}

export type RequestInput = CostInput & {
  team: unknown;
  request_type: unknown;
};

function requestType(value: unknown): "net_new" | "backfill" {
  const text = String(value ?? "")
    .toLowerCase()
    .replace(/[\s-]/g, "_");
  if (text === "net_new" || text === "netnew" || text === "new")
    return "net_new";
  if (text === "backfill") return "backfill";
  throw new HrInputError(
    `Request type "${String(value)}" is not net-new or backfill (POL-HC-01).`,
  );
}

/** What a request is, as Northstar HR resolved it. */
export type RequestSummary = {
  team: string;
  teamId: string;
  type: "net_new" | "backfill";
  level: Level;
  title: string;
  location: string;
  quarter: Quarter;
  startQuarter: string;
};

/**
 * Every check the workflow runs, in one deterministic answer.
 *
 * `submitted` is what Northstar HR already holds. Its pending requests count against the plan
 * (POL-HC-02) and the budget (POL-FIN-01), so a second request for the same slot is judged on what
 * the first one left.
 */
export function checkRequest(
  data: HrData,
  input: RequestInput,
  submitted: Iterable<StoredRequest> = [],
) {
  const found = team(data, input.team);
  const type = requestType(input.request_type);
  const cost = hireCost(data, input);
  const q = quarter(input.start_quarter);
  const pending = pendingFor(submitted, found.id);

  const { approved, opened, remaining, ...held } = slots(found, q, pending);
  const inPlan = type === "backfill" ? true : remaining >= 1;
  const counted = `${remaining} left (${held.pending} pending${held.pending ? `: ${held.pendingIds.join(", ")}` : ""})`;
  const planFit =
    type === "backfill"
      ? {
          checked: false,
          inPlan: true,
          display:
            "Backfill: the plan check is skipped if the person left in the last 90 days; confirm the departure date. Still goes to the Finance Business Partner (POL-HC-03).",
          policy: "POL-HC-03",
        }
      : {
          checked: true,
          inPlan,
          approved,
          opened,
          pending: held.pending,
          pendingIds: held.pendingIds,
          remaining,
          openReqs: found.openReqs.filter((req) => req.quarter === q),
          display: inPlan
            ? `${found.name} has ${approved} approved net-new for ${q} FY2027 and ${opened} already opened: ${counted}. Fits the plan (POL-HC-02).`
            : `${found.name} has ${approved} approved net-new for ${q} FY2027 and ${opened} already opened: ${counted}. Outside the plan: needs CFO approval and an offsetting reduction or new budget (POL-HC-02).`,
          policy: "POL-HC-02",
        };

  const hasOffice =
    cost.location === "Remote (US)" ||
    found.officeLocations.includes(cost.location);
  const locationCheck = {
    location: cost.location,
    tier: cost.tier,
    teamOffices: found.officeLocations,
    allowed: hasOffice,
    display: hasOffice
      ? `${cost.location} is ${cost.tier} and ${found.name} has an office there (POL-COMP-02).`
      : `${found.name} has no office in ${cost.location}; it can hire in ${[...found.officeLocations, "Remote (US)"].join(", ")} (POL-COMP-02).`,
    policy: "POL-COMP-02",
  };

  const left = budgetLeft(found, pending);
  const budgetRemaining = left.remaining;
  const headroom = budgetRemaining - cost.fiscalYearImpact.amount;
  const budget = {
    personnelBudget: found.personnelBudget,
    committed: found.committed,
    pending: left.pending,
    pendingIds: left.pendingIds,
    remaining: budgetRemaining,
    fiscalYearImpact: cost.fiscalYearImpact.amount,
    fits: headroom >= 0,
    headroomAfter: headroom,
    display:
      headroom >= 0
        ? `${left.display}. FY2027 impact ${usd(cost.fiscalYearImpact.amount)} fits, leaving ${usd(headroom)} (POL-FIN-01).`
        : `${left.display}, less than the FY2027 impact of ${usd(cost.fiscalYearImpact.amount)}: does not fit, short by ${usd(-headroom)} (POL-FIN-01).`,
    policy: "POL-FIN-01",
  };

  const thresholds = data.company.approvalThresholds;
  const cfoReasons = [
    ...(cost.annual.fullyLoaded > thresholds.cfoAboveFullyLoadedAnnual
      ? [
          `fully loaded ${usd(cost.annual.fullyLoaded)} is above ${usd(thresholds.cfoAboveFullyLoadedAnnual)}`,
        ]
      : []),
    ...(thresholds.cfoForLevels.includes(cost.level)
      ? [`level ${cost.level}`]
      : []),
    ...(!inPlan ? ["outside the approved plan (POL-HC-02)"] : []),
  ];
  const head = person(data, found.departmentHead);
  const finance = personWithRole(data, "finance_bp");
  const cfo = personWithRole(data, "cfo");
  const chain = [
    head
      ? { ...head, step: "department head", policy: "POL-APR-01" }
      : {
          name: "(no department head named in the plan)",
          title: "ask Finance who approves for this team",
          step: "department head",
          policy: "POL-APR-01",
        },
    ...(finance
      ? [{ ...finance, step: "Finance Business Partner", policy: "POL-APR-01" }]
      : []),
    ...(cfoReasons.length && cfo
      ? [{ ...cfo, step: "CFO", policy: "POL-APR-02", why: cfoReasons }]
      : []),
  ];
  const approvals = {
    chain,
    cfoRequired: cfoReasons.length > 0,
    display: `${chain.map((step) => `${step.name} (${step.title})`).join(", then ")}. ${cfoReasons.length ? `CFO added: ${cfoReasons.join("; ")} (POL-APR-02).` : `No CFO: ${usd(cost.annual.fullyLoaded)} is under ${usd(thresholds.cfoAboveFullyLoadedAnnual)}, not L7, and in plan (POL-APR-02).`}`,
    policy: ["POL-APR-01", "POL-APR-02"],
  };

  const blockers = [
    ...(!hasOffice ? [locationCheck.display] : []),
    ...(cost.base.outOfScope || cost.base.belowBand ? [cost.base.note] : []),
    ...(!budget.fits ? [budget.display] : []),
    ...(!cost.start.leadTimeOk ? [cost.start.leadTimeNote] : []),
  ];
  const stillNeeded = [
    ...(cost.base.needsReason
      ? [
          "A one-line reason for proposing above the band midpoint (POL-COMP-01).",
        ]
      : []),
    ...(!inPlan
      ? [
          "An offsetting reduction or new budget, because the request is outside the plan (POL-HC-02).",
        ]
      : []),
    ...(type === "backfill"
      ? [
          "Confirmation that the person being backfilled left in the last 90 days (POL-HC-03).",
        ]
      : []),
  ];

  const request: RequestSummary = {
    team: found.name,
    teamId: found.id,
    type,
    level: cost.level,
    title: cost.title,
    location: cost.location,
    quarter: q,
    startQuarter: `${q} FY2027`,
  };
  return {
    request,
    planFit,
    location: locationCheck,
    band: {
      ...cost.band,
      proposedBase: cost.base.amount,
      baseSource: cost.base.source,
      position: cost.base.position,
      display: `${cost.level} ${cost.tier}: ${usd(cost.band.min)} to ${usd(cost.band.max)}, midpoint ${usd(cost.band.mid)}. Proposed base ${usd(cost.base.amount)} (${cost.base.source}). ${cost.base.note}`,
      policy: "POL-COMP-01",
    },
    start: cost.start,
    cost: {
      annual: cost.annual,
      annualRunRate: cost.annualRunRate,
      fiscalYearImpact: cost.fiscalYearImpact,
      policy: "POL-FIN-02",
    },
    budget,
    approvals,
    readyToSubmit: blockers.length === 0,
    blockers,
    stillNeeded,
    source:
      "Northstar HR (workshop stand-in): headcount-plan.json, comp-bands.json, company.json",
  };
}

export type Submission = RequestInput & {
  role_title?: unknown;
  justification?: unknown;
  above_midpoint_reason?: unknown;
  out_of_plan_offset?: unknown;
  business_case?: unknown;
  production_access?: unknown;
  on_call?: unknown;
  access_reviewer?: unknown;
};

/** The access levels a production access entry can name. "elevated" is full control. */
export const ACCESS_LEVELS = ["read_only", "deploy", "elevated"] as const;
type AccessLevel = (typeof ACCESS_LEVELS)[number];

export type ProductionAccess = {
  systems: { system: string; level: AccessLevel }[];
  onCall: boolean | null;
  reviewer: string | null;
};

export type StoredRequest = {
  id: string;
  status: string;
  submittedAt: string;
  request: RequestSummary & {
    roleTitle: string;
    baseSalary: number;
    startDate: string;
    recruiting: string;
  };
  /** Computed here, at submit time, from the structured inputs. Nothing the coworker sent is used. */
  figures: {
    computedBy: string;
    annualRunRate: number;
    annualRunRateDisplay: string;
    fy2027Impact: number;
    fy2027ImpactDisplay: string;
    budgetLeftAfter: number;
    budgetDisplay: string;
    planFit: string;
    approvalChain: { name: string; title: string; step: string }[];
    approvalsDisplay: string;
    policy: string[];
  };
  /** The coworker's own words, stored as written. Nothing here is checked against the figures. */
  narrative: {
    writtenBy: string;
    businessCase: string;
    justification: string;
    aboveMidpointReason: string | null;
    outOfPlanOffset: string | null;
    productionAccess: ProductionAccess | null;
  };
  nextApprover: string;
};

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const given = (value: unknown) =>
  typeof value === "number" ? Number.isFinite(value) : text(value) !== "";

/** The structured inputs every figure is computed from, plus what POL-HC-01 requires. */
const REQUIRED_TO_SUBMIT = [
  "role_title",
  "team",
  "level",
  "location",
  "start_quarter",
  "request_type",
  "base_salary",
  "justification",
  "business_case",
] as const;

function onCall(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const answer = text(value).toLowerCase();
  if (answer === "true" || answer === "yes") return true;
  if (answer === "false" || answer === "no") return false;
  return null;
}

/**
 * The security and access answers, as structured fields. Access levels are one of three words so
 * that nothing the requester says ("admin role", "credentials") has to be copied into the submit,
 * where OpenBot's safety floor would hand the whole submit to the person instead of running it.
 */
function productionAccess(input: Submission): ProductionAccess | null {
  const entries = input.production_access;
  if (
    entries === undefined ||
    entries === null ||
    (Array.isArray(entries) && entries.length === 0)
  )
    return null;
  if (!Array.isArray(entries))
    throw new HrInputError(
      "Not submitted: production_access must be a list with one { system, level } entry per system.",
    );
  const systems = entries.map((entry) => {
    const item = (entry ?? {}) as { system?: unknown; level?: unknown };
    const system = text(item.system);
    const level = text(item.level)
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (!system)
      throw new HrInputError(
        "Not submitted: a production_access entry has no system.",
      );
    if (!(ACCESS_LEVELS as readonly string[]).includes(level))
      throw new HrInputError(
        `Not submitted: the access level for ${system} is "${String(item.level)}", not one of ${ACCESS_LEVELS.join(", ")}.`,
      );
    return { system, level: level as AccessLevel };
  });
  return {
    systems,
    onCall: onCall(input.on_call),
    reviewer: text(input.access_reviewer) || null,
  };
}

/**
 * Checks a submission against the written policy and the cost model, and records it.
 *
 * Every figure of record is computed here from the structured inputs (team, level, location, start
 * quarter, request type, base salary, start date, recruiting): the annual run-rate, the FY2027
 * impact, the budget left after it, and the approver chain. A figure or approver list the coworker
 * sends is never read, so a number the model worked out itself cannot become one an approver sees in
 * `figures`. A request with one of those inputs missing is refused rather than defaulted.
 *
 * The business case is different: it is the coworker's narrative, stored as written under
 * `narrative`, and nothing here checks the prose against `figures`.
 */
export function submitRequest(
  data: HrData,
  store: Map<string, StoredRequest>,
  input: Submission,
  nextId: () => string,
): StoredRequest {
  const missing = REQUIRED_TO_SUBMIT.filter((name) => !given(input[name]));
  if (missing.length)
    throw new HrInputError(
      `Not submitted: missing ${missing.join(", ")}. Northstar HR computes every figure and the approver chain from the structured inputs, so it does not guess one: send the values check_request used (POL-HC-01 lists the required fields).`,
    );
  const justification = text(input.justification);
  const sentences = justification
    .split(/[.!?]+(?:\s|$)/)
    .filter((sentence) => sentence.trim().length > 0).length;
  if (sentences < 2)
    throw new HrInputError(
      "Not submitted: the justification must be at least two sentences, saying what work it unblocks and what happens if the role is not filled (POL-HC-01).",
    );

  const access = productionAccess(input);

  const checked = checkRequest(data, input, store.values());
  if (checked.blockers.length)
    throw new HrInputError(`Not submitted: ${checked.blockers.join(" ")}`);
  if (
    checked.band.position === "above_midpoint" &&
    !text(input.above_midpoint_reason)
  )
    throw new HrInputError(
      "Not submitted: the base is above the band midpoint, so above_midpoint_reason needs a one-line reason (POL-COMP-01).",
    );
  if (!checked.planFit.inPlan && !text(input.out_of_plan_offset))
    throw new HrInputError(
      `Not submitted: ${checked.planFit.display} out_of_plan_offset must name the offsetting reduction or new budget.`,
    );

  const chain = checked.approvals.chain.map(({ name, title, step }) => ({
    name,
    title,
    step,
  }));
  const first = chain[0]?.name ?? "the department head";
  const record: StoredRequest = {
    id: nextId(),
    status: `pending: waiting on ${first}${
      chain.length > 1
        ? `, then ${chain
            .slice(1)
            .map((step) => step.name)
            .join(", then ")}`
        : ""
    }`,
    submittedAt: new Date().toISOString(),
    request: {
      ...checked.request,
      roleTitle: text(input.role_title),
      baseSalary: checked.band.proposedBase,
      startDate: checked.start.date,
      recruiting: checked.cost.fiscalYearImpact.oneTime.recruitingKind,
    },
    figures: {
      computedBy:
        "Northstar HR, from the structured inputs at submit time. Figures and approvers sent with the request are not read.",
      annualRunRate: checked.cost.annual.fullyLoaded,
      annualRunRateDisplay: checked.cost.annual.display,
      fy2027Impact: checked.cost.fiscalYearImpact.amount,
      fy2027ImpactDisplay: checked.cost.fiscalYearImpact.display,
      budgetLeftAfter: checked.budget.headroomAfter,
      budgetDisplay: checked.budget.display,
      planFit: checked.planFit.display,
      approvalChain: chain,
      approvalsDisplay: checked.approvals.display,
      policy: [
        "POL-HC-02",
        "POL-FIN-01",
        "POL-FIN-02",
        "POL-APR-01",
        "POL-APR-02",
      ],
    },
    narrative: {
      writtenBy:
        "The coworker. Stored as written; Northstar HR does not check the prose against the figures above.",
      businessCase: text(input.business_case),
      justification,
      aboveMidpointReason: text(input.above_midpoint_reason) || null,
      outOfPlanOffset: text(input.out_of_plan_offset) || null,
      productionAccess: access,
    },
    nextApprover: first,
  };
  store.set(record.id, record);
  return record;
}
