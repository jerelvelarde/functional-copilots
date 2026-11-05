#!/usr/bin/env node
// Checks a filled context map before you hand it over.
//   node skills/agent-context/scripts/check-map.mjs docs/copilot/agent-context.html [--json [out.json]]
// With --json, a map that passes is also written as JSON (default: agent-context.json beside the page),
// so /functional-copilot and /deploy can read the sources, identities, gates and server-side rows.
// Reads the JSON in the page's agent-context-data block. Prints every problem and exits 1 if there are
// errors. Warnings don't fail the check. Needs only Node; no dependencies.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !a.endsWith(".json"));
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt < 0 ? null : args[jsonAt + 1]?.endsWith(".json") ? args[jsonAt + 1] : join(dirname(file ?? "."), "agent-context.json");
if (!file) {
  console.error("Usage: node check-map.mjs <path to the filled agent-context.html>");
  process.exit(2);
}
const html = readFileSync(file, "utf8");
const block = html.match(/<script type="application\/json" id="agent-context-data">([\s\S]*?)<\/script>/);
if (!block) {
  console.error(`${file}: no <script type="application/json" id="agent-context-data"> block.`);
  process.exit(1);
}
let data;
try {
  data = JSON.parse(block[1]);
} catch (error) {
  console.error(`${file}: the data block is not valid JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const PLACEHOLDER = /^(Your |YYYY|Replace |One sentence: |The first job from the user map|The system the job writes to|your-copilot$)/;
const blank = (v) => v === undefined || v === null || String(v).trim() === "";

for (const key of ["function", "app", "date", "headline", "summary", "storageKey", "next"]) {
  if (blank(data[key])) errors.push(`"${key}" is empty.`);
  else if (PLACEHOLDER.test(String(data[key]))) errors.push(`"${key}" still holds the template's placeholder.`);
}

const sources = Array.isArray(data.sources) ? data.sources : [];
if (!sources.length) errors.push("No sources.");
const ids = new Set();
for (const s of sources) {
  const at = `Source ${s.id ?? "(no id)"}`;
  if (blank(s.id)) errors.push(`${at}: no id.`);
  else if (ids.has(s.id)) errors.push(`${at}: duplicate id.`);
  ids.add(s.id);
  if (PLACEHOLDER.test(String(s.name ?? ""))) errors.push(`${at}: still the template's placeholder.`);
  if (!(Number(s.ring) >= 1 && Number(s.ring) <= 7)) errors.push(`${at}: ring must be 1-7.`);
  for (const key of ["name", "where", "how", "actsAs", "scope", "freshness"]) {
    if (blank(s[key])) errors.push(`${at}: "${key}" is empty (put an undecided answer in "open" instead).`);
  }
  if (Number(s.ring) >= 3) {
    if (blank(s.runsOn)) errors.push(`${at}: rings 3-7 need "runsOn" (where it runs), so /deploy can place it.`);
    if (!Array.isArray(s.secretEnv)) errors.push(`${at}: rings 3-7 need "secretEnv": a list of env var names, or [] when it needs none.`);
  }
  for (const name of Array.isArray(s.secretEnv) ? s.secretEnv : []) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(String(name))) errors.push(`${at}: "${name}" is not an env var name. List names only, never values.`);
  }
  if (String(s.name ?? "").length > 32 && blank(s.short)) warnings.push(`${at}: a long name with no "short" crowds the rings diagram; add a 2-3 word "short".`);
  if (!["read", "write", "read-write"].includes(s.access)) errors.push(`${at}: access must be read, write or read-write.`);
  if (!["planned", "wired", "verified"].includes(s.status)) errors.push(`${at}: status must be planned, wired or verified.`);
  const gates = [s.gate ?? {}, ...(Array.isArray(s.gate?.also) ? s.gate.also : [])];
  gates.forEach((g, i) => {
    const where = i ? `gate.also[${i - 1}]` : "gate";
    if (!["none", "rule", "person"].includes(g?.kind)) errors.push(`${at}: ${where}.kind must be none, rule or person.`);
    if (blank(g?.text)) errors.push(`${at}: ${where}.text is empty.`);
  });
  if (s.gate?.also !== undefined && !Array.isArray(s.gate.also)) errors.push(`${at}: gate.also must be a list of gates.`);
  if ((s.access === "write" || s.access === "read-write") && !gates.some((g) => g?.kind === "person" || g?.kind === "rule")) {
    errors.push(`${at}: writes with no gate. Add the person or the rule that approves it.`);
  }
  if (s.phase !== undefined && !["v1", "later"].includes(s.phase)) errors.push(`${at}: phase must be v1 or later.`);
  const pointsToServerRecord = (String(s.note ?? "").match(/\bS\d+\b/g) ?? []).some((ref) => {
    const r = sources.find((x) => x.id === ref);
    return r && Number(r.ring) >= 3 && r.access !== "read";
  });
  if (Number(s.ring) <= 2 && (s.access === "write" || s.access === "read-write") && /localStorage|one browser|in the browser/i.test(String(s.where ?? "")) && !pointsToServerRecord) {
    warnings.push(`${at}: its record lives in one browser. If a second person (an approver, a reviewer) works on it, add a shared server record (ring 3) and name it in this row's note, or say in "open" why v1 doesn't need one.`);
  }
  if (!/`[^`]+`/.test(String(s.how ?? ""))) warnings.push(`${at}: "how" names no CopilotKit/AG-UI piece or file in backticks.`);
  if (!/docs\.copilotkit\.ai|`[^`]*(src\/|starters\/|@copilotkit\/|@ag-ui\/|\.tsx?|\.ya?ml)[^`]*`|github\.com/.test(String(s.how ?? ""))) {
    warnings.push(`${at}: "how" has no docs.copilotkit.ai link, package or starter file.`);
  }
}

const jobs = Array.isArray(data.jobs) ? data.jobs : [];
if (!jobs.length) errors.push("No jobs.");
const used = new Set();
for (const j of jobs) {
  const at = `Job ${j.id ?? "(no id)"}`;
  if (blank(j.name)) errors.push(`${at}: no name.`);
  if (PLACEHOLDER.test(String(j.name ?? ""))) errors.push(`${at}: still the template's placeholder.`);
  for (const ref of [...(j.sees ?? []), ...(j.touches ?? [])]) {
    if (!ids.has(ref)) errors.push(`${at}: refers to ${ref}, which is not a source.`);
    used.add(ref);
  }
  for (const ref of j.touches ?? []) {
    const s = sources.find((x) => x.id === ref);
    if (s && s.access === "read") warnings.push(`${at}: touches ${ref}, but ${ref} is read-only. Is "touches" right, or is the access wrong?`);
  }
}
for (const id of ids) if (!used.has(id)) warnings.push(`Source ${id}: no job sees or touches it.`);
const named = (re) => sources.some((s) => re.test(`${s.name ?? ""} ${s.short ?? ""}`));
if (!named(/model/i)) warnings.push('No row for the model provider. Everything in context and every tool result goes to it on each run: give it a row (ring 3) with its data owner\'s gate.');
if (!named(/telemetry/i)) warnings.push("No row for telemetry and logs. Decide on purpose what leaves in them: give them a row (ring 3).");

