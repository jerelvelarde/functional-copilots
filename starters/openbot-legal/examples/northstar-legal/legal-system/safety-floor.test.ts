/**
 * Every Northstar Legal call in the clip and the full review, run through OpenBot's own safety floor
 * and approval decision.
 *
 * The floor (server/src/approvals/policy.ts) hands an action to the person, before any approval rule
 * is read, when the words of its tool, its arguments or its target match a fixed list about
 * credentials, security settings and payments. For a server added by URL every tool is a write, so
 * lookups are checked too, and the target includes the server's address. A hand-off is never run: the
 * Contract Copilot would get no status, no evidence check and no resubmit. That is why the arguments
 * carry finding refs ("F3"), never rule ids: "PB-PAY-01" reads as a payment.
 *
 * This asks OpenBot's real functions, so it runs only inside an OpenBot clone (the package copied to
 * examples/northstar-legal, as the README says) and is skipped anywhere else.
 */
import { describe, expect, test } from "bun:test";
import { RULES } from "./connect";
import { TOOLS } from "./tools";

type Candidate = { actorId?: string; botId: string; toolRef: string; effect: string; scope: string; args: unknown; target: unknown };
type Floor = (candidate: Candidate) => { id: string; behaviour: "hand_off" | "ask" } | undefined;
type Decide = (input: {
  candidate: Candidate;
  team: readonly unknown[];
  personal: readonly unknown[];
  customRulesEnabled: boolean;
  autoReview: boolean;
  askBeforeChanges: boolean;
}) => Promise<{ behaviour: string; source: string }>;

const policy = (await import("../../../server/src/approvals/policy").catch(() => null)) as { safetyRequirement?: Floor; decideAction?: Decide } | null;
const floor = policy?.safetyRequirement;

const URL_ = "https://calm-river-mild-sun.trycloudflare.com/mcp";
const candidate = (tool: string, args: unknown, url = URL_): Candidate => ({
  actorId: "maya",
  botId: "contract-copilot",
  toolRef: `northstar-legal/${tool}`,
  effect: "write",
  scope: "northstar-legal",
  args,
  target: { serverId: "northstar-legal", toolName: tool, url, effect: "write" },
});
const floorSays = (tool: string, args: unknown, url = URL_) => floor?.(candidate(tool, args, url));

const ACME = { matterId: "acme-msa" };
/** The clip's calls (beats 1 to 3), then the full review's, with the arguments a model sends. */
const CALLS: [string, Record<string, unknown>][] = [
  ["list_matters", {}],
  ["get_approval_status", ACME],
  ["check_security_evidence", ACME],
  ["resubmit_for_approval", ACME],
  ["get_matter", ACME],
  ["review_contract", ACME],
  ["propose_plan", ACME],
  ["propose_plan", { matterId: "brightwater-order-form" }],
  ["read_passage", { ...ACME, passage: "§8.2" }],
  ["set_redline", { ...ACME, ref: "F1", text: "Supplier's total liability shall not exceed the fees paid in the 12 months before the claim." }],
  [
    "set_redline",
    {
      ...ACME,
      ref: "F3",
      text: "Each party's total liability arising out of or relating to this Agreement will not exceed the fees paid by Northstar in the six (6) months before the event giving rise to the claim, except that liability for data-protection breaches is capped at $1,000,000.",
    },
  ],
  ["set_reason", { ...ACME, ref: "F2", reason: "Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about." }],
  ["set_reason", { ...ACME, ref: "F3", reason: "Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about." }],
  ["send_for_approval", ACME],
];

describe.skipIf(!floor)("OpenBot's safety floor lets the demo run", () => {
  test("the check is wired: a rule id in the arguments, or a tunnel name with a floor word, is handed off", () => {
    // Why tool arguments carry finding refs: the rule id reads as a payment.
    expect(floorSays("set_reason", { ...ACME, ruleId: "PB-PAY-01", reason: "Net 30 is fine." })).toMatchObject({ id: "payments", behaviour: "hand_off" });
    expect(floorSays("get_approval_status", ACME, "https://a-wire-b.trycloudflare.com/mcp")).toMatchObject({ id: "payments", behaviour: "hand_off" });
  });

  test("no call in the clip or the full review is handed off", () => {
    for (const [tool, args] of CALLS) expect(floorSays(tool, args)?.behaviour, `${tool} ${JSON.stringify(args)}`).not.toBe("hand_off");
  });

  test("the status and the evidence check do not even ask", () => {
    expect(floorSays("get_approval_status", ACME)).toBeUndefined();
    expect(floorSays("check_security_evidence", ACME)).toBeUndefined();
    expect(floorSays("list_matters", {})).toBeUndefined();
    // The resubmit asks because of the team rule (below), not the floor.
    expect(floorSays("resubmit_for_approval", ACME)).toBeUndefined();
  });

  test("the floor itself asks before send_for_approval, by its name", () => {
    expect(floorSays("send_for_approval", ACME)).toMatchObject({ id: "sending", behaviour: "ask" });
  });

  test("every tool, on either matter, passes with only its matter id", () => {
    for (const tool of TOOLS)
      for (const matterId of ["acme-msa", "brightwater-order-form"]) expect(floorSays(tool.name, { matterId })?.behaviour, `${tool.name} ${matterId}`).not.toBe("hand_off");
  });

  test("the limit, pinned: a person's clause about paying or a refund is handed to the person", () => {
    // Acme's drafted redlines for F2 (net 45: "will pay each undisputed invoice") and F9 (termination:
    // "will refund, pro rata, any prepaid fees") would be, if a person sent them back as their own text.
    expect(floorSays("set_redline", { ...ACME, ref: "F2", text: "Northstar will pay each undisputed invoice within forty-five (45) days of the invoice date." })?.behaviour).toBe("hand_off");
    expect(floorSays("set_redline", { ...ACME, ref: "F9", text: "Acme will refund, pro rata, any prepaid fees for the period after termination." })?.behaviour).toBe("hand_off");
  });
});

describe.skipIf(!policy?.decideAction)("connect.ts's team rules: only sending and resubmitting ask", () => {
  const team = RULES.map((rule, i) => ({ id: `rule-${i}`, botId: "contract-copilot", toolRef: rule.toolRef, effect: "*", scope: "*", behaviour: rule.behaviour, revokedAt: null, createdAt: new Date(), createdBy: null }));

  test("with the person's 'ask before changes' on, every tool but the two runs; those two ask", async () => {
    const decide = policy!.decideAction!;
    const outcomes: Record<string, string> = {};
    for (const tool of TOOLS) {
      const decision = await decide({ candidate: candidate(tool.name, ACME), team, personal: [], customRulesEnabled: true, autoReview: false, askBeforeChanges: true });
      outcomes[tool.name] = `${decision.behaviour} (${decision.source})`;
    }
    expect(outcomes).toEqual({
      list_matters: "allow (team_rule)",
      get_matter: "allow (team_rule)",
      read_passage: "allow (team_rule)",
      propose_plan: "allow (team_rule)",
      review_contract: "allow (team_rule)",
      set_redline: "allow (team_rule)",
      set_reason: "allow (team_rule)",
      send_for_approval: "ask (safety)",
      get_approval_status: "allow (team_rule)",
      check_security_evidence: "allow (team_rule)",
      resubmit_for_approval: "ask (team_rule)",
    });
  });
});

test("the floor check is skipped only outside an OpenBot clone", () => {
  // Outside a clone there is nothing to ask; inside one, the import above must have worked.
  expect(typeof floor === "function" || policy === null).toBe(true);
});
