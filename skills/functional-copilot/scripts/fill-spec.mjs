#!/usr/bin/env node
// Fill the /functional-copilot spec page with one copilot's spec, after checking it.
//
//   node fill-spec.mjs <spec.json> <out.html>    check, then write the template with the data
//   node fill-spec.mjs --check <spec.json>        check only
//   node fill-spec.mjs --extract <page.html>      print the JSON inside a filled page
//
// The template is ../assets/copilot-spec.html next to this script. Node 18 or later, no dependencies.
// The usual output is docs/copilot/copilot-spec.html in the developer's repo, next to the other
// suite pages, with the markdown spec beside it at docs/copilot/copilot-spec.md.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(HERE, "..", "assets", "copilot-spec.html");
const OPEN = '<script type="application/json" id="data">';
const CLOSE = "</script>";
const LAYERS = ["products", "capabilities", "knowledge", "data", "harness", "models", "governance"];
const FROM = new Set(["starter", "new", "mixed"]);
const RULE_ID = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*-\d{2,3}([/-]\d{2,3})*( v\d+)?$|^\*\(unwritten\)\*$|^\(unwritten\)$/;
// Shapes of real credentials. Variable names like OPENAI_API_KEY are fine; values are not.
const SECRET_SHAPES = [
  /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}/,
  /\b(?:sk|pk|rk)_live_[A-Za-z0-9]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function block(html, where) {
  const start = html.indexOf(OPEN);
  if (start < 0) throw new Error(`${where}: no data block (is this assets/copilot-spec.html?)`);
  const end = html.indexOf(CLOSE, start + OPEN.length);
  return { start: start + OPEN.length, end };
}

function check(d) {
  const errors = [];
  const warnings = [];
  const need = (v, what) => { if (v == null || String(v).trim() === "") errors.push(`missing ${what}`); };
  for (const k of ["title", "function", "workflow", "date", "shape", "starter", "workspace"]) need(d[k], `"${k}"`);
  if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) errors.push(`date "${d.date}" is not YYYY-MM-DD`);
  if (!["draft", "approved"].includes(d.status)) errors.push(`status must be "draft" or "approved", not ${JSON.stringify(d.status)}`);
  if (d.status === "approved" && !d.approvedBy) errors.push(`an approved spec names who approved it ("approvedBy")`);
  for (const k of ["trigger", "artifact", "requester", "approvers"]) need((d.headline || {})[k], `headline.${k}`);
  for (const id of LAYERS) {
    const L = (d.stack || {})[id];
    if (!L) { errors.push(`stack is missing layer "${id}" (all seven: ${LAYERS.join(", ")})`); continue; }
    need(L.thisCopilot, `stack.${id}.thisCopilot`);
    if (!FROM.has(L.from)) errors.push(`stack.${id}.from must be one of ${[...FROM].join(", ")}`);
  }
  for (const k of Object.keys(d.stack || {})) if (!LAYERS.includes(k)) errors.push(`stack has an unknown layer "${k}"`);
  const rules = d.rules || [];
  if (!rules.length) errors.push("no rules: every copilot has rules with ids");
  const ids = new Set();
  for (const r of rules) {
    if (!r.id) errors.push(`a rule has no id: "${(r.rule || "").slice(0, 60)}"`);
    else if (!RULE_ID.test(r.id)) warnings.push(`rule id "${r.id}" doesn't look like POL-AREA-01`);
    if (ids.has(r.id)) errors.push(`duplicate rule id "${r.id}"`);
    ids.add(r.id);
    need(r.rule, `rule text for ${r.id}`);
    need(r.enforcedIn, `"enforcedIn" for ${r.id} (the function that checks it)`);
  }
  if (!(d.gates || []).length) errors.push("no gates: every write needs a person's click");
  if (!(d.route || []).length) errors.push("no approval route");
  if (!(d.actors || []).length) errors.push("no actors");
  if (!((d.scope || {}).in || []).length) errors.push("scope.in is empty");
  if (!((d.scope || {}).out || []).length) warnings.push("scope.out is empty: say what is not in v1");
  if (!Array.isArray(d.assumptions)) errors.push(`"assumptions" must be a list (it can be empty)`);
  if (!(d.derived || []).length) warnings.push("no derived values: most copilots compute something (a total, a route, a date)");
  const text = JSON.stringify(d);
  for (const re of SECRET_SHAPES) if (re.test(text)) errors.push(`something shaped like a real credential matches ${re}; never put key values in the spec`);
  return { errors, warnings };
}

function embed(obj) {
  // "<" as < keeps "</script>" and "<!--" out of the block; JSON.parse reads it back unchanged.
  return JSON.stringify(obj, null, 1).replace(/</g, "\\u003c");
}

const args = process.argv.slice(2);
try {
  if (args[0] === "--extract") {
    const html = readFileSync(args[1], "utf8");
    const { start, end } = block(html, args[1]);
    process.stdout.write(html.slice(start, end).trim() + "\n");
    process.exit(0);
  }
  const checkOnly = args[0] === "--check";
  const [src, out] = checkOnly ? [args[1]] : args;
  if (!src || (!checkOnly && !out)) {
    console.error("usage: node fill-spec.mjs <spec.json> <out.html> | --check <spec.json> | --extract <page.html>");
    process.exit(2);
  }
  const data = JSON.parse(readFileSync(src, "utf8"));
  const { errors, warnings } = check(data);
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) {
    console.error(`fill-spec: not filled:\n  - ${errors.join("\n  - ")}`);
    process.exit(1);
  }
  if (checkOnly) { console.log(`${src}: ok (${(data.rules || []).length} rules, ${(data.gates || []).length} gates)`); process.exit(0); }
  const html = readFileSync(TEMPLATE, "utf8");
  const { start, end } = block(html, TEMPLATE);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html.slice(0, start) + embed(data) + html.slice(end));
  console.log(`wrote ${out}: ${data.title}, ${data.status}, ${(data.rules || []).length} rules, ${(data.gates || []).length} gates, ${(data.assumptions || []).length} assumptions`);
} catch (e) {
  console.error(`fill-spec: ${e.message}`);
  process.exit(1);
}
