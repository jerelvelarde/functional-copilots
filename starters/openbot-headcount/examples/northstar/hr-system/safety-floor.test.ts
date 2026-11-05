/**
 * Every Northstar HR call in the demo, run through OpenBot's own safety floor.
 *
 * The floor (server/src/approvals/policy.ts) hands an action to the person, before any approval rule
 * is read, when the words of its tool, its arguments or its target match a fixed list about
 * credentials, security settings and payments. For a server added by URL every tool is a write, so
 * lookups are checked too, and the target includes the server's address. A hand-off is never run:
 * Hana would produce no figures, or no request id.
 *
 * This asks OpenBot's real function, so it runs only inside an OpenBot clone (the package copied to
 * examples/northstar, as the README says) and is skipped anywhere else.
 */
import { describe, expect, test } from "bun:test";

type Candidate = {
  botId: string;
  toolRef: string;
  effect: string;
  scope: string;
  args: unknown;
  target: unknown;
};
type Floor = (candidate: Candidate) => { id: string } | undefined;

const policy = (await import("../../../server/src/approvals/policy").catch(
  () => null,
)) as { safetyRequirement?: Floor } | null;
const floor = policy?.safetyRequirement;

const URL_ = "https://calm-river-mild-sun.trycloudflare.com/mcp";
function handOff(tool: string, args: unknown, url = URL_) {
  return floor?.({
    botId: "headcount-copilot",
    toolRef: `northstar-hr/${tool}`,
    effect: "write",
    scope: "northstar-hr",
    args,
    target: { serverId: "northstar-hr", toolName: tool, url, effect: "write" },
  });
}

const request = {
  team: "platform",
  level: "L5",
  location: "New York",
  start_quarter: "Q1",
  request_type: "net_new",
};
const businessCase = [
  "**Headcount request: Senior Software Engineer (L5), Platform Infrastructure**",
  "**Summary.** One L5 Senior Software Engineer in New York, starting 2027-02-01 (Q1 FY2027). Asking for approval.",
  "**Why now** (POL-HC-01). It unblocks the multi-region failover work we committed for Q2. Without it, failover slips at least two quarters and on-call stays on four people.",
  "**Security and access.** Production Kubernetes clusters: deploy. Cloud accounts: elevated. CI/CD: deploy. Databases: read-only. Observability: read-only. On-call: yes. Jordan Blake (Head of Security) reviews the access quarterly.",
  "**Compensation** (POL-COMP-01). Band $185,000 to $240,000, midpoint $212,000. Proposed base $225,000: competing offer.",
  "**Annual run-rate** (POL-FIN-02). 225,000 + 33,750 bonus + 45,000 equity + 40,500 benefits + 18,000 taxes = $362,250",
  "**FY2027 impact** (POL-FIN-01, POL-FIN-02). 362,250 x 11/12 = 332,062.5, plus 19,000 one-time = $351,063 (rounded)",
  "**Budget** (POL-FIN-01). $420,000 remaining. Fits, leaving $68,937.",
  "**Approvals** (POL-APR-01, POL-APR-02). Marcus Lee (VP Engineering), then Priya Raman (Finance Business Partner), then Elena Ortiz (CFO): fully loaded is above $350,000.",
  "**Open items.** None",
].join("\n");

describe.skipIf(!floor)("OpenBot's safety floor lets the demo run", () => {
  test("the check is wired: a word on the floor's list is handed off", () => {
    expect(
      handOff("submit_headcount_request", {
        above_midpoint_reason: "Competing offer with better pay.",
      })?.id,
    ).toBe("payments");
    expect(
      handOff(
        "get_team_plan",
        { team: "platform" },
        "https://a-wire-b.trycloudflare.com/mcp",
      )?.id,
    ).toBe("payments");
  });

  test("every lookup in steps 1 to 3 runs", () => {
    expect(handOff("get_team_plan", { team: "platform" })).toBeUndefined();
    expect(
      handOff("get_comp_band", { level: "L5", location: "New York" }),
    ).toBeUndefined();
    expect(
      handOff("calculate_hire_cost", { ...request, base_salary: 225000 }),
    ).toBeUndefined();
    expect(
      handOff("check_request", { ...request, base_salary: 225000 }),
    ).toBeUndefined();
    expect(
      handOff("get_request_status", { id: "REQ-2027-015" }),
    ).toBeUndefined();
  });

  test("the step 4 submit runs, Security and access answers included", () => {
    // Keys in the order a model may send them: an argument ending in "account" next to a key
    // starting with "security" once read as "account security" and handed the submit off.
    expect(
      handOff("submit_headcount_request", {
        role_title: "Senior Software Engineer",
        ...request,
        base_salary: 225000,
        justification:
          "It unblocks the multi-region failover work we committed for Q2. Without it, failover slips at least two quarters and on-call stays on four people.",
        above_midpoint_reason: "Competing offer.",
        production_access: [
          { system: "production Kubernetes clusters", level: "deploy" },
          { system: "cloud account", level: "elevated" },
          { system: "CI/CD", level: "deploy" },
          { system: "databases", level: "read_only" },
          { system: "observability", level: "read_only" },
        ],
        on_call: true,
        access_reviewer: "Jordan Blake (Head of Security), quarterly",
        business_case: businessCase,
      }),
    ).toBeUndefined();
  });
});

test("the floor check is skipped only outside an OpenBot clone", () => {
  // Outside a clone there is nothing to ask; inside one, the import above must have worked.
  expect(typeof floor === "function" || policy === null).toBe(true);
});
