/**
 * Northstar HR over MCP: the system of record Hana reads from and submits to.
 *
 * A workshop stand-in. Replace it with your own HR system's MCP server (or an MCP wrapper around its
 * API) and nothing in the tenant package changes except the tool names in `skills.yaml`.
 *
 *   bun examples/northstar/hr-system/server.ts          # from the OpenBot root
 *
 * OpenBot only adds an MCP server by URL over https at a public hostname, so put a tunnel in front of
 * it (see the starter README). Every call needs `Authorization: Bearer <token>`. The token is made on
 * the first start and kept in `.env.northstar-hr` beside this file (see `token.ts`), so restarting
 * this server does not invalidate the copy `connect.ts` gave OpenBot.
 *
 * OpenBot treats every tool on a server added by URL as a write, whatever it says about itself. That
 * is why the approval rules the README adds name `submit_headcount_request` for "ask" rather than
 * relying on read-only hints, which OpenBot deliberately ignores for chat. It is also why every call
 * here, lookups included, passes OpenBot's safety floor (server/src/approvals/policy.ts), which
 * hands an action to the person when its words mention payments, credentials or security settings.
 * The tool and argument names below match none of those words, alone or next to each other.
 *
 * Same MCP implementation as OpenBot's own `scripts/mock-knowledge-mcp.ts` (`@copilotkit/aimock`),
 * resolved from the OpenBot root's node_modules.
 */
import { createServer } from "node:http";
import { MCPMock } from "@copilotkit/aimock/mcp";
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
import { ensureToken } from "./token";

const PORT = Number.parseInt(process.env.NORTHSTAR_HR_PORT ?? "4310", 10);
const HOST = process.env.NORTHSTAR_HR_HOST ?? "127.0.0.1";
const AUTH = ensureToken();
const TOKEN = AUTH.token;

const data = loadData();
const requests = new Map<string, StoredRequest>();
// REQ-2027-014 is Platform's open Q1 req in headcount-plan.json, so new ones start after it.
let sequence = 14;
const nextId = () => `REQ-2027-${String(++sequence).padStart(3, "0")}`;

/**
 * Every answer is JSON the coworker quotes. A refusal is thrown, which `@copilotkit/aimock` returns
 * as an MCP result with `isError: true` and the sentence as its text, so OpenBot audits it as
 * `mcp.call_failed` rather than `mcp.call_succeeded` and the coworker sees it as an error.
 */
function answer(work: () => unknown): string {
  try {
    return JSON.stringify(work(), null, 2);
  } catch (error) {
    if (error instanceof HrInputError) throw new Error(error.message);
    console.error(error);
    throw new Error("Northstar HR could not answer that. Nothing was changed.");
  }
}

const LEVEL = {
  type: "string",
  enum: ["L3", "L4", "L5", "L6", "L7"],
  description:
    "L3 Software Engineer, L4 Software Engineer II, L5 Senior Software Engineer, L6 Staff Software Engineer, L7 Principal Software Engineer.",
};
const LOCATION = {
  type: "string",
  description:
    "New York, San Francisco, Seattle, Boston, Austin or Remote (US).",
};
const QUARTER = {
  type: "string",
  enum: ["Q1", "Q2", "Q3", "Q4"],
  description: "Start quarter in FY2027 (Jan to Dec 2027).",
};
const TEAM = {
  type: "string",
  description:
    "Team id or name: platform (Platform Infrastructure), product (Product Engineering), data (Data & ML), support (Customer Support).",
};
const BASE = {
  type: "number",
  description:
    "Proposed annual base salary in USD. Omit to use the band midpoint.",
};
const START_DATE = {
  type: "string",
  description:
    "YYYY-MM-01, inside the start quarter. Omit for the policy default, the first day of the quarter's second month.",
};
const RECRUITING = {
  type: "string",
  enum: ["internal", "agency"],
  description: "Internal recruiting ($15,000) or an agency (20% of base).",
};
const REQUEST_TYPE = { type: "string", enum: ["net_new", "backfill"] };

