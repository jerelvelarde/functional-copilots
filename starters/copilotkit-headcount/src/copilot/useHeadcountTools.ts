// Concept: frontend tools. The agent calls them; they run here in the browser, call the pure
// functions in lib/headcount.ts, and read or write the shared store. The model picks the inputs;
// the code does the math. The handlers and their parameter schemas live in lib/agent-tools.ts as
// plain functions, so the tests run exactly what the agent runs.
//
// Two rules are enforced in the handlers, not left to the prompt: startRequest refuses while another
// request is open, and updateRequest never overwrites a value the user set unless the user asked.
//
// About the empty deps arrays: each handler reads appStore.getState() when it runs, so nothing from
// render scope can go stale. If a handler used a prop or a piece of React state instead, that value
// would have to be in the deps array, or the tool would keep the first value forever.

import { useFrontendTool } from "@copilotkit/react-core/v2";
import { toolHandlers, toolSchemas } from "@/lib/agent-tools";

export function useHeadcountTools() {
  useFrontendTool(
    {
      name: "getHeadcountPlan",
      description:
        "The user's team FY2027 headcount plan: approved net-new reqs per start quarter, reqs already opened, what is left, open reqs, personnel budget and offices (POL-HC-02, POL-FIN-01).",
      parameters: toolSchemas.getHeadcountPlan,
      handler: async () => toolHandlers.getHeadcountPlan(),
    },
    [],
  );

  useFrontendTool(
    {
      name: "getCompBand",
      description: "The base salary band for a level and location (POL-COMP-01), the location tier, and whether the team has an office there (POL-COMP-02).",
      parameters: toolSchemas.getCompBand,
      handler: async (args) => toolHandlers.getCompBand(args),
    },
    [],
  );

  useFrontendTool(
    {
      name: "calculateCost",
      description:
        "Fully loaded annual cost, FY2027 impact and budget fit (POL-FIN-01, POL-FIN-02). Inputs default to the current draft; pass any of them for a what-if.",
      parameters: toolSchemas.calculateCost,
      handler: async (args) => toolHandlers.calculateCost(args),
    },
    [],
  );

  useFrontendTool(
    {
      name: "checkPolicy",
      description:
        "Check the current draft against every written rule (POL-HC, POL-COMP, POL-FIN, POL-APR) and every published skill that applies. Returns each check's status (pass, warn, fail, missing, info), the approver chain, and the blockers to fix before submitting.",
      parameters: toolSchemas.checkPolicy,
      handler: async () => toolHandlers.checkPolicy(),
    },
    [],
  );

  useFrontendTool(
    {
      name: "startRequest",
      description:
        "Start a new request for a new hire, with the fields you can infer. Refuses while another request is open in the Business case: then relay its reason and ask the user to submit, discard or keep editing the open one.",
      parameters: toolSchemas.startRequest,
      handler: async (args) => toolHandlers.startRequest(args),
    },
    [],
  );

  useFrontendTool(
    {
      name: "updateRequest",
      description:
        "Change fields of the request open in the Business case. Pass only the fields you want to change. Never use it to start a different hire (use startRequest). Fields the user set themselves are not changed unless userAsked is true; they come back in `refused`.",
      parameters: toolSchemas.updateRequest,
      handler: async (args) => toolHandlers.updateRequest(args),
    },
    [],
  );
}
