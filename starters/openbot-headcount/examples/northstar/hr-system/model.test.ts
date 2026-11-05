/**
 * The worked example in `../data/README.md`, number for number. If one of these fails, the HR
 * stand-in and the shared story disagree, and the deck, the web app and Slack would show different
 * figures for the same request.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  checkRequest,
  compBand,
  HrInputError,
  hireCost,
  loadData,
  type StoredRequest,
  submitRequest,
  teamPlan,
} from "./model";

const data = loadData();
const previousToday = process.env.NORTHSTAR_TODAY;
beforeAll(() => {
  process.env.NORTHSTAR_TODAY = "2026-11-05";
});
afterAll(() => {
  if (previousToday === undefined) delete process.env.NORTHSTAR_TODAY;
  else process.env.NORTHSTAR_TODAY = previousToday;
});

const dana = {
  team: "platform",
  level: "L5",
  location: "New York",
  start_quarter: "Q1",
  request_type: "net_new",
};

describe("Dana's request: a senior engineer in New York next quarter", () => {
  test("next quarter from the workshop date is Q1 FY2027", () => {
    expect(teamPlan(data, "platform").fiscal.nextQuarter).toBe("Q1 FY2027");
  });

  test("plan fit: 2 approved, 1 opened (REQ-2027-014), 1 left (POL-HC-02)", () => {
    const { planFit } = checkRequest(data, dana);
    expect(planFit).toMatchObject({
      inPlan: true,
      approved: 2,
      opened: 1,
      remaining: 1,
    });
    expect(JSON.stringify(planFit)).toContain("REQ-2027-014");
  });

  test("New York is Tier 1 and Platform has an office there (POL-COMP-02)", () => {
    const { location } = checkRequest(data, dana);
    expect(location).toMatchObject({ tier: "Tier 1", allowed: true });
  });

  test("band: L5 Tier 1 is $185,000 to $240,000, midpoint $212,000 (POL-COMP-01)", () => {
    expect(compBand(data, "L5", "New York").band).toEqual({
      min: 185000,
      mid: 212000,
      max: 240000,
    });
  });

  test("start Feb 1 2027, 11 months in FY2027 (POL-HC-04)", () => {
    const { start } = checkRequest(data, dana);
    expect(start.date).toBe("2027-02-01");
    expect(start.monthsInFiscalYear).toBe(11);
    expect(start.latestApprovalDate).toBe("2026-12-03");
    expect(start.leadTimeOk).toBe(true);
  });

  test("fully loaded annual $343,920 and FY2027 impact $334,260 (POL-FIN-02)", () => {
    const { cost } = checkRequest(data, dana);
    expect(cost.annual).toMatchObject({
      base: 212000,
      targetBonus: 31800,
      annualEquity: 45000,
      benefits: 38160,
      employerTaxes: 16960,
      fullyLoaded: 343920,
    });
    expect(cost.fiscalYearImpact).toMatchObject({
      proratedFullyLoaded: 315260,
      amount: 334260,
    });
    expect(cost.fiscalYearImpact.oneTime.total).toBe(19000);
    expect(cost.annualRunRate.amount).toBe(343920);
  });

  test("budget: $420,000 remaining, fits with $85,740 left (POL-FIN-01)", () => {
    const { budget } = checkRequest(data, dana);
    expect(budget).toMatchObject({
      remaining: 420000,
      fits: true,
      headroomAfter: 85740,
    });
  });

  test("approvers: Marcus then Priya, no CFO (POL-APR-01/02)", () => {
    const { approvals, readyToSubmit } = checkRequest(data, dana);
    expect(approvals.chain.map((step) => step.name)).toEqual([
      "Marcus Lee",
      "Priya Raman",
    ]);
    expect(approvals.cfoRequired).toBe(false);
    expect(readyToSubmit).toBe(true);
  });
});

describe("the live edit: base raised to $225,000", () => {
  const edited = { ...dana, base_salary: 225000 };

  test("above the midpoint, so a one-line reason is needed (POL-COMP-01)", () => {
    const result = checkRequest(data, edited);
    expect(result.band.position).toBe("above_midpoint");
    expect(result.stillNeeded.join(" ")).toContain("POL-COMP-01");
  });

  test("fully loaded $362,250 brings in Elena Ortiz (POL-APR-02)", () => {
    const { cost, approvals } = checkRequest(data, edited);
    expect(cost.annual.fullyLoaded).toBe(362250);
    expect(approvals.chain.map((step) => step.name)).toEqual([
      "Marcus Lee",
      "Priya Raman",
      "Elena Ortiz",
    ]);
  });

  test("FY2027 impact $351,063 (rounded), still inside $420,000", () => {
    const { cost, budget } = checkRequest(data, edited);
    expect(cost.fiscalYearImpact.amount).toBe(351063);
    expect(cost.fiscalYearImpact.rounded).toBe(true);
    expect(budget.fits).toBe(true);
  });
});

const justification =
  "This role unblocks the multi-region failover work for Q2. Without it, failover slips two quarters and on-call load stays on four people.";
/** Dana's request as Hana submits it: the structured inputs, the narrative, and no figures. */
const submission = {
  ...dana,
  role_title: "Senior Software Engineer",
  base_salary: 212000,
  justification,
  business_case:
    "**Headcount request: Senior Software Engineer (L5), Platform Infrastructure**\n...",
};
/** A fresh Northstar HR: an empty store and ids that start after REQ-2027-014. */
function fresh() {
  const store = new Map<string, StoredRequest>();
  let next = 14;
  const nextId = () => `REQ-2027-${String(++next).padStart(3, "0")}`;
  return { store, nextId };
}