const mock = new MCPMock({
  serverInfo: { name: "northstar-hr", version: "1.0.0" },
});

mock.addTool({
  name: "get_team_plan",
  description:
    "Read a team's approved FY2027 headcount plan: net-new approved, opened, pending and remaining per quarter, open reqs, personnel budget and what is left of it, office locations, department head. Requests already submitted to Northstar HR and still waiting on approvers count as pending: each holds a slot in its quarter and its FY2027 impact comes off the budget. Also returns today's date and which quarter is 'next quarter'. Read-only.",
  inputSchema: {
    type: "object",
    properties: { team: TEAM },
    required: ["team"],
  },
});
mock.onToolCall("get_team_plan", (args) =>
  answer(() =>
    teamPlan(data, (args as { team?: unknown })?.team, requests.values()),
  ),
);

mock.addTool({
  name: "get_comp_band",
  description:
    "Read the base salary band (min, midpoint, max) for a level and location, and the location's tier. Read-only.",
  inputSchema: {
    type: "object",
    properties: { level: LEVEL, location: LOCATION },
    required: ["level", "location"],
  },
});
mock.onToolCall("get_comp_band", (args) =>
  answer(() => {
    const input = (args ?? {}) as { level?: unknown; location?: unknown };
    return compBand(data, input.level, input.location);
  }),
);

mock.addTool({
  name: "calculate_hire_cost",
  description:
    "Apply Northstar's cost model (POL-FIN-02) to one hire: fully loaded annual cost with every component, FY2027 impact (prorated by months employed plus one-time costs) and annual run-rate, shown separately, plus where the base sits in the band and whether the CFO threshold is crossed. Use this for every cost figure; never compute one yourself. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      level: LEVEL,
      location: LOCATION,
      start_quarter: QUARTER,
      base_salary: BASE,
      start_date: START_DATE,
      recruiting: RECRUITING,
    },
    required: ["level", "location", "start_quarter"],
  },
});
mock.onToolCall("calculate_hire_cost", (args) =>
  answer(() => hireCost(data, (args ?? {}) as Parameters<typeof hireCost>[1])),
);

mock.addTool({
  name: "check_request",
  description:
    "Run every check on a headcount request at once: plan fit (POL-HC-02/03), location (POL-COMP-02), band (POL-COMP-01), start date and lead time (POL-HC-04), cost with FY2027 impact and annual run-rate (POL-FIN-02), budget fit (POL-FIN-01) and the approval chain (POL-APR-01/02). Plan fit and budget count the requests already pending in Northstar HR, as 'N left (M pending)'. Returns blockers and what is still needed from the requester. Call it again after any change. Read-only.",
  inputSchema: {
    type: "object",
    properties: {
      team: TEAM,
      level: LEVEL,
      location: LOCATION,
      start_quarter: QUARTER,
      request_type: REQUEST_TYPE,
      base_salary: BASE,
      start_date: START_DATE,
      recruiting: RECRUITING,
    },
    required: ["team", "level", "location", "start_quarter", "request_type"],
  },
});
mock.onToolCall("check_request", (args) =>
  answer(() =>
    checkRequest(
      data,
      (args ?? {}) as Parameters<typeof checkRequest>[1],
      requests.values(),
    ),
  ),
);

