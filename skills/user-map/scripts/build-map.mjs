#!/usr/bin/env node
// Build a user map from its JSON: checks the data, then writes the HTML page (from the template in
// ../assets/user-map.html) and the markdown summary that /functional-copilot's Phase 1 starts from.
//
//   node skills/user-map/scripts/build-map.mjs docs/copilot/user-map.json
//   node skills/user-map/scripts/build-map.mjs map.json --html out.html --md out.md
//   node skills/user-map/scripts/build-map.mjs map.json --check      (validate only)
//
// No dependencies. Exits 1 when the map has errors; warnings are printed and the files still written.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, "..", "assets", "user-map.html");

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
if (!input) {
  console.error("Usage: node build-map.mjs <user-map.json> [--html out.html] [--md out.md] [--check]");
  process.exit(2);
}
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const checkOnly = args.includes("--check");
const jsonPath = resolve(input);
const stem = jsonPath.replace(/\.json$/i, "");
const htmlPath = resolve(opt("--html") || stem + ".html");
const mdPath = resolve(opt("--md") || stem + ".md");

let data;
try {
  data = JSON.parse(readFileSync(jsonPath, "utf8"));
} catch (e) {
  console.error(`✗ ${input} is not valid JSON: ${e.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- checks
const errors = [];
const warnings = [];
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const EV = new Set(["sourced", "assumed", "confirmed"]);
const KINDS = new Set(["work", "handoff", "approval", "wait"]);
const placeholder = /‹[^›]*›/;

const sourceIds = new Set(arr(data.sources).map((s) => s.id));
arr(data.sources).forEach((s, i) => {
  if (s.id == null) errors.push(`sources[${i}] has no id`);
  // a web page, or a repo path: "src/…", "./…", or a file at the repo root such as "README.md"
  if (!/^https?:\/\//.test(s.url || "") && !/^(file:|\.?\/|[\w.-]+\/|[\w.-]+\.\w+$)/.test(s.url || ""))
    warnings.push(`sources[${i}] (${s.title || s.id}) has no http(s) URL or repo path`);
  if (!s.supports) warnings.push(`sources[${i}] (${s.title || s.id}) doesn't say what it supports`);
});

function checkEv(item, where) {
  if (!item || typeof item !== "object") return;
  if (!EV.has(item.ev)) {
    errors.push(`${where}: "ev" must be sourced, assumed or confirmed (got ${JSON.stringify(item.ev)})`);
    return;
  }
  if (item.ev === "sourced") {
    const ids = arr(item.src);
    if (!ids.length) errors.push(`${where}: marked sourced but has no "src"`);
    ids.forEach((id) => {
      if (!sourceIds.has(id)) errors.push(`${where}: cites source ${id}, which is not in "sources"`);
    });
  }
  if (item.ev === "confirmed" && !item.by) warnings.push(`${where}: confirmed, but "by" doesn't say who confirmed it`);
}

const m = data.meta || {};
["role", "function", "app", "building", "date", "oneLine"].forEach((k) => {
  if (!m[k]) errors.push(`meta.${k} is missing`);
});
if (m.research && !["web", "no-web"].includes(m.research)) warnings.push(`meta.research should be "web" or "no-web"`);
const ROUTES = ["own-app", "embedded", "plugin", "chat"];
if (!ROUTES.includes(m.route || "own-app")) errors.push(`meta.route must be one of ${ROUTES.join(", ")} (got ${JSON.stringify(m.route)})`);
const chat = m.route === "chat";
// /functional-copilot's five workflow shapes (its references/blueprint.md); the route is where it runs, the shape is what the work is.
const SHAPES = ["one request → approval chain", "review against a playbook", "exception queue", "Q&A with a write at the end", "workspace assist"];
if (!m.shape) warnings.push(`meta.shape is empty: name the first job's shape (${SHAPES.join(" · ")})`);
else if (!SHAPES.includes(m.shape) && !/‹/.test(m.shape)) errors.push(`meta.shape must be one of: ${SHAPES.join(" · ")} (got ${JSON.stringify(m.shape)})`);
// The top of the page is screenshotted for slides: keep it calm.
if (!m.headline) warnings.push("meta.headline is empty: the page falls back to \"<role> in <app>\"; write five to nine words");
else if (m.headline.length > 64) warnings.push(`meta.headline is ${m.headline.length} characters; keep it under 64 so the top stays calm`);
["role", "software", "copilot"].forEach((k) => {
  const v = m.path?.[k];
  if (!v) warnings.push(`meta.path.${k} is empty: the top card falls back to a longer field`);
  else if (v.length > 95) warnings.push(`meta.path.${k} is ${v.length} characters; keep each top card under 95`);
});

