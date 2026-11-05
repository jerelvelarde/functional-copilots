// Northstar Legal's eleven tools, called the way the MCP server calls them: every number, finding,
// route and evidence result in the clip and in the full review, and every refusal.

import { describe, expect, test } from "bun:test";
import { recheckRedline } from "./lib/review";
import { contracts } from "./lib/testing";
import { findPassage } from "./lib/contract";
import { type LegalState, seedFresh, seedFriday } from "./state";
import { TOOLS, callTool, evidenceSummary, whenText } from "./tools";

const JORDAN = "Ask Acme for their SOC 2 Type II report and latest pen-test summary before we sign. We need this whenever a vendor holds customer data.";
const RESUBMITTED = "Resubmitted to Jordan Blake with the evidence. Elena Ortiz is next. Nothing goes to Acme Cloud until all three approve.";
/** Maya's §8.2 clause from step 3 of the web app demo. */
const MAYA =
  "Each party's total liability arising out of or relating to this Agreement will not exceed the fees paid by Northstar in the six (6) months before the event giving rise to the claim, except that liability for data-protection breaches is capped at $1,000,000.";
const ACME = { matterId: "acme-msa" };
const BRIGHTWATER = { matterId: "brightwater-order-form" };

// biome-ignore lint/suspicious/noExplicitAny: tool results are JSON the model reads; the tests read them the same way.
type Result = any;
const call = (state: LegalState, name: string, args: Record<string, unknown> = {}) => callTool(state, name, args) as { result: Result; state: LegalState };

describe("the tool list", () => {
  test("has the eleven tools, the four that change state marked as writes", () => {
    expect(TOOLS.map((t) => t.name)).toEqual([
      "list_matters",
      "get_matter",
      "read_passage",
      "propose_plan",
      "review_contract",
      "set_redline",
      "set_reason",
      "send_for_approval",
      "get_approval_status",
      "check_security_evidence",
      "resubmit_for_approval",
    ]);
    expect(TOOLS.filter((t) => t.writes).map((t) => t.name)).toEqual(["set_redline", "set_reason", "send_for_approval", "resubmit_for_approval"]);
    for (const tool of TOOLS) {
      expect(tool.description.length, tool.name).toBeGreaterThan(40);
      expect(tool.inputSchema.type, tool.name).toBe("object");
    }
  });

  test("every argument is a matter id, a passage id, a finding ref or the person's own text: never a rule id", () => {
    const names = TOOLS.flatMap((t) => Object.keys((t.inputSchema.properties ?? {}) as object));
    expect([...new Set(names)].sort()).toEqual(["matterId", "passage", "reason", "ref", "text"]);
    expect(TOOLS.find((t) => t.name === "list_matters")!.inputSchema.required ?? []).toEqual([]);
  });
});

describe("the queue and the matter", () => {
  test("list_matters gives each matter's stage", () => {
    const { result } = call(seedFriday(), "list_matters");
    expect(result.ok).toBe(true);
    expect(result.matters.map((m: Result) => [m.matterId, m.stage])).toEqual([
      ["acme-msa", "sent_back"],
      ["brightwater-order-form", "unreviewed"],
    ]);
  });

  test("get_matter: 14 sections, 1,801 words, $240,000 a year for 36 months, $720,000", () => {
    const { result } = call(seedFresh(), "get_matter", ACME);
    expect(result).toMatchObject({ ok: true, matterId: "acme-msa", vendor: "Acme Cloud", kind: "Master Services Agreement", sectionCount: 14, words: 1801, annualFee: 240000, initialTermMonths: 36, totalContractValue: 720000 });
    expect(result.sections[7]).toMatchObject({ number: 8, title: "Limitation of liability" });
    expect(result.sections[7].passages).toContain("§8.2");
  });

  test("read_passage quotes Acme's §8.2 word for word", () => {
    const { result } = call(seedFriday(), "read_passage", { ...ACME, passage: "§8.2" });
    expect(result).toMatchObject({ ok: true, passage: "§8.2", caption: "Cap", text: findPassage(contracts["acme-msa"], "§8.2")!.text });
    expect(result.text).toContain("three (3) months");
    expect(call(seedFriday(), "read_passage", { ...ACME, passage: "8.2" }).result.passage).toBe("§8.2");
  });
});