describe("submitting: every figure of record is computed by Northstar HR", () => {
  test("records REQ-2027-015 with $343,920 / $334,260, $85,740 left, Marcus then Priya", () => {
    const { store, nextId } = fresh();
    const stored = submitRequest(data, store, submission, nextId);
    expect(stored.id).toBe("REQ-2027-015");
    expect(stored.nextApprover).toBe("Marcus Lee");
    expect(stored.figures).toMatchObject({
      annualRunRate: 343920,
      fy2027Impact: 334260,
      budgetLeftAfter: 85740,
    });
    expect(stored.figures.approvalChain.map((step) => step.name)).toEqual([
      "Marcus Lee",
      "Priya Raman",
    ]);
  });

  test("ignores figures and approvers the model sends", () => {
    const { store, nextId } = fresh();
    const stored = submitRequest(
      data,
      store,
      {
        ...submission,
        fully_loaded_annual: 310000,
        fy2027_impact: 290000,
        approvers: ["Marcus Lee"],
        budget_left: 130000,
      } as typeof submission,
      nextId,
    );
    expect(stored.figures.annualRunRate).toBe(343920);
    expect(stored.figures.fy2027Impact).toBe(334260);
    expect(stored.figures.budgetLeftAfter).toBe(85740);
    expect(stored.figures.approvalChain).toHaveLength(2);
    expect(JSON.stringify(stored)).not.toContain("310000");
    expect(JSON.stringify(stored)).not.toContain("290000");
  });

  test("the live edit at $225,000 records $362,250 / $351,063, $68,937 left, and adds Elena Ortiz", () => {
    const { store, nextId } = fresh();
    const stored = submitRequest(
      data,
      store,
      {
        ...submission,
        base_salary: 225000,
        above_midpoint_reason: "Competing offer.",
      },
      nextId,
    );
    expect(stored.figures).toMatchObject({
      annualRunRate: 362250,
      fy2027Impact: 351063,
      budgetLeftAfter: 68937,
    });
    expect(stored.figures.approvalChain.map((step) => step.name)).toEqual([
      "Marcus Lee",
      "Priya Raman",
      "Elena Ortiz",
    ]);
    expect(stored.status).toBe(
      "pending: waiting on Marcus Lee, then Priya Raman, then Elena Ortiz",
    );
  });

  test("stores the business case as the coworker's narrative, as written, prose unchecked", () => {
    const { store, nextId } = fresh();
    const prose = "**Annual run-rate** (POL-FIN-02). $310,000.";
    const stored = submitRequest(
      data,
      store,
      { ...submission, business_case: prose },
      nextId,
    );
    expect(stored.narrative.businessCase).toBe(prose);
    expect(stored.narrative.writtenBy).toContain("Stored as written");
    expect(stored.figures.annualRunRate).toBe(343920);
  });

  test("refuses a request with a required structured input missing, naming each one", () => {
    const { store, nextId } = fresh();
    const { base_salary, team, ...rest } = submission;
    expect(base_salary).toBe(212000);
    expect(team).toBe("platform");
    expect(() => submitRequest(data, store, rest as never, nextId)).toThrow(
      /missing team, base_salary/,
    );
    expect(() =>
      submitRequest(data, store, { ...submission, base_salary: "" }, nextId),
    ).toThrow(/missing base_salary/);
    expect(store.size).toBe(0);
  });

  test("refuses a base above the midpoint without a reason (POL-COMP-01)", () => {
    const { store, nextId } = fresh();
    expect(() =>
      submitRequest(
        data,
        store,
        { ...submission, base_salary: 225000 },
        nextId,
      ),
    ).toThrow(/above_midpoint_reason/);
  });

  test("refuses a one-sentence justification (POL-HC-01)", () => {
    const { store, nextId } = fresh();
    expect(() =>
      submitRequest(
        data,
        store,
        { ...submission, justification: "We need more people." },
        nextId,
      ),
    ).toThrow(/two sentences/);
  });

  test("records the security and access answers as structured fields", () => {
    const { store, nextId } = fresh();
    const stored = submitRequest(
      data,
      store,
      {
        ...submission,
        production_access: [
          { system: "production Kubernetes clusters", level: "deploy" },
          { system: "cloud accounts", level: "elevated" },
          { system: "observability", level: "read-only" },
        ],
        on_call: true,
        access_reviewer: "Jordan Blake (Head of Security), quarterly",
      },
      nextId,
    );
    expect(stored.narrative.productionAccess).toEqual({
      systems: [
        { system: "production Kubernetes clusters", level: "deploy" },
        { system: "cloud accounts", level: "elevated" },
        { system: "observability", level: "read_only" },
      ],
      onCall: true,
      reviewer: "Jordan Blake (Head of Security), quarterly",
    });
    const empty = fresh();
    expect(() =>
      submitRequest(
        data,
        empty.store,
        {
          ...submission,
          production_access: [{ system: "databases", level: "owner" }],
        },
        empty.nextId,
      ),
    ).toThrow(/read_only, deploy, elevated/);
  });
});