mock.addTool({
  name: "submit_headcount_request",
  description:
    "Submit an approval-ready headcount request into Northstar HR, which routes it to the approval chain. This is a write: call it only when the requester has asked you to submit. Send the same structured inputs check_request used, including base_salary. Northstar HR computes every figure of record itself (annual run-rate, FY2027 impact, budget left) and the approver chain, from those inputs; it does not read figures or approvers sent to it. It refuses a request with a structured input missing or a policy blocker, and names what to fix. The business case is stored as your narrative, as written. Returns the request id and the figures it recorded.",
  inputSchema: {
    type: "object",
    properties: {
      role_title: { type: "string" },
      team: TEAM,
      level: LEVEL,
      location: LOCATION,
      start_quarter: QUARTER,
      request_type: REQUEST_TYPE,
      base_salary: {
        type: "number",
        description:
          "The proposed annual base salary in USD that check_request used (its band.proposedBase). Required: every figure is computed from it.",
      },
      start_date: START_DATE,
      recruiting: RECRUITING,
      justification: {
        type: "string",
        description:
          "At least two sentences: what work it unblocks and what happens if the role is not filled (POL-HC-01).",
      },
      above_midpoint_reason: {
        type: "string",
        description: "Required when the base is above the band midpoint.",
      },
      out_of_plan_offset: {
        type: "string",
        description: "Required when the request is outside the plan.",
      },
      production_access: {
        type: "array",
        description:
          "Only for a role that gets production access: one entry per system the person will reach, with its access level. Leave it out otherwise.",
        items: {
          type: "object",
          properties: {
            system: {
              type: "string",
              description:
                "The system, named plainly: production Kubernetes clusters, cloud accounts, CI/CD, databases, observability.",
            },
            level: {
              type: "string",
              enum: ["read_only", "deploy", "elevated"],
              description: "read_only, deploy, or elevated (full control).",
            },
          },
          required: ["system", "level"],
        },
      },
      on_call: {
        type: "boolean",
        description: "Whether the person joins an on-call rotation.",
      },
      access_reviewer: {
        type: "string",
        description:
          "Who reviews the access and how often, for example Jordan Blake (Head of Security), quarterly.",
      },
      business_case: {
        type: "string",
        description:
          "The business case as drafted, in Markdown. Stored as written, as your narrative.",
      },
    },
    required: [
      "role_title",
      "team",
      "level",
      "location",
      "start_quarter",
      "request_type",
      "base_salary",
      "justification",
      "business_case",
    ],
  },
});
mock.onToolCall("submit_headcount_request", (args) =>
  answer(() => {
    const stored = submitRequest(
      data,
      requests,
      (args ?? {}) as Parameters<typeof submitRequest>[2],
      nextId,
    );
    console.info(
      JSON.stringify({
        type: "northstar-hr-submitted",
        id: stored.id,
        next: stored.nextApprover,
      }),
    );
    return {
      id: stored.id,
      status: stored.status,
      figures: stored.figures,
      note: "Recorded in Northstar HR (workshop stand-in, kept in memory). The figures and the approver chain were computed here from the structured inputs. The business case is stored as the coworker's narrative, as written, and is not checked against them. The approvers decide in the HR system; nothing has been approved yet, and the request holds its plan slot and budget while it is pending.",
    };
  }),
);

mock.addTool({
  name: "get_request_status",
  description:
    "Look up a submitted headcount request by id (REQ-2027-...). Read-only.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
});
mock.onToolCall("get_request_status", (args) =>
  answer(() => {
    const id = String((args as { id?: unknown })?.id ?? "")
      .trim()
      .toUpperCase();
    const found = requests.get(id);
    if (!found)
      throw new HrInputError(
        `No request ${id} in Northstar HR. This stand-in keeps requests in memory, so a restart clears them.`,
      );
    return found;
  }),
);

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://northstar-hr").pathname;
  if (path === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(mock.health()));
    return;
  }
  if (request.headers.authorization !== `Bearer ${TOKEN}`) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Missing or wrong bearer token." }));
    return;
  }
  if (path !== "/mcp" && path !== "/") {
    response.writeHead(404);
    response.end();
    return;
  }
  // Streamable HTTP clients may open a GET event stream; this server answers on the POST only.
  if (request.method === "GET") {
    response.writeHead(405, { allow: "POST, DELETE" });
    response.end();
    return;
  }
  try {
    if (!(await mock.handleRequest(request, response, "/"))) {
      response.writeHead(405, { allow: "POST, DELETE" });
      response.end();
    }
  } catch (error) {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
});

server.listen(PORT, HOST, () => {
  console.info(
    JSON.stringify({
      type: "northstar-hr",
      url: `http://${HOST}:${PORT}/mcp`,
      auth: "bearer",
      token: AUTH.created
        ? `created and saved in ${AUTH.from}`
        : `reused from ${AUTH.from}`,
    }),
  );
});
