/**
 * Northstar Legal over MCP: the legal system of record the Contract Copilot reads from and submits to.
 *
 * A workshop stand-in. Replace it with your own matter-management system's MCP server (or an MCP
 * wrapper around its API) and nothing in the tenant package changes except the tool names in
 * `skills.yaml`.
 *
 *   bun examples/northstar-legal/legal-system/server.ts          # from the OpenBot root
 *
 * OpenBot only adds an MCP server by URL over https at a public hostname, so put a tunnel in front of
 * it (see the starter README). Every call needs `Authorization: Bearer <token>`. The token is made on
 * the first start and kept in `.env.northstar-legal` beside this file (see `token.ts`), so restarting
 * this server does not invalidate the copy `connect.ts` gave OpenBot.
 *
 * The state (matters, redlines, reasons, approvals, evidence) lives in `.state.json` beside this file.
 * Every call reads it and every write saves it before answering, so a restart loses nothing and
 * `bun legal-system/reset.ts friday|fresh` takes effect without a restart. With no file yet, the
 * server starts from the Friday seed the clip needs.
 *
 * OpenBot treats every tool on a server added by URL as a write and runs every call, lookups
 * included, past its safety floor (server/src/approvals/policy.ts), which hands an action to the
 * person when its words mention payments, credentials or security settings. So the arguments here are
 * ids and the person's own words only, never a rule id ("PB-PAY-01" reads as a payment). See
 * safety-floor.test.ts.
 *
 * Same MCP implementation as OpenBot's own `scripts/mock-knowledge-mcp.ts` (`@copilotkit/aimock`),
 * resolved from the OpenBot root's node_modules.
 */
import { createServer } from "node:http";
import { MCPMock } from "@copilotkit/aimock/mcp";
import { STATE_FILE, loadState, saveState } from "./state";
import { ensureToken } from "./token";
import { TOOLS, callTool } from "./tools";

const PORT = Number.parseInt(process.env.NORTHSTAR_LEGAL_PORT ?? "4320", 10);
const HOST = process.env.NORTHSTAR_LEGAL_HOST ?? "127.0.0.1";
const AUTH = ensureToken();
const TOKEN = AUTH.token;

/**
 * Every answer is JSON the coworker quotes. A refusal (`ok: false`) is thrown, which
 * `@copilotkit/aimock` returns as an MCP result with `isError: true` and the same JSON as its text, so
 * OpenBot audits it as `mcp.call_failed` rather than `mcp.call_succeeded` and the coworker sees it as
 * an error. A refusal saves nothing. A write saves the state before the answer goes out.
 */
function answer(name: string, writes: boolean, args: unknown): string {
  let outcome: ReturnType<typeof callTool>;
  try {
    const state = loadState(STATE_FILE);
    outcome = callTool(state, name, (args ?? {}) as Record<string, unknown>);
    if (writes && (outcome.result as { ok?: boolean }).ok === true) saveState(STATE_FILE, outcome.state);
  } catch (error) {
    console.error(error);
    throw new Error(JSON.stringify({ ok: false, error: "Northstar Legal could not answer that. Nothing was changed." }));
  }
  const text = JSON.stringify(outcome.result, null, 2);
  if ((outcome.result as { ok?: boolean }).ok !== true) throw new Error(text);
  if (writes) console.info(JSON.stringify({ type: "northstar-legal-write", tool: name, matterId: (args as { matterId?: unknown } | null)?.matterId ?? null }));
  return text;
}

const mock = new MCPMock({ serverInfo: { name: "northstar-legal", version: "1.0.0" } });

for (const tool of TOOLS) {
  mock.addTool({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema });
  mock.onToolCall(tool.name, (args) => answer(tool.name, tool.writes, args));
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://northstar-legal").pathname;
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
      type: "northstar-legal",
      url: `http://${HOST}:${PORT}/mcp`,
      auth: "bearer",
      token: AUTH.created ? `created and saved in ${AUTH.from}` : `reused from ${AUTH.from}`,
      state: STATE_FILE,
      tools: TOOLS.length,
    }),
  );
});