const R = data.role || {};
if (!R.summary) errors.push("role.summary is missing");
arr(R.measuredOn).forEach((x, i) => checkEv(x, `role.measuredOn[${i}]`));
const shares = arr(R.day).reduce((n, d) => n + (Number(d.share) || 0), 0);
arr(R.day).forEach((x, i) => checkEv(x, `role.day[${i}]`));
if (arr(R.day).length && (shares < 80 || shares > 110)) warnings.push(`role.day shares add up to ${shares}%, not about 100%`);
arr(R.people).forEach((x, i) => checkEv(x, `role.people[${i}]`));

const SW = data.software || {};
if (!SW.primary?.name) errors.push("software.primary.name is missing");
checkEv(SW.primary, "software.primary");
arr(SW.around).forEach((x, i) => checkEv(x, `software.around[${i}]`));
if (!SW.pattern?.name) errors.push("software.pattern.name is missing");
checkEv(SW.pattern, "software.pattern");
const regions = arr(SW.regions);
const regionIds = new Set();
regions.forEach((r, i) => {
  if (!/^[A-Za-z][\w-]*$/.test(r.id || "")) errors.push(`software.regions[${i}].id "${r.id}" must be a plain word (letters, digits, - or _)`);
  regionIds.add(r.id);
  checkEv(r, `software.regions[${i}] (${r.name || r.id})`);
  if ((r.name || "").split(/\s+/).some((w) => w.length > 14)) warnings.push(`region "${r.name}" has a long word that may wrap badly in a narrow wireframe cell`);
});
if (regions.length < 2) errors.push("software.regions needs at least two regions");
const areas = arr(SW.layout?.areas);
if (!areas.length) errors.push("software.layout.areas is missing");
const cols = new Set(areas.map((row) => row.trim().split(/\s+/).length));
if (cols.size > 1) errors.push("software.layout.areas rows have different numbers of cells");
const named = new Set(areas.join(" ").split(/\s+/).filter((t) => t && t !== "."));
named.forEach((t) => {
  if (!regionIds.has(t)) errors.push(`software.layout.areas names "${t}", which is not a region id`);
});
regionIds.forEach((id) => {
  if (!named.has(id)) warnings.push(`region "${id}" is not placed in software.layout.areas, so the wireframe won't show it`);
});

