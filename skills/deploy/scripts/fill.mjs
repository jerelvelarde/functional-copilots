#!/usr/bin/env node
// Fill the /deploy checklist page with data, after checking the data.
//
//   node fill.mjs <data.json> <out.html>      validate, then write the template with the data
//   node fill.mjs --extract <page.html>       print the JSON inside a filled page (or the template)
//   node fill.mjs --check <data.json>         validate only
//   node fill.mjs --context <agent-context.html>  print the server-side rows (rings 3 to 7) of an
//                                             /agent-context map: each needs a Server-side connections item
//
// The template is ../assets/deploy.html next to this script. No dependencies; Node 18 or later.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, "..", "assets", "deploy.html");
const OPEN = '<script type="application/json" id="checklist-data">';
const CLOSE = "</script>";
const STATUSES = new Set(["done", "todo", "ask", "blocked", "na"]);
const SECTIONS = ["runtime", "connections", "host", "env", "mock", "auth", "protect", "ops", "smoke", "golive"];
const NEEDS_EVIDENCE = new Set(["done", "na", "blocked", "ask"]);
// The stack the suite prescribes. Every how (outside Go live) should name at least one of these.
const COPILOTKIT_PIECE = /CopilotKit Runtime|CopilotRuntime|createCopilot[A-Za-z]+|BuiltInAgent|CopilotKitProvider|CopilotKitIntelligence|Intelligence|use(AgentContext|FrontendTool|Component|HumanInTheLoop|Agent)\b|identifyUser|onRequest|onBeforeHandler|onResponse|onError|hooks|cors|threads|maxSteps|sseKeepAliveIntervalSeconds|forwardHeaders|afterRequestMiddleware|AgentRunner|HttpAgent|AG-UI|@copilotkit\/|@ag-ui\/|enableInspector|channels|\/info|COPILOTKIT_|CPK_/;
// Shapes of real credentials. Names like OPENAI_API_KEY are fine; values are not.
const SECRET_SHAPES = [
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}/,
  /\b(?:sk|pk|rk)_live_[A-Za-z0-9]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function extract(html, where) {
  const start = html.indexOf(OPEN);
  if (start < 0) throw new Error(`${where}: no checklist-data block`);
  const end = html.indexOf(CLOSE, start + OPEN.length);
  return { start, end, json: html.slice(start + OPEN.length, end) };
}

function validate(data) {
  const errors = [];
  const warnings = [];
  for (const key of ["skill", "app", "function", "date", "headline", "summary", "sections"]) {
    if (data[key] == null || data[key] === "") errors.push(`missing top-level "${key}"`);
  }
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push(`date "${data.date}" is not YYYY-MM-DD`);
  const ids = (data.sections || []).map((s) => s.id);
  for (const id of SECTIONS) if (!ids.includes(id)) errors.push(`missing section "${id}"`);
  const seen = new Set();
  for (const s of data.sections || []) {
    if (!s.title) errors.push(`section "${s.id}" has no title`);
    for (const it of s.items || []) {
      const at = `${s.id}/${it.id}`;
      if (!it.id) errors.push(`an item in "${s.id}" has no id`);
      if (seen.has(it.id)) errors.push(`duplicate item id "${it.id}"`);
      seen.add(it.id);
      if (!STATUSES.has(it.status)) errors.push(`${at}: status "${it.status}" is not one of ${[...STATUSES].join(", ")}`);
      for (const f of ["title", "what", "why", "how", "doneWhen"]) if (!it[f]) errors.push(`${at}: missing "${f}"`);
      if (NEEDS_EVIDENCE.has(it.status) && !it.evidence) errors.push(`${at}: a "${it.status}" item needs "evidence" (done: the proof; na: why not; blocked: what it waits on; ask: the decision needed)`);
      if (!(it.links || []).length && !(it.files || []).length && s.id !== "golive") warnings.push(`${at}: no links or files for the how`);
      if (s.id !== "golive" && it.how && !COPILOTKIT_PIECE.test(it.how)) warnings.push(`${at}: the how names no CopilotKit or AG-UI piece; lead with it and put generic options in "footnote"`);
    }
  }
  for (const id of data.blockers || []) if (!seen.has(id)) errors.push(`blocker "${id}" is not an item id`);
  if ((data.blockers || []).length > 5) warnings.push(`${data.blockers.length} blockers: the top of the page should hold only the few that stop the deploy (five at most)`);
  if (!(data.blockers || []).length) warnings.push("no blockers: list the item ids that stop the deploy, or say in the headline that nothing does");
  if (data.headline && data.headline.length > 140) warnings.push("the headline is long: one calm sentence reads best at the top of the page");
  for (const c of data.commands || []) if (!c.cmd) errors.push(`command "${c.label}" has no cmd`);
  for (const v of data.env || []) if (!/^[A-Z][A-Z0-9_]*$/.test(v.name || "")) errors.push(`env name "${v.name}" is not an UPPER_SNAKE variable name`);
  const text = JSON.stringify(data);
  for (const shape of SECRET_SHAPES) if (shape.test(text)) errors.push(`something that looks like a real credential matches ${shape}: remove the value; the page holds names only`);
  return { errors, warnings };
}

