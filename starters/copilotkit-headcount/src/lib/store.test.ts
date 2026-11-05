// The rules the store enforces in code: a new hire never overwrites an open request, the agent never
// overwrites a value the user set, a saved demo that no longer matches the data is discarded, and a
// published skill blocks submission until its section is filled.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORY_DATE, type HeadcountRequest } from "./headcount";
import {
  agentUpdate,
  appStore,
  approvedInSession,
  createDraft,
  evaluateInApp,
  publishSkill,
  recordDecision,
  reopenRequest,
  resetStoreForTests,
  startRequest,
  submitDraft,
  updateDraft,
  validateSavedState,
} from "./store";
import type { SkillProposal } from "./learning";

const newYork = {
  roleTitle: "Senior Software Engineer",
  level: "L5",
  location: "New York",
  startQuarter: "Q1",
  baseSalary: 212_000,
} as const;
const details = {
  type: "net_new",
  justification: "It unblocks the multi-region failover work planned for Q2. Without it, on-call stays on four people and failover slips to Q4.",
} as const;
const austin = { roleTitle: "Senior Site Reliability Engineer", level: "L5", location: "Austin", startQuarter: "Q2", baseSalary: 195_000 } as const;

const skill: SkillProposal = {
  id: "skill-security-access",
  reason: "security_access",
  title: "Security and access justification for Platform Infrastructure roles",
  teamId: "platform",
  markdown: "# Skill",
  requires: { field: "securityAccess", label: "Security and access", asks: "which systems, what access level, who reviews it" },
  evidence: [],
};

const state = () => appStore.getState();

beforeEach(() => resetStoreForTests());

describe("startRequest: a new hire never overwrites an open request (M3)", () => {
  it("starts REQ-2027-021 when nothing is open", () => {
    const result = startRequest(newYork);
    expect(result).toMatchObject({ started: true, requestId: "REQ-2027-021" });
    expect(state().editedBy.level).toBe("agent");
  });

  it("refuses while another request is open, and changes nothing in it", () => {
    startRequest(newYork);
    const before = state().draft;
    const result = startRequest(austin);
    expect(result.started).toBe(false);
    if (!result.started) {
      expect(result.openRequestId).toBe("REQ-2027-021");
      expect(result.reason).toContain("REQ-2027-021 (Senior Software Engineer, L5, New York) is still open");
      expect(result.reason).toMatch(/submit it, discard it .* or keep editing it/);
    }
    expect(state().draft).toBe(before);
    expect(state().nextRequestNumber).toBe(22);
  });

  it("reuses an empty draft from Start a blank request", () => {
    createDraft();
    expect(startRequest(austin)).toMatchObject({ started: true, requestId: "REQ-2027-021" });
  });

  it("the reopen-before-step-7 case: a reopened sent-back request is never rewritten into the Austin hire", () => {
    startRequest(newYork);
    agentUpdate(details);
    updateDraft({ baseSalary: 225_000 }, "human");
    agentUpdate({ aboveMidpointReason: "Competing offer at $230,000" });
    submitDraft("copilot");
    recordDecision("REQ-2027-021", "approved", "");
    recordDecision("REQ-2027-021", "sent_back", "What production access does this role get? Security will ask.");
    reopenRequest("REQ-2027-021");
    publishSkill(skill);

    const reopened = state().draft;
    const result = startRequest({ ...austin, securityAccess: "Systems: production Kubernetes." });
    expect(result.started).toBe(false);
    if (!result.started) expect(result.reason).toContain("sent back by Priya Raman");
    expect(state().draft).toBe(reopened);
    expect(state().draft).toMatchObject({ id: "REQ-2027-021", roleTitle: "Senior Software Engineer", location: "New York", baseSalary: 225_000 });
    expect(state().sentBack?.comment).toBe("What production access does this role get? Security will ask.");
  });
});

describe("agentUpdate: never overwrite a value the user set (M5)", () => {
  it("leaves a field the user set and says so; writes the rest", () => {
    startRequest(newYork);
    updateDraft({ baseSalary: 225_000 }, "human");
    const result = agentUpdate({ baseSalary: 230_000, aboveMidpointReason: "Competing offer at $230,000" });
    expect(result).toMatchObject({ ok: true, changed: ["aboveMidpointReason"], refused: [{ field: "baseSalary", userValue: 225_000, proposed: 230_000 }] });
    expect(state().draft?.baseSalary).toBe(225_000);
    expect(state().editedBy.baseSalary).toBe("human");
  });

  it("writes it when the user asked", () => {
    startRequest(newYork);
    updateDraft({ baseSalary: 225_000 }, "human");
    expect(agentUpdate({ baseSalary: 230_000 }, true)).toMatchObject({ ok: true, changed: ["baseSalary"], refused: [] });
    expect(state().draft?.baseSalary).toBe(230_000);
  });

  it("the same value is not a change, so it is not refused", () => {
    startRequest(newYork);
    updateDraft({ baseSalary: 225_000 }, "human");
    expect(agentUpdate({ baseSalary: 225_000 })).toMatchObject({ ok: true, changed: [], refused: [] });
  });

  it("needs an open request: it never starts one", () => {
    expect(agentUpdate(newYork)).toEqual({ ok: false, error: "No request is open. Use startRequest for a new hire." });
    expect(state().draft).toBeNull();
  });
});