const jobs = arr(data.jobs);
if (jobs.length < 3) warnings.push(`only ${jobs.length} jobs to be done; most roles have 4 to 7`);
if (jobs.filter((j) => j.first).length !== 1) errors.push(`exactly one job needs "first": true (found ${jobs.filter((j) => j.first).length})`);
jobs.forEach((j, i) => {
  ["when", "want", "so"].forEach((k) => {
    if (!j[k]) errors.push(`jobs[${i}].${k} is missing`);
  });
  checkEv(j, `jobs[${i}] (${j.id || ""})`);
  if (/^(to |I |I'm|my |we )/i.test(j.want || "")) warnings.push(`jobs[${i}].want continues "I want to …" with a verb (e.g. "find every take…"), not "${(j.want || "").slice(0, 20)}…"`);
  if (/^(I |they |he |she |we |to )/i.test(j.so || "")) warnings.push(`jobs[${i}].so continues "so I can …" with a verb (e.g. "deliver…"), not "${(j.so || "").slice(0, 20)}…"`);
});

const flows = arr(data.flows);
if (!flows.length) errors.push("flows is empty");
flows.forEach((f, i) => {
  if (!f.trigger || !f.outcome) errors.push(`flows[${i}] needs a trigger and an outcome`);
  if (!f.timeGoes) warnings.push(`flows[${i}] has no "timeGoes" line`);
  if (i === 0) {
    if (!f.write || !f.write.what) warnings.push(`flows[0] has no "write": say what gets written after the last approval (what, system, who); if nobody knows, mark it assumed and ask it first`);
    else checkEv(f.write, "flows[0].write");
  }
  const steps = arr(f.steps);
  if (steps.length < 3) warnings.push(`flows[${i}] has only ${steps.length} steps`);
  if (!steps.some((s) => s.kind === "approval" || s.kind === "handoff"))
    warnings.push(`flows[${i}] has no handoff or approval step; most real flows have one`);
  steps.forEach((s, k) => {
    if (!KINDS.has(s.kind)) errors.push(`flows[${i}].steps[${k}].kind must be work, handoff, approval or wait`);
    if (s.region && !regionIds.has(s.region)) warnings.push(`flows[${i}].steps[${k}].region "${s.region}" is not a region id (fine if it happens outside the workspace)`);
    checkEv(s, `flows[${i}].steps[${k}]`);
  });
});

const PL = data.placement || {};
if (!PL.surface) errors.push("placement.surface is missing");
else {
  if (!regionIds.has(PL.surface.region)) errors.push(`placement.surface.region "${PL.surface.region}" is not a region id`);
  arr(PL.surface.also).forEach((id) => {
    if (!regionIds.has(id)) errors.push(`placement.surface.also names "${id}", which is not a region id`);
  });
  if (!PL.surface.notThis) warnings.push("placement.surface.notThis is empty: say what the chat-box-beside-it version would be");
  checkEv(PL.surface, "placement.surface");
}
["reads", "does", "renders", "waits", "shared", "learns"].forEach((k) => {
  const items = arr(PL[k]);
  if (!items.length) (k === "learns" ? warnings : errors).push(`placement.${k} is empty`);
  items.forEach((x, i) => {
    if (!x.text) errors.push(`placement.${k}[${i}].text is missing`);
    if (["does", "renders", "waits"].includes(k) && !x.name) warnings.push(`placement.${k}[${i}] has no tool or component "name"`);
    checkEv(x, `placement.${k}[${i}]`);
  });
});

const cl = arr(data.checklist);
if (cl.length < 4) warnings.push(`only ${cl.length} checklist items`);
cl.forEach((c, i) => {
  ["id", "what", "why", "how", "done", "piece"].forEach((k) => {
    if (!c[k]) errors.push(`checklist[${i}].${k} is missing (every item says what, why, how and done when, and names its piece)`);
  });
  if (!c.docs && !c.file) errors.push(`checklist[${i}] needs a docs.copilotkit.ai link or a starter file`);
  if (c.piece && !/use[A-Z]|Copilot|AG-UI|Intelligence|inspector|BuiltInAgent|Channels|MCP|OpenBot|A2UI|defineTool|defineChannelTool|awaitChoice|createChannel|thread\./.test(c.piece))
    warnings.push(`checklist[${i}].piece "${c.piece}" doesn't name a CopilotKit or AG-UI piece; name it, and keep generic alternatives to a footnote`);
  if (c.docs && !/^https:\/\/docs\.copilotkit\.ai\//.test(c.docs) && !/^https:\/\/(docs\.)?ag-ui\.com\//.test(c.docs))
    warnings.push(`checklist[${i}].docs is not a docs.copilotkit.ai or AG-UI docs link: ${c.docs}`);
});

const V = data.validate || {};
const who = arr(V.who);
if (who.length < 2 || who.length > 3) errors.push(`validate.who should name two or three real users (found ${who.length})`);
if (!arr(V.ask).length) errors.push("validate.ask is empty");

// leftover template placeholders
(function walk(x, path) {
  if (typeof x === "string") {
    if (placeholder.test(x)) errors.push(`${path} still has a template placeholder: ${x.slice(0, 60)}`);
  } else if (Array.isArray(x)) x.forEach((y, i) => walk(y, `${path}[${i}]`));
  else if (x && typeof x === "object") for (const k of Object.keys(x)) walk(x[k], path ? `${path}.${k}` : k);
})(data, "");

// tally
const tally = { sourced: 0, assumed: 0, confirmed: 0 };
(function walk(x) {
  if (Array.isArray(x)) return x.forEach(walk);
  if (!x || typeof x !== "object") return;
  if (EV.has(x.ev)) tally[x.ev === "sourced" && !arr(x.src).length ? "assumed" : x.ev]++;
  for (const k of Object.keys(x)) if (k !== "sources") walk(x[k]);
})(data);

warnings.forEach((w) => console.warn(`! ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));
console.log(
  `${basename(jsonPath)}: ${errors.length} error(s), ${warnings.length} warning(s) · ${tally.sourced} sourced, ${tally.assumed} assumed, ${tally.confirmed} confirmed · ${arr(data.sources).length} sources`,
);
if (errors.length) process.exit(1);
if (checkOnly) process.exit(0);

// ---------------------------------------------------------------- HTML
const template = readFileSync(TEMPLATE, "utf8");
const blockRe = /(<script type="application\/json" id="user-map-data">)[\s\S]*?(<\/script>)/;
if (!blockRe.test(template)) {
  console.error("✗ the template has no user-map-data block");
  process.exit(1);
}
// Escape "<" so no string in the data can close the script tag.
const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
const title = `User map · ${m.role}`.replace(/[<>&]/g, ""); // no product names in the title
const html = template
  .replace(blockRe, (_, open, close) => `${open}\n${json}\n${close}`)
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);

// ---------------------------------------------------------------- markdown summary
const tag = (x) => {
  if (!x || !x.ev) return "";
  if (x.ev === "confirmed") return " *(Confirmed)*";
  if (x.ev === "sourced" && arr(x.src).length) return " " + arr(x.src).map((id) => `[${id}]`).join("");
  return " *(Assumed)*";
};
const regionName = (id) => regions.find((r) => r.id === id)?.name || id;
const first = jobs.find((j) => j.first) || jobs[0] || {};
const L = [];
L.push(`# User map: ${m.role} in ${m.app}`);
L.push("");
L.push(`*${m.date} · made with /user-map · step 1 of 5: /user-map → /agent-context → /functional-copilot → /deploy → /secure-governance, with learning through CopilotKit Intelligence.*`);
L.push("");
L.push(`> ${m.oneLine}`);
L.push("");
L.push(`Evidence: ${tally.sourced} sourced, ${tally.assumed} assumed, ${tally.confirmed} confirmed. Anything marked *(Assumed)* has not been checked with a real user yet.${m.research === "no-web" ? " No web research was available for this map." : ""}`);
L.push("");
L.push("## For /functional-copilot's Phase 1 interview");
L.push("");
L.push("Start the interview from these answers and ask only what is missing or *(Assumed)*.");
L.push("");
L.push("**Round 1: the workflow**");
L.push(`- Function: ${m.function}. Users: ${m.role}, working in ${m.app}.`);
if (m.shape) L.push(`- Shape: ${m.shape}.`);
L.push(`- First job for the copilot (${first.id || "J1"}): "When ${first.when}, I want to ${first.want}, so I can ${first.so}."${tag(first)}`);
flows.forEach((f) => {
  L.push(`- Flow "${f.name}". Trigger: ${f.trigger}. Outcome: ${f.outcome}.`);
});
L.push(`- Copilot built in: ${String(m.building).replace(/\.\s*$/, "")}.`);
const w0 = flows[0]?.write;
L.push(w0?.what ? `- After the last approval: ${w0.what}${w0.system ? `, in ${w0.system}` : ""}${w0.who ? `. ${w0.who}` : ""}.${tag(w0)}` : "- After the last approval: not mapped yet *(Assumed)*: ask what gets written, in which system, on whose click.");
if (m.exists) L.push("- The copilot already exists in this repo: this map checks it, and its checklist is a list of things to verify and gaps to fix.");
L.push("");
L.push("**Round 2: people and rules**");
const gates = [];
flows.forEach((f) =>
  arr(f.steps).forEach((s) => {
    if (s.kind === "approval" || s.kind === "handoff") gates.push(`- ${s.kind === "approval" ? "Approval" : "Handoff"}: ${s.who}: ${s.what}${tag(s)}`);
  }),
);
L.push(...(gates.length ? gates : ["- No handoffs or approvals mapped yet *(Assumed)*"]));
arr(R.people).forEach((p) => L.push(`- Works with ${p.name}: ${p.relation}${tag(p)}`));
L.push("");
L.push("**Round 3: systems and numbers**");
L.push(`- Main software: ${SW.primary?.name}: ${SW.primary?.why}${tag(SW.primary)}`);
arr(SW.around).forEach((a) => L.push(`- Also: ${a.name}: ${a.why}${tag(a)}`));
arr(R.measuredOn).forEach((x) => L.push(`- Measured on: ${x.text}${tag(x)}`));
flows.forEach((f) => f.timeGoes && L.push(`- Where the time goes (${f.name}): ${f.timeGoes}`));
L.push("");
L.push(`## The workspace: ${SW.pattern?.name}`);
L.push("");
L.push(`${SW.pattern?.summary}${tag(SW.pattern)}`);
L.push("");
L.push(`- Object of work: ${SW.pattern?.object}`);
L.push(`- Selection: ${SW.pattern?.selection}`);
L.push(`- Open at once: ${SW.pattern?.open}`);
L.push(`- Regions: ${regions.map((r) => r.name).join(" · ")}`);
L.push("");
L.push("## Jobs to be done");
L.push("");
jobs.forEach((j) => L.push(`- **${j.id}${j.first ? " (first)" : ""}** When ${j.when}, I want to ${j.want}, so I can ${j.so}.${tag(j)}`));
L.push("");
L.push("## Key flows");
L.push("");
flows.forEach((f) => {
  L.push(`**${f.name}** (${f.trigger} → ${f.outcome})`);
  L.push("");
  arr(f.steps).forEach((s, i) => L.push(`${i + 1}. ${s.who}${regions.find((r) => r.id === s.region) ? ` (in ${regionName(s.region)})` : s.place ? ` (${s.place})` : ""}: ${s.what} *${s.time || ""}*${s.kind !== "work" ? ` · **${s.kind}**` : ""}${tag(s)}`));
  if (f.timeGoes) L.push("", `Where the time goes: ${f.timeGoes}`);
  L.push("");
});
L.push("");
L.push("## Where the copilot lives");
L.push("");
L.push(chat
  ? "Built with CopilotKit: the Channels SDK in Slack or Teams, server-side tools in the CopilotKit Runtime (`BuiltInAgent` or any AG-UI agent), and CopilotKit Intelligence for threads, memory and learning."
  : "Built with CopilotKit: the React v2 hooks in the app, AG-UI to the agent (`BuiltInAgent` or any AG-UI agent), the CopilotKit Runtime on the server, CopilotKit Intelligence for threads, memory and learning, and the web inspector while you build.");
L.push("");
const S = PL.surface || {};
L.push(`- **Surface:** ${regionName(S.region)}${arr(S.also).length ? `; its work lands in ${arr(S.also).map(regionName).join(", ")}` : ""}. ${S.text}${tag(S)}`);
if (S.notThis) L.push(`- **Not this:** ${S.notThis}`);
const rowsMd = chat ? [
  ["reads", "Reads (`thread.runAgent({ context })` + the sender's identity)"],
  ["does", "Does (`defineTool` in the runtime, `defineChannelTool`)"],
  ["renders", "Renders (Channels UI components via `thread.post`)"],
  ["waits", "Waits for a person (`thread.awaitChoice({ answerableBy })`, `Button` `onClick`)"],
  ["shared", "Shared state (the record on the server: a `StateStore` or your database)"],
  ["learns", "Learns from (CopilotKit Intelligence: Automatic Learning)"],
] : [
  ["reads", "Reads (`useAgentContext`)"],
  ["does", "Does (`useFrontendTool`)"],
  ["renders", "Renders (`useComponent`)"],
  ["waits", "Waits for a person (`useHumanInTheLoop`)"],
  ["shared", "Shared state (`useAgent`, or app state through `useAgentContext` + `useFrontendTool`)"],
  ["learns", "Learns from (CopilotKit Intelligence: Automatic Learning)"],
];
rowsMd.forEach(([k, label]) => {
  const items = arr(PL[k]);
  if (!items.length) return;
  L.push(`- **${label}:**`);
  items.forEach((x) => L.push(`  - ${x.name ? `\`${x.name}\`: ` : ""}${x.text}${tag(x)}`));
});
L.push("");
L.push("## Build checklist");
L.push("");
cl.forEach((c) => L.push(`- [ ] ${c.id} ${c.what}: ${c.piece}${c.file ? ` (\`${c.file}\`)` : ""}`));
L.push("");
L.push("## Check with real users before building");
L.push("");
who.forEach((w) => L.push(`- [ ] ${w}`));
L.push("");
arr(V.ask).forEach((a, i) => L.push(`${i + 1}. ${a}`));
L.push("");
if (arr(data.sources).length) {
  L.push("## Sources");
  L.push("");
  arr(data.sources).forEach((s) => L.push(`${s.id}. ${s.title}${s.publisher ? `, ${s.publisher}` : ""}: ${s.url}${s.supports ? `. ${s.supports}` : ""}`));
  L.push("");
}
L.push("Next: /agent-context (2 Context & access), then /functional-copilot (3 Spec & build). Both start from this brief.");
L.push("");
L.push(`Full map: \`${basename(htmlPath)}\` (open it in a browser).`);
L.push("");
writeFileSync(mdPath, L.join("\n"));

console.log(`✓ wrote ${htmlPath}`);
console.log(`✓ wrote ${mdPath}`);