const items = Array.isArray(data.checklist) ? data.checklist : [];
if (!items.length) errors.push("No checklist items.");
const itemIds = new Set();
for (const it of items) {
  const at = `Checklist ${it.id ?? "(no id)"}`;
  if (blank(it.id)) errors.push(`${at}: no id.`);
  else if (itemIds.has(it.id)) errors.push(`${at}: duplicate id (ticks would be shared).`);
  itemIds.add(it.id);
  for (const key of ["what", "why", "how", "done"]) if (blank(it[key])) errors.push(`${at}: "${key}" is empty.`);
  if (!/`[^`]+`|docs\.copilotkit\.ai/.test(String(it.how ?? ""))) warnings.push(`${at}: "how" names no CopilotKit piece, file or docs link.`);
  for (const ref of it.about ?? []) if (!ids.has(ref)) errors.push(`${at}: about ${ref}, which is not a source.`);
}
if (/<\//.test(block[1].replace(/<\\\//g, ""))) errors.push('A string contains "</". Write "<\\/" instead, or the page breaks.');

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
const writes = sources.filter((s) => s.access !== "read").length;
console.log(
  `\n${file}: ${sources.length} sources (${writes} write), ${jobs.length} jobs, ${items.length} checklist items. ` +
    `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`,
);
if (jsonOut) {
  if (errors.length) console.log(`Not writing ${jsonOut}: fix the errors first.`);
  else {
    writeFileSync(jsonOut, JSON.stringify(data, null, 2) + "\n");
    console.log(`Wrote ${jsonOut}.`);
  }
}
process.exit(errors.length ? 1 : 0);
