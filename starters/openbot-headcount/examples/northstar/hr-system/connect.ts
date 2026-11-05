/**
 * Connects Northstar HR to a running OpenBot and puts the submit action behind an approval.
 *
 *   NORTHSTAR_HR_URL=https://<public-host>/mcp bun examples/northstar/hr-system/connect.ts
 *
 * Run it from the OpenBot root after `server.ts` has started once: the token is the one `server.ts`
 * saved (see `token.ts`), or NORTHSTAR_HR_TOKEN if you set one yourself.
 *
 * First it checks the address against OpenBot's safety floor, which reads a call's target URL along
 * with its arguments: a quick tunnel's random name containing "pay" or "wire" would make OpenBot hand
 * every Northstar HR call, lookups included, to the person instead of running it.
 *
 * Then four things, each through the same admin API the OpenBot screens use, so each is audited:
 *   1. Stores the token as an `mcp` credential, rotating one stored earlier.
 *   2. Adds the server by URL as `northstar-hr`. OpenBot lists its tools while adding it, so the
 *      server has to be running and reachable over https at a public hostname by then.
 *   3. Grants its six tools to Hana (`headcount-copilot`).
 *   4. Adds two team approval rules for Hana: `northstar-hr/*` allow, and
 *      `northstar-hr/submit_headcount_request` ask. The stricter rule wins, so lookups never stop
 *      to ask and a submission always does, whatever a person sets for themselves.
 *
 * Written for a single-user local OpenBot (OPENBOT_SINGLE_USER=true), where a request from this
 * machine is the administrator. Safe to run again: it skips rules that already exist.
 */
import { savedToken, tokenFile } from "./token";