describe("a pending request holds its plan slot and its budget (POL-HC-02, POL-FIN-01)", () => {
  test("before any submit: 1 left (0 pending), the web app's figure", () => {
    const { planFit } = checkRequest(data, dana, []);
    expect(planFit).toMatchObject({ remaining: 1, pending: 0, inPlan: true });
    expect(planFit.display).toContain("1 left (0 pending)");
  });

  test("after one submit the same request is out of plan, adds the CFO, and no longer fits the budget", () => {
    const { store, nextId } = fresh();
    submitRequest(data, store, submission, nextId);

    const again = checkRequest(data, dana, store.values());
    expect(again.planFit).toMatchObject({
      approved: 2,
      opened: 1,
      pending: 1,
      remaining: 0,
      inPlan: false,
    });
    expect(again.planFit.display).toContain("0 left (1 pending: REQ-2027-015)");
    expect(again.approvals.cfoRequired).toBe(true);
    expect(again.approvals.chain.map((step) => step.name)).toContain(
      "Elena Ortiz",
    );
    expect(again.budget).toMatchObject({
      pending: 334260,
      remaining: 85740,
      fits: false,
    });
    expect(again.readyToSubmit).toBe(false);
  });

  test("a second identical submit is refused, and the first keeps its id", () => {
    const { store, nextId } = fresh();
    submitRequest(data, store, submission, nextId);
    expect(() => submitRequest(data, store, submission, nextId)).toThrow(
      /POL-FIN-01/,
    );
    expect([...store.keys()]).toEqual(["REQ-2027-015"]);
  });

  test("get_team_plan shows the pending request against Q1 and the budget", () => {
    const { store, nextId } = fresh();
    submitRequest(data, store, submission, nextId);
    const plan = teamPlan(data, "platform", store.values());
    expect(plan.netNewByQuarter.Q1).toMatchObject({
      approved: 2,
      opened: 1,
      pending: 1,
      remaining: 0,
      display: "0 left (1 pending)",
    });
    expect(plan.netNewByQuarter.Q2).toMatchObject({ pending: 0, remaining: 1 });
    expect(plan.budget).toMatchObject({ pending: 334260, remaining: 85740 });
  });

  test("another team's pending request does not touch Platform's plan", () => {
    const { store, nextId } = fresh();
    const other = submitRequest(
      data,
      store,
      { ...submission, team: "data", location: "San Francisco" },
      nextId,
    );
    expect(other.request.teamId).toBe("data");
    const { planFit, budget } = checkRequest(data, dana, store.values());
    expect(planFit).toMatchObject({ remaining: 1, pending: 0, inPlan: true });
    expect(budget).toMatchObject({ remaining: 420000, headroomAfter: 85740 });
  });

  test("a backfill takes no plan slot but its FY2027 impact still comes off the budget", () => {
    const { store, nextId } = fresh();
    submitRequest(
      data,
      store,
      { ...submission, request_type: "backfill" },
      nextId,
    );
    const { planFit, budget } = checkRequest(data, dana, store.values());
    expect(planFit).toMatchObject({ remaining: 1, pending: 0 });
    expect(budget).toMatchObject({ pending: 334260, fits: false });
  });
});