describe("published skills and approvals feed the policy check", () => {
  it("a published skill blocks submit until its section is filled, citing the skill's id and version (M2)", () => {
    publishSkill(skill);
    startRequest(austin);
    agentUpdate(details);
    const evaluation = evaluateInApp(state(), state().draft!);
    expect(evaluation.results.at(-1)).toMatchObject({ ruleId: "skill-security-access v1", status: "missing" });
    expect(() => submitDraft("panel")).toThrow(/skill-security-access v1/);

    updateDraft({ securityAccess: "Production Kubernetes, read-only at first; Jordan Blake reviews quarterly." }, "human");
    expect(submitDraft("panel").request.id).toBe("REQ-2027-021");
  });

  it("publishing the same skill again bumps its version", () => {
    publishSkill(skill);
    publishSkill(skill);
    expect(state().publishedSkills.map((s) => s.version)).toEqual([2]);
  });

  it("only fully approved requests are committed: sent back is not (POL-FIN-01)", () => {
    startRequest(newYork);
    agentUpdate(details);
    submitDraft("copilot");
    recordDecision("REQ-2027-021", "approved", "");
    expect(approvedInSession(state(), "platform")).toBe(0); // one of two approvals
    recordDecision("REQ-2027-021", "sent_back", "Security?");
    expect(approvedInSession(state(), "platform")).toBe(0);

    resetStoreForTests();
    startRequest(newYork);
    agentUpdate(details);
    submitDraft("copilot");
    recordDecision("REQ-2027-021", "approved", "");
    recordDecision("REQ-2027-021", "approved", "");
    expect(approvedInSession(state(), "platform")).toBe(334_260);
  });

  it("stamps the submission and decisions on the story clock (m15)", () => {
    startRequest(newYork);
    agentUpdate(details);
    const submitted = submitDraft("panel");
    expect(submitted.submittedAt.slice(0, 10)).toBe(STORY_DATE);
    recordDecision(submitted.request.id, "approved", "");
    expect(state().requests[0].decisions[0].at.slice(0, 10)).toBe(STORY_DATE);
  });
});

describe("the saved demo is validated on load (M4)", () => {
  const saved = (patch: Partial<HeadcountRequest>) => {
    startRequest(newYork);
    return JSON.stringify({ ...state(), draft: { ...state().draft, ...patch } });
  };

  it("loads a save that matches", () => {
    expect(validateSavedState(saved({})).ok).toBe(true);
  });

  it("rejects a location the data no longer has, an unknown approver, a missing field, and broken JSON", () => {
    expect(validateSavedState(saved({ location: "Denver" as never }))).toMatchObject({ ok: false, reason: expect.stringContaining("draft.location") });
    const unknownApprover = JSON.stringify({ ...state(), sentBack: { approverId: "nobody", comment: "?" } });
    expect(validateSavedState(unknownApprover)).toMatchObject({ ok: false, reason: expect.stringContaining("sentBack.approverId") });
    const { planOffset: _dropped, ...older } = state().draft!;
    void _dropped;
    expect(validateSavedState(JSON.stringify({ ...state(), draft: older })).ok).toBe(false);
    expect(validateSavedState("{not json").ok).toBe(false);
  });

  describe("hydrate", () => {
    const storage = new Map<string, string>();
    beforeEach(() => {
      storage.clear();
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    it("discards an invalid save with a console warning and starts clean, instead of crashing", () => {
      const bad = saved({ location: "Denver" as never });
      resetStoreForTests();
      storage.set("northstar-headcount:v2", bad);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      appStore.hydrate();
      expect(state().draft).toBeNull();
      expect(storage.has("northstar-headcount:v2")).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Discarded the saved demo"));
      warn.mockRestore();
    });

    it("loads a valid save", () => {
      const good = saved({});
      resetStoreForTests();
      storage.set("northstar-headcount:v2", good);
      appStore.hydrate();
      expect(state().draft?.id).toBe("REQ-2027-021");
    });
  });
});
