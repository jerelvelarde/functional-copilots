// C1: a human edit made while the agent is busy is queued, never dropped, and goes out once.

import { describe, expect, it } from "vitest";
import { describeEdit, editMessage, enqueueEdit, isBusy, readEditMessage, type Edit } from "./edit-queue";

const base = (before: number, after: number): Edit => ({ draftId: "REQ-2027-021", field: "baseSalary", before, after });

describe("the edit queue", () => {
  it("describes an edit the way the agent hears it", () => {
    expect(describeEdit("baseSalary", 212_000, 225_000)).toBe("I changed base salary from $212,000 to $225,000.");
    expect(describeEdit("type", null, "net_new")).toBe("I set the request type to Net-new.");
    expect(describeEdit("justification", "", "Two sentences. Here.")).toBe('I updated the justification: "Two sentences. Here."');
  });

  it("coalesces edits to one field: the value the agent last knew, then the latest", () => {
    let queue = enqueueEdit([], base(212_000, 225_000));
    queue = enqueueEdit(queue, base(225_000, 224_000));
    expect(queue).toHaveLength(1);
    expect(editMessage(queue, "REQ-2027-021")).toBe("I changed base salary from $212,000 to $224,000.");
  });

  it("keeps one entry per field, oldest field first, in one message", () => {
    let queue = enqueueEdit([], base(212_000, 225_000));
    queue = enqueueEdit(queue, { draftId: "REQ-2027-021", field: "aboveMidpointReason", before: "", after: "Competing offer" });
    queue = enqueueEdit(queue, base(225_000, 226_000));
    expect(editMessage(queue, "REQ-2027-021")).toBe('I changed base salary from $212,000 to $226,000. I updated the reason for going above the midpoint: "Competing offer"');
  });

  it("says nothing for an edit that ended where it started, or for a request that is no longer open", () => {
    expect(editMessage(enqueueEdit(enqueueEdit([], base(212_000, 225_000)), base(225_000, 212_000)), "REQ-2027-021")).toBeNull();
    expect(editMessage([base(212_000, 225_000)], null)).toBeNull(); // submitted with the edit in it
    expect(editMessage([base(212_000, 225_000)], "REQ-2027-022")).toBeNull();
  });
});

describe("readEditMessage: the chat shows a sent edit as an event row", () => {
  it("reads one edit back into its parts", () => {
    expect(readEditMessage("I changed base salary from $212,000 to $225,000.")).toEqual([
      { kind: "changed", label: "base salary", before: "$212,000", after: "$225,000" },
    ]);
    expect(readEditMessage("I set the request type to Net-new.")).toEqual([{ kind: "set", label: "the request type", after: "Net-new" }]);
  });

  it("reads a merged message, one part per field, even when the text has periods and quotes", () => {
    let queue = enqueueEdit([], base(212_000, 226_000));
    queue = enqueueEdit(queue, { draftId: "REQ-2027-021", field: "aboveMidpointReason", before: "", after: 'Competing offer. "Firm" at $230k.' });
    queue = enqueueEdit(queue, { draftId: "REQ-2027-021", field: "level", before: "L5", after: "L6" });
    expect(readEditMessage(editMessage(queue, "REQ-2027-021")!)).toEqual([
      { kind: "changed", label: "base salary", before: "$212,000", after: "$226,000" },
      { kind: "updated", label: "the reason for going above the midpoint", text: 'Competing offer. "Firm" at $230k.' },
      { kind: "changed", label: "the level", before: "L5", after: "L6" },
    ]);
  });

  it("is null for anything a person typed", () => {
    expect(readEditMessage("I changed my mind, make it Austin.")).toBeNull();
    expect(readEditMessage("Submit it.")).toBeNull();
    expect(readEditMessage("I changed base salary from $212,000 to $225,000. Also submit it.")).toBeNull();
  });
});

describe("isBusy", () => {
  const assistantCall = (id: string) => ({ role: "assistant", toolCalls: [{ id }] });
  const result = (id: string) => ({ role: "tool", toolCallId: id });

  it("is busy while a run streams", () => {
    expect(isBusy({ isRunning: true, messages: [] })).toBe(true);
  });

  it("is busy while the approval card waits for a click (a tool call with no result)", () => {
    expect(isBusy({ isRunning: false, messages: [{ role: "user" }, assistantCall("submit-1")] })).toBe(true);
  });

  it("is busy right after a tool result, while the follow-up run is due, and idle once it is not", () => {
    const messages = [{ role: "user" }, assistantCall("submit-1"), result("submit-1")];
    expect(isBusy({ isRunning: false, messages }, true)).toBe(true);
    expect(isBusy({ isRunning: false, messages }, false)).toBe(false);
  });

  it("is idle after the reply", () => {
    expect(isBusy({ isRunning: false, messages: [{ role: "user" }, assistantCall("a"), result("a"), { role: "assistant" }] })).toBe(false);
  });
});
