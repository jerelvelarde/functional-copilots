import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Decision } from "@/lib/learning";
import { decidedOn } from "./RecentRequests";

const history: Decision[] = readFileSync(join(process.cwd(), "src/data/approval-history.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const finalApproval = (id: string) => history.filter((d) => d.id === id).at(-1)!;

describe("decidedOn", () => {
  it("dates an approval by when it landed, not when the request was resubmitted", () => {
    expect(decidedOn(finalApproval("REQ-2026-071"))).toBe("2026-05-14"); // resubmitted May 11, 3 days
    expect(decidedOn(finalApproval("REQ-2026-093"))).toBe("2026-07-11"); // resubmitted Jul 9, 2 days
    expect(decidedOn(finalApproval("REQ-2026-117"))).toBe("2026-09-18"); // resubmitted Sep 16, 2 days
  });

  it("returns null when the history has no decision time", () => {
    expect(decidedOn({ ...finalApproval("REQ-2026-071"), cycleDays: null })).toBeNull();
  });
});