const API = (process.env.OPENBOT_API_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
const URL_ = process.env.NORTHSTAR_HR_URL?.trim();
const SAVED = savedToken();
const SERVER = "northstar-hr";
const BOT = "headcount-copilot";
const TOOLS = [
  "get_team_plan",
  "get_comp_band",
  "calculate_hire_cost",
  "check_request",
  "submit_headcount_request",
  "get_request_status",
];
const RULES = [
  { toolRef: `${SERVER}/*`, behaviour: "allow" },
  { toolRef: `${SERVER}/submit_headcount_request`, behaviour: "ask" },
] as const;

if (!URL_?.startsWith("https://")) {
  console.error(
    "Set NORTHSTAR_HR_URL to the server's public https address, ending in /mcp. OpenBot refuses http, localhost and IP addresses for a server added by URL.",
  );
  process.exit(1);
}
if (!SAVED) {
  console.error(
    `No Northstar HR token yet. Start server.ts first (from the OpenBot root): it creates one in ${tokenFile()}.`,
  );
  process.exit(1);
}

/**
 * OpenBot's safety floor hands any non-read action whose words match it to the person, before any
 * approval rule is read, and for a server added by URL every tool is a write and the words include
 * the server's address. So a tunnel name like `...-wire-...` would hand off every call.
 *
 * Asked of OpenBot's own function where this runs inside an OpenBot clone, so the check is the
 * gate's, not a copy that can drift. Elsewhere, a short list of the floor's words stands in.
 */
type FloorCandidate = {
  botId: string;
  toolRef: string;
  effect: string;
  scope: string;
  args: unknown;
  target: unknown;
};
type Floor = (candidate: FloorCandidate) => { id: string } | undefined;
async function floorFor(): Promise<{ check: Floor; source: string }> {
  try {
    const policy = (await import(
      "../../../server/src/approvals/policy"
    )) as unknown as { safetyRequirement: Floor };
    if (typeof policy.safetyRequirement === "function")
      return {
        check: policy.safetyRequirement,
        source: "OpenBot's safety floor",
      };
  } catch {}
  const words =
    /pay|billing|purchase|checkout|refund|wire|transfer|pass(word|code|phrase)|passwd|credential|2fa|mfa|otp|one-?time|recovery|api-?key|access-?token|admin-?role|grant-?admin|security|sharing|make-?public|iban|cvv|card/i;
  return {
    check: () => (words.test(URL_ ?? "") ? { id: "a floor word" } : undefined),
    source: "a list of the safety floor's words",
  };
}
const floor = await floorFor();
for (const tool of TOOLS) {
  const hit = floor.check({
    botId: BOT,
    toolRef: `${SERVER}/${tool}`,
    effect: "write",
    scope: SERVER,
    args: {},
    target: { serverId: SERVER, toolName: tool, url: URL_, effect: "write" },
  });
  if (hit) {
    console.error(
      `Not connected: ${URL_} matches ${floor.source} (${hit.id}), so OpenBot would hand every Northstar HR call to the person instead of running it. Stop cloudflared, start it again for a new address, and run this with that one.`,
    );
    process.exit(1);
  }
}
console.info(`0. ${URL_} passes ${floor.source}.`);

async function call<T>(method: string, path: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${method} ${path} answered ${response.status}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

const { credential } = await call<{ credential: { id: string } }>(
  "POST",
  "/api/admin/credentials",
  {
    kind: "mcp",
    provider: SERVER,
    keyId: `${SERVER}-token`,
    plaintext: SAVED.token,
    metadata: {},
  },
);
const credentialId = credential.id;
console.info(
  `1. Stored the token from ${SAVED.from} as credential ${credentialId}.`,
);

// A quick tunnel gets a new address every time it starts, and OpenBot refuses to move a server that
// holds a credential to a new address. So a server already here at another address is removed
// first (its grants go with it) and added again below, then granted again.
const { servers } = await call<{ servers: { id: string; url: string }[] }>(
  "GET",
  "/api/plugins",
);
const existing = servers.find((server) => server.id === SERVER);
if (existing && existing.url !== URL_) {
  await call("DELETE", `/api/plugins/servers/${SERVER}`);
  console.info(`   Removed ${SERVER} from its old address, ${existing.url}.`);
}

const { server } = await call<{
  server: { lastError: string | null; tools?: { name: string }[] };
}>("POST", "/api/plugins/servers/custom", {
  id: SERVER,
  title: "Northstar HR",
  url: URL_,
  credentialId,
});
// OpenBot keeps a server it could not reach, with the reason in `lastError`, rather than refusing it.
const listed = server.tools?.length ?? 0;
if (server.lastError || listed < TOOLS.length) {
  console.error(
    `2. Added ${SERVER} at ${URL_}, but OpenBot could not list its tools (${server.lastError ?? `${listed} of ${TOOLS.length} found`}). Is server.ts running, and is the tunnel up? Fix that and run this again.`,
  );
  process.exit(1);
}
console.info(`2. Added ${SERVER} at ${URL_} and listed its ${listed} tools.`);

for (const tool of TOOLS)
  await call("POST", "/api/plugins/grants", {
    kind: "mcp",
    ref: `${SERVER}/${tool}`,
    agentId: BOT,
  });
console.info(`3. Granted ${TOOLS.length} tools to ${BOT}.`);

const { teamRules } = await call<{
  teamRules: { botId: string; toolRef: string; behaviour: string }[];
}>("GET", "/api/approvals");
for (const rule of RULES) {
  const exists = teamRules.some(
    (existing) =>
      existing.botId === BOT &&
      existing.toolRef === rule.toolRef &&
      existing.behaviour === rule.behaviour,
  );
  if (!exists)
    await call("POST", "/api/approvals/team/rules", {
      botId: BOT,
      toolRef: rule.toolRef,
      effect: "*",
      scope: "*",
      behaviour: rule.behaviour,
    });
  console.info(
    `4. Team rule: ${rule.toolRef} -> ${rule.behaviour}${exists ? " (already there)" : ""}.`,
  );
}

const held = await call<{ tools: { ref: string }[] }>(
  "GET",
  `/api/plugins/for/${BOT}`,
);
console.info(
  `Hana now holds: ${held.tools.map((tool) => tool.ref).join(", ") || "(nothing yet)"}`,
);