describe("the plan", () => {
  test("17 tasks for Brightwater before PB-SEC-01 is published, 18 after, the learned one with its rule", () => {
    expect(call(seedFresh(), "propose_plan", BRIGHTWATER).result.tasks).toHaveLength(17);
    const { result } = call(seedFriday(), "propose_plan", BRIGHTWATER);
    expect(result.tasks).toHaveLength(18);
    expect(result.tasks[8]).toMatchObject({ n: 9, title: "Request the SOC 2 Type II report and pen-test summary", rules: ["PB-SEC-01"], learned: "PB-SEC-01 v1, learned" });
    expect(result.tasks[17].title).toBe("Send the redline package to Brightwater (only after every approval)");
  });
});

describe("the review", () => {
  for (const [seed, make] of [
    ["Thursday, before PB-SEC-01", seedFresh],
    ["Friday, with PB-SEC-01 published", seedFriday],
  ] as const) {
    test(`Acme on ${seed}: 7 deviations, 3 high (§8.2, §6.1, §6.4), 5 passes, $720,000, Rachel → Jordan → Elena`, () => {
      const { result } = call(make(), "review_contract", ACME);
      expect(result.ok).toBe(true);
      expect(result.counts).toMatchObject({ deviations: 7, high: 3, passes: 5 });
      const high = result.findings.filter((f: Result) => f.status === "deviation" && f.risk === "high").map((f: Result) => f.cite);
      expect(high.sort()).toEqual(["§6.1", "§6.4", "§8.2"]);
      expect(result.totalContractValue).toBe(720000);
      expect(result.route.map((s: Result) => s.name)).toEqual(["Rachel Adler", "Jordan Blake", "Elena Ortiz"]);
    });
  }

  test("findings carry refs F1… in review order, each with its rule id in the result only", () => {
    const { result } = call(seedFresh(), "review_contract", ACME);
    expect(result.findings.map((f: Result) => f.ref)).toEqual(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"]);
    expect(result.findings[2]).toMatchObject({ ref: "F3", ruleId: "PB-LIAB-01", cite: "§8.2", status: "deviation", risk: "high" });
  });

  test("on Friday PB-SEC-01's request is F13 and Maya's §8.2 clause is the one on file, with her reason", () => {
    const { result } = call(seedFriday(), "review_contract", ACME);
    expect(result.counts.requests).toBe(1);
    expect(result.findings[12]).toMatchObject({ ref: "F13", ruleId: "PB-SEC-01", status: "request", learned: "PB-SEC-01 v1" });
    expect(result.findings[2]).toMatchObject({ redline: MAYA, redlineBy: "person", recheck: { meets: false }, needsReason: false });
  });
});

describe("redlines and reasons", () => {
  test("set_redline on the §8.2 finding keeps the person's clause and returns the re-check", () => {
    const fresh = seedFresh();
    const { result, state } = call(fresh, "set_redline", { ...ACME, ref: "F3", text: MAYA });
    expect(result).toMatchObject({ ok: true, ref: "F3", cite: "§8.2", recheck: recheckRedline("PB-LIAB-01", MAYA), needsReason: true });
    expect(result.recheck.detail).toBe("Cap at 6 months of fees, with a $1,000,000 cap for data-protection breaches; PB-LIAB-01 asks for at least 12 months");
    expect(state.matters["acme-msa"].redlines.F3).toBe(MAYA);
    expect(state.matters["acme-msa"].stage).toBe("reviewed");
    expect(fresh.matters["acme-msa"].redlines).toEqual({});
  });

  test("set_redline refuses a finding that passes, and empty text", () => {
    const fresh = seedFresh();
    const pass = call(fresh, "set_redline", { ...ACME, ref: "F4", text: "Anything." });
    expect(pass.result.ok).toBe(false);
    expect(pass.result.error).toContain("F4");
    expect(pass.state).toBe(fresh);
    expect(call(fresh, "set_redline", { ...ACME, ref: "F3", text: "  " }).result.ok).toBe(false);
  });

  test("send_for_approval refuses while a deviation kept below the playbook has no reason, then sends", () => {
    let s = call(seedFresh(), "set_redline", { ...ACME, ref: "F3", text: MAYA }).state;
    const refused = call(s, "send_for_approval", ACME);
    expect(refused.result.ok).toBe(false);
    expect(refused.result.error).toContain("F3");
    expect(refused.result.error).toContain("Rachel Adler");
    expect(refused.state).toBe(s);

    s = call(s, "set_reason", { ...ACME, ref: "F3", reason: "Acme won't go above 6 months. The $1M data-breach cap covers the exposure we care about." }).state;
    const sent = call(s, "send_for_approval", ACME);
    expect(sent.result.ok).toBe(true);
    expect(sent.result.route.map((d: Result) => [d.name, d.status])).toEqual([
      ["Rachel Adler", "pending"],
      ["Jordan Blake", "queued"],
      ["Elena Ortiz", "queued"],
    ]);
    expect(sent.result.message).toContain("Nothing goes to Acme Cloud until all three approve.");
    expect(sent.state.matters["acme-msa"]).toMatchObject({ stage: "submitted", submittedAt: "2026-11-05T10:00" });
    expect(call(sent.state, "send_for_approval", ACME).result.ok).toBe(false);
  });

  test("set_redline and set_reason refuse once the review is with the approvers", () => {
    const friday = seedFriday();
    const { result, state } = call(friday, "set_reason", { ...ACME, ref: "F3", reason: "Changed my mind." });
    expect(result.ok).toBe(false);
    expect(state).toBe(friday);
  });
});

describe("Friday morning: status, evidence, resubmit", () => {
  test("get_approval_status: Rachel approved, Jordan's words verbatim, Elena queued, the evidence arrived at 08:50", () => {
    const { result } = call(seedFriday(), "get_approval_status", ACME);
    expect(result.ok).toBe(true);
    expect(result.stage).toBe("sent_back");
    expect(result.route.map((d: Result) => [d.name, d.title, d.status])).toEqual([
      ["Rachel Adler", "General Counsel", "approved"],
      ["Jordan Blake", "Head of Security", "sent_back"],
      ["Elena Ortiz", "Chief Financial Officer", "queued"],
    ]);
    expect(result.route[1].comment).toBe(JORDAN);
    expect(result.route[1].at.startsWith("2026-11-05")).toBe(true);
    expect(result.arrivedSince).toEqual([
      { what: "Acme Cloud's SOC 2 Type II report and pen-test summary", at: "2026-11-06T08:50", when: "Fri Nov 6, 8:50 am" },
    ]);
    expect(result.next).toContain("Jordan Blake");
  });

  test("get_approval_status says each decision in words, so the copilot never formats one", () => {
    const { result } = call(seedFriday(), "get_approval_status", ACME);
    expect(result.route.map((d: Result) => [d.label, d.when])).toEqual([
      ["Approved", "Thu Nov 5, 11:20 am"],
      ["Sent back", "Thu Nov 5, 2:05 pm"],
      ["Queued", null],
    ]);
  });

  test("whenText says noon and midnight as 12", () => {
    expect(whenText("2026-11-06T12:00")).toBe("Fri Nov 6, 12:00 pm");
    expect(whenText("2026-11-06T00:05")).toBe("Fri Nov 6, 12:05 am");
    expect(whenText(null)).toBeNull();
  });

  test("check_security_evidence sums itself up in one sentence, passing or failing", () => {
    expect(call(seedFriday(), "check_security_evidence", ACME).result.summary).toBe("All 4 PB-SEC-01 checks pass.");
    expect(
      evidenceSummary([
        { check: "SOC 2 Type II report on file", status: "pass" },
        { check: "Audit period ended within 12 months", status: "fail" },
        { check: "Pen test completed within 12 months", status: "pass" },
        { check: "No open critical or high findings", status: "fail" },
      ]),
    ).toBe("2 of 4 PB-SEC-01 checks fail: Audit period ended within 12 months; No open critical or high findings.");
  });

  test("check_security_evidence passes all four lines against PB-SEC-01 v1, published by Rachel Adler", () => {
    const { result } = call(seedFriday(), "check_security_evidence", ACME);
    expect(result).toMatchObject({ ok: true, rule: "PB-SEC-01 v1", publishedBy: "Rachel Adler", passed: true });
    expect(result.lines).toHaveLength(4);
    expect(result.lines.every((l: Result) => l.status === "pass" && l.rule === "PB-SEC-01")).toBe(true);
  });

  test("check_security_evidence refuses before PB-SEC-01 is published", () => {
    const { result } = call(seedFresh(), "check_security_evidence", ACME);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("PB-SEC-01");
  });

  test("resubmit_for_approval refuses on a matter never sent back", () => {
    const fresh = seedFresh();
    const { result, state } = call(fresh, "resubmit_for_approval", ACME);
    expect(result.ok).toBe(false);
    expect(state).toBe(fresh);
  });

  test("resubmit_for_approval refuses while the evidence fails, naming the failing line", () => {
    const friday = seedFriday();
    const evidence = friday.matters["acme-msa"].evidence!;
    friday.matters["acme-msa"].evidence = { ...evidence, soc2: { ...evidence.soc2!, reportType: "Type I" } };
    const { result, state } = call(friday, "resubmit_for_approval", ACME);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("SOC 2 Type II report on file");
    expect(state).toBe(friday);
    expect(state.matters["acme-msa"].stage).toBe("sent_back");
  });

  test("resubmit_for_approval goes back to Jordan with the evidence, Elena still queued, and says so exactly", () => {
    const friday = seedFriday();
    const { result, state } = call(friday, "resubmit_for_approval", ACME);
    expect(result.ok).toBe(true);
    expect(result.message).toBe(RESUBMITTED);
    const acme = state.matters["acme-msa"];
    expect(acme.stage).toBe("resubmitted");
    expect(acme.route.map((d) => [d.approverId, d.status])).toEqual([
      ["rachel", "approved"],
      ["jordan", "pending"],
      ["elena", "queued"],
    ]);
    expect(acme.log.length).toBe(friday.matters["acme-msa"].log.length + 1);
    expect(acme.log.at(-1)).toMatchObject({ at: friday.now, by: "Maya Chen" });
    expect(friday.matters["acme-msa"].stage).toBe("sent_back");

    const again = call(state, "resubmit_for_approval", ACME);
    expect(again.result.ok).toBe(false);
    expect(again.result.error).toContain("Jordan Blake");
    expect(again.state).toBe(state);
  });
});

describe("bad input is refused with the valid ids, never thrown", () => {
  test("an unknown matter names the matter ids", () => {
    const friday = seedFriday();
    for (const name of TOOLS.map((t) => t.name).filter((n) => n !== "list_matters")) {
      const { result, state } = call(friday, name, { matterId: "globex-msa", passage: "§8.2", ref: "F3", text: "x", reason: "x" });
      expect(result.ok, name).toBe(false);
      expect(result.error, name).toContain("acme-msa");
      expect(result.error, name).toContain("brightwater-order-form");
      expect(state, name).toBe(friday);
    }
    expect(call(friday, "get_matter", {}).result.error).toContain("acme-msa");
  });

  test("an unknown passage names the passage ids", () => {
    const { result } = call(seedFriday(), "read_passage", { ...ACME, passage: "§99.1" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("§8.2");
    expect(result.error).toContain("§14.1");
  });

  test("an unknown finding ref names the refs", () => {
    const friday = seedFresh();
    for (const [name, extra] of [
      ["set_redline", { text: "x" }],
      ["set_reason", { reason: "x" }],
    ] as const) {
      const { result, state } = call(friday, name, { ...ACME, ref: "PB-PAY-01", ...extra });
      expect(result.ok, name).toBe(false);
      expect(result.error, name).toContain("F1");
      expect(result.error, name).toContain("F12");
      expect(state, name).toBe(friday);
    }
  });

  test("an unknown tool names the tools", () => {
    const { result } = call(seedFriday(), "delete_matter", ACME);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("resubmit_for_approval");
  });
});