function report({ errors, warnings }) {
  for (const w of warnings) console.warn(`warn: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  return errors.length === 0;
}

const [mode, a, b] = process.argv.slice(2);
try {
  if (mode === "--extract") {
    const { json } = extract(readFileSync(a, "utf8"), a);
    process.stdout.write(JSON.stringify(JSON.parse(json), null, 2) + "\n");
  } else if (mode === "--context") {
    // The /agent-context page keeps its rows in <script type="application/json" id="agent-context-data">;
    // its .json sidecar holds the same object.
    const text = readFileSync(a, "utf8");
    let map;
    if (a.endsWith(".json")) map = JSON.parse(text);
    else {
      const marker = 'id="agent-context-data">';
      const at = text.indexOf(marker);
      if (at < 0) throw new Error(`${a}: no agent-context-data block`);
      map = JSON.parse(text.slice(at + marker.length, text.indexOf(CLOSE, at)));
    }
    const rings = { 3: "Your server", 4: "Org systems", 5: "People", 6: "Coworkers", 7: "Memory" };
    // Each ring 3-7 row carries runsOn (where it runs) and secretEnv (env var NAMES, never values).
    // phase is "v1" (the default) or "later"; gate.also lists extra gates beside the main one.
    const rows = (map.sources || []).filter((r) => r.ring >= 3).map((r) => ({ id: r.id, ring: `${r.ring} ${rings[r.ring] || ""}`.trim(), name: r.name, phase: r.phase || "v1", runsOn: r.runsOn ?? "(missing: ask /agent-context)", secretEnv: r.secretEnv ?? "(missing: ask /agent-context)", access: r.access, gate: r.gate, status: r.status, how: r.how }));
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  } else if (mode === "--check") {
    if (!report(validate(JSON.parse(readFileSync(a, "utf8"))))) process.exit(1);
    console.log("ok");
  } else if (mode && a) {
    const data = JSON.parse(readFileSync(mode, "utf8"));
    if (!report(validate(data))) process.exit(1);
    const html = readFileSync(TEMPLATE, "utf8");
    const { start, end } = extract(html, TEMPLATE);
    // "<" escaped so no string in the data can close the script tag.
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    const out = html.slice(0, start + OPEN.length) + json + html.slice(end);
    mkdirSync(dirname(resolve(a)), { recursive: true });
    writeFileSync(a, out);
    const items = data.sections.flatMap((s) => s.items || []);
    const by = (st) => items.filter((i) => i.status === st).length;
    console.log(`wrote ${a}: ${items.length} items (done ${by("done")}, todo ${by("todo")}, ask ${by("ask")}, blocked ${by("blocked")}, n/a ${by("na")})`);
  } else {
    console.error("usage: node fill.mjs <data.json> <out.html> | --extract <page.html> | --check <data.json>");
    process.exit(2);
  }
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
