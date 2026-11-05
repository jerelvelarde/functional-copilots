// What the frontend tools do, as plain functions. copilot/useHeadcountTools.ts registers them with
// CopilotKit (useFrontendTool); demo-script.test.ts calls the same functions, so the scripted demo is
// tested against the real handlers. Each one reads the store when it runs and calls the pure
// functions in headcount.ts: the model picks the inputs, the code does the math.

import { z } from "zod";
import {
  CFO_THRESHOLD,
  CURRENT_TEAM,
  LEVELS,
  LOCATIONS,
  QUARTERS,
  REQUEST_TYPES,
  calculateCost,
  checkBudgetFit,
  getCompBand,
  hasOffice,
  planSummary,
} from "./headcount";
import { agentUpdate, appStore, approvedInSession, evaluateInApp, startRequest } from "./store";

const draftFields = {
  roleTitle: z.string().optional(),
  level: z.enum(LEVELS).optional(),
  location: z.enum(LOCATIONS).optional(),
  startQuarter: z.enum(QUARTERS).optional().describe("Start quarter in FY2027"),
  type: z.enum(REQUEST_TYPES).optional(),
  baseSalary: z.number().int().positive().optional(),
  justification: z.string().optional().describe("At least two sentences: what the role unblocks, and what happens if it is not filled (POL-HC-01)"),
  aboveMidpointReason: z.string().optional().describe("One line, needed when the base is above the band midpoint (POL-COMP-01)"),
  planOffset: z.string().optional().describe("The offsetting reduction or new budget, needed when a net-new request is outside the plan (POL-HC-02)"),
  securityAccess: z.string().optional().describe('The "Security and access" section: which systems, what access level, who reviews it'),
};

export const toolSchemas = {
  getHeadcountPlan: z.object({}),
  getCompBand: z.object({ level: z.enum(LEVELS), location: z.enum(LOCATIONS) }),
  calculateCost: z.object({
    level: z.enum(LEVELS).optional(),
    baseSalary: z.number().optional(),
    startQuarter: z.enum(QUARTERS).optional(),
    agency: z.boolean().optional().describe("Use a recruiting agency (20% of base) instead of internal recruiting ($15,000)"),
  }),
  checkPolicy: z.object({}),
  startRequest: z.object(draftFields),
  updateRequest: z.object({
    ...draftFields,
    userAsked: z
      .boolean()
      .optional()
      .describe("true only when the user asked for this change in their own words. Without it, fields the user set themselves are left alone and returned in `refused`."),
  }),
};

type Args<T extends keyof typeof toolSchemas> = z.infer<(typeof toolSchemas)[T]>;

const approved = () => approvedInSession(appStore.getState(), CURRENT_TEAM.id);

export const toolHandlers = {
  getHeadcountPlan: () => planSummary(CURRENT_TEAM, approved()),

  getCompBand: ({ level, location }: Args<"getCompBand">) => ({ ...getCompBand(level, location), teamHasOffice: hasOffice(CURRENT_TEAM, location) }),

  calculateCost: (args: Args<"calculateCost">) => {
    const draft = appStore.getState().draft;
    const level = args.level ?? draft?.level;
    const baseSalary = args.baseSalary ?? draft?.baseSalary;
    const startQuarter = args.startQuarter ?? draft?.startQuarter;
    if (!level || baseSalary == null || !startQuarter) {
      return { error: "Need level, baseSalary and startQuarter, from the draft or as arguments." };
    }
    const cost = calculateCost({ level, baseSalary, startQuarter, agency: args.agency });
    return {
      inputs: { level, baseSalary, startQuarter, agency: args.agency ?? false },
      cost,
      budget: checkBudgetFit(CURRENT_TEAM, cost.fiscalYearImpact, approved()),
      cfoThreshold: CFO_THRESHOLD,
      aboveCfoThreshold: cost.fullyLoadedAnnual > CFO_THRESHOLD,
    };
  },

  checkPolicy: () => {
    const state = appStore.getState();
    if (!state.draft) return { error: "No request is open. Use startRequest for a new hire." };
    const evaluation = evaluateInApp(state, state.draft);
    return {
      requestId: evaluation.requestId,
      readyToSubmit: evaluation.readyToSubmit,
      results: evaluation.results,
      approvers: evaluation.approvers.map(({ name, title, reason }) => ({ name, title, reason })),
      blockers: evaluation.blockers.map((b) => `${b.ruleId}: ${b.detail}`),
    };
  },

  startRequest: (fields: Args<"startRequest">) => startRequest(fields),

  updateRequest: ({ userAsked, ...patch }: Args<"updateRequest">) => {
    const result = agentUpdate(patch, userAsked === true);
    if (!result.ok || result.refused.length === 0) return result;
    const fields = result.refused.map((r) => r.field).join(", ");
    return { ...result, note: `The user set ${fields} themselves, so those were not changed. Ask before changing them; call again with userAsked: true only if they say yes.` };
  },
};