describe("inputs that used to be guessed are refused", () => {
  test("an empty or missing team is refused, not read as Platform", () => {
    expect(() => teamPlan(data, "")).toThrow(/No team given/);
    expect(() => teamPlan(data, undefined)).toThrow(/No team given/);
    expect(() => checkRequest(data, { ...dana, team: "  " })).toThrow(
      HrInputError,
    );
  });

  test("a team prefix needs three characters", () => {
    expect(() => teamPlan(data, "p")).toThrow(HrInputError);
    expect(teamPlan(data, "plat").team.id).toBe("platform");
    expect(teamPlan(data, "Customer").team.id).toBe("support");
  });

  test("a start date outside the start quarter is refused (POL-HC-02, POL-HC-04)", () => {
    expect(() =>
      checkRequest(data, {
        team: "support",
        level: "L3",
        location: "Austin",
        start_quarter: "Q1",
        request_type: "net_new",
        start_date: "2027-11-01",
      }),
    ).toThrow(/not in Q1 FY2027/);
    expect(
      checkRequest(data, { ...dana, start_date: "2027-03-01" }).start.date,
    ).toBe("2027-03-01");
  });
});

test("an out-of-plan request adds the CFO (Support has no Q1 net-new)", () => {
  const result = checkRequest(data, {
    team: "support",
    level: "L3",
    location: "Austin",
    start_quarter: "Q1",
    request_type: "net_new",
  });
  expect(result.planFit.inPlan).toBe(false);
  expect(result.approvals.cfoRequired).toBe(true);
});

test("hireCost refuses a start date that is not the first of a month", () => {
  expect(() =>
    hireCost(data, {
      level: "L5",
      location: "New York",
      start_quarter: "Q1",
      start_date: "2027-02-15",
    }),
  ).toThrow(HrInputError);
});
