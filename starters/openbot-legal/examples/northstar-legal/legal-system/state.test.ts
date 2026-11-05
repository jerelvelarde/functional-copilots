// The state Northstar Legal keeps: the Friday seed the clip starts in (slides 13 and 14, as shown), the
// fresh seed for the full review, and the file that survives a restart.

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { STATE_FILE, loadState, saveState, seedFresh, seedFriday } from "./state";

const JORDAN = "Ask Acme for their SOC 2 Type II report and latest pen-test summary before we sign. We need this whenever a vendor holds customer data.";
const directory = mkdtempSync(path.join(tmpdir(), "northstar-legal-state-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("the Friday seed", () => {
  const s = seedFriday();
  const acme = s.matters["acme-msa"];

  test("is Friday morning, after the evidence arrived", () => {
    expect(s.now.startsWith("2026-11-06")).toBe(true);
    expect(s.now > "2026-11-06T08:50").toBe(true);
  });

  test("Acme was sent back: Rachel approved, Jordan sent it back in his words, Elena is queued", () => {
    expect(acme.stage).toBe("sent_back");
    expect(acme.submittedAt?.startsWith("2026-11-05")).toBe(true);
    expect(acme.route.map((d) => [d.approverId, d.status])).toEqual([
      ["rachel", "approved"],
      ["jordan", "sent_back"],
      ["elena", "queued"],
    ]);
    expect(acme.route[0].at?.startsWith("2026-11-05")).toBe(true);
    expect(acme.route[1].at?.startsWith("2026-11-05")).toBe(true);
    expect(acme.route[1].comment).toBe(JORDAN);
    expect(acme.route[2].at).toBeNull();
  });

  test("Acme's SOC 2 Type II report and pen-test summary arrived at 08:50", () => {
    expect(acme.evidence?.receivedAt).toBe("2026-11-06T08:50");
    expect(acme.evidence?.soc2?.reportType).toBe("Type II");
    expect(acme.log.some((entry) => entry.at === "2026-11-06T08:50")).toBe(true);
  });

  test("PB-SEC-01 v1 is published, by Rachel Adler, on Thursday", () => {
    expect(s.publishedRules).toHaveLength(1);
    expect(s.publishedRules[0]).toMatchObject({ id: "PB-SEC-01", version: 1, publishedBy: "Rachel Adler" });
    expect(s.publishedRules[0].publishedAt.startsWith("2026-11-05")).toBe(true);
  });

  test("Brightwater is unreviewed", () => {
    expect(s.matters["brightwater-order-form"]).toMatchObject({ stage: "unreviewed", route: [], submittedAt: null, evidence: null });
  });

  test("each call returns a new copy, so one test cannot change another's seed", () => {
    const a = seedFriday();
    a.matters["acme-msa"].route[1].comment = "changed";
    expect(seedFriday().matters["acme-msa"].route[1].comment).toBe(JORDAN);
  });
});

describe("the fresh seed", () => {
  test("both matters unreviewed, nothing published, Thursday 10:00", () => {
    const s = seedFresh();
    expect(s.now).toBe("2026-11-05T10:00");
    expect(s.publishedRules).toEqual([]);
    for (const id of ["acme-msa", "brightwater-order-form"]) {
      expect(s.matters[id]).toMatchObject({ matterId: id, stage: "unreviewed", redlines: {}, reasons: {}, route: [], submittedAt: null, evidence: null });
    }
  });
});

describe("the state file", () => {
  test("lives beside the server", () => {
    expect(STATE_FILE).toBe(path.join(import.meta.dir, ".state.json"));
  });

  test("saveState then loadState round-trips", () => {
    const file = path.join(directory, "round-trip.json");
    const s = seedFriday();
    s.matters["acme-msa"].reasons.F9 = "A reason";
    saveState(file, s);
    expect(loadState(file)).toEqual(s);
  });

  test("a missing file loads as the Friday seed", () => {
    const file = path.join(directory, "missing.json");
    expect(existsSync(file)).toBe(false);
    expect(loadState(file)).toEqual(seedFriday());
  });

  test("a file that is not Northstar Legal state is refused with the reason, not read as empty", () => {
    const file = path.join(directory, "broken.json");
    saveState(file, { now: "2026-11-06T09:00", publishedRules: [], matters: {} });
    expect(() => loadState(file)).toThrow(/acme-msa/);
  });
});
