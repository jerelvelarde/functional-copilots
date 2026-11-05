/**
 * Records slide 15's clip: Open Harvey on OpenBot, "Friday morning", beats 1 to 5.
 *
 * Drives a headless Chromium through the real app with the real model, captures device-pixel
 * screenshots on a timer (1280x720 CSS at 1.5x = 1920x1080, about 8 a second), then assembles an
 * H.264 MP4 with ffmpeg. While the Bot is working the frames are
 * played faster (BUSY_SPEED), so model waits are shortened in the cut, not hidden.
 *
 * Before running: OpenBot up with the northstar-legal package, Northstar Legal connected, and
 * `bun examples/northstar-legal/legal-system/reset.ts friday`.
 *
 * Usage (from the OpenBot clone, which has playwright-core and its Chromium):
 *   bun ../building-functional-copilots-workshop/starters/openbot-legal/recording/record.ts [outDir]
 * Env: APP_URL (default http://localhost:3010), OPENBOT_DIR (default: cwd), BUSY_SPEED (default 1.5).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const OPENBOT_DIR = process.env.OPENBOT_DIR ?? process.cwd();
const APP = process.env.APP_URL ?? "http://localhost:3010";
const BUSY_SPEED = Number(process.env.BUSY_SPEED ?? 1.5);
const OUT = path.resolve(process.argv[2] ?? path.join(import.meta.dir, "out"));
const FRAMES = path.join(OUT, "frames");
mkdirSync(FRAMES, { recursive: true });

const { chromium } = createRequire(path.join(OPENBOT_DIR, "package.json"))(
  "playwright-core",
) as typeof import("playwright-core");

const PROMPTS = {
  status: "Where are we on Acme?",
  check: "Check Acme's evidence against PB-SEC-01 and resubmit it to Jordan.",
};

type Frame = { file: string; t: number };
const frames: Frame[] = [];
const busy: { start: number; end?: number }[] = [];
const marks: { t: number; label: string }[] = [];
const now = () => Date.now() / 1000;
const mark = (label: string) => {
  marks.push({ t: now(), label });
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${label}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
  colorScheme: "light",
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
// A timed capture, not CDP's screencast: the screencast sends a frame only when the compositor
// repaints, and after a client-side navigation a static page can go unsent for seconds (the Needs you
// board showed only when a hover repainted it). It also sends CSS-pixel frames. Page.captureScreenshot
// on a timer gets every state, at device pixels (1280x720 at 1.5x = 1920x1080).
let n = 0;
let capturing = false;
const CAPTURE_EVERY_MS = 120;
async function captureLoop() {
  while (capturing) {
    const started = Date.now();
    try {
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
      const file = path.join(FRAMES, `${String(n++).padStart(6, "0")}.jpg`);
      writeFileSync(file, Buffer.from(shot.data, "base64"));
      frames.push({ file, t: started / 1000 });
    } catch {
      // A capture during a navigation can fail; the next one picks up.
    }
    await new Promise((r) => setTimeout(r, Math.max(0, CAPTURE_EVERY_MS - (Date.now() - started))));
  }
}

const pause = (s: number) => page.waitForTimeout(s * 1000);
const still = (name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

async function ask(text: string) {
  const box = page.getByRole("textbox", { name: "Message" });
  await box.click();
  await box.pressSequentially(text, { delay: 45 });
  await pause(0.8);
  await box.press("Enter");
  busy.push({ start: now() });
  // Working: "Stop the Bot" replaces "Send message" until the turn ends, or until it stops to ask.
  await page.getByRole("button", { name: "Stop the Bot" }).waitFor({ timeout: 30_000 }).catch(() => {});
  await page.getByRole("button", { name: "Send message" }).waitFor({ timeout: 240_000 });
  busy.at(-1)!.end = now();
}

// Northstar Legal back to Friday 09:00 (it re-reads its state file on every call, so no restart).
const reset = Bun.spawnSync([process.execPath, "examples/northstar-legal/legal-system/reset.ts", "friday"], { cwd: OPENBOT_DIR });
if (reset.exitCode !== 0) throw new Error(`reset failed: ${reset.stderr.toString()}`);
console.log(reset.stdout.toString().trim());

// A clean slate before the camera rolls: delete earlier rehearsal conversations through the app's own
// API (DELETE /api/channels/:id, what "Delete conversation" calls), so the sidebar opens empty.
await page.goto(APP, { waitUntil: "networkidle" });
const removed = await page.evaluate(async () => {
  const res = await fetch("/api/channels", { credentials: "include" });
  if (!res.ok) return `list failed: ${res.status}`;
  const body = await res.json();
  const items: { id: string }[] = Array.isArray(body) ? body : (body.channels ?? body.items ?? body.data ?? []);
  for (const c of items) await fetch(`/api/channels/${c.id}`, { method: "DELETE", credentials: "include" });
  return `deleted ${items.length}`;
});
console.log(`clean slate: ${removed}`);

capturing = true;
const capture = captureLoop();

// Beat 1: Open Harvey home, the status question.
await page.goto(APP, { waitUntil: "networkidle" });
mark("beat 1: home");
await pause(4);
await ask(PROMPTS.status);
mark("beat 1: status answered");
await pause(18);
await still("beat-1");

// Beat 2: the evidence check. The same turn asks to resubmit, and a team rule makes OpenBot ask first.
await ask(PROMPTS.check);
await page.getByText("Resubmit for approval").last().scrollIntoViewIfNeeded().catch(() => {});
mark("beat 2: evidence table, resubmit waiting");
await pause(14);
await still("beat-2");

// Beat 3: the ask-first rule. Bots -> Needs you -> Allow, then back to the thread for the reply.
const thread = page.url();
await page.locator('a[href="/bots"]').first().click();
await page.getByText("Needs you").first().waitFor({ timeout: 30_000 });
mark("beat 3: needs you");
await pause(10);
await still("beat-3");
const allow = page.getByRole("button", { name: "Allow", exact: true }).first();
await allow.hover();
await pause(1);
await allow.click();
mark("beat 3: allowed");
await page.getByText("Needs you").first().waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
await pause(1.5);
await page.goto(thread, { waitUntil: "networkidle" });
busy.push({ start: now() });
await page.getByText("Resubmitted to Jordan Blake").filter({ visible: true }).first().waitFor({ timeout: 180_000 });
busy.at(-1)!.end = now();
await page.getByText("Resubmitted to Jordan Blake").filter({ visible: true }).first().scrollIntoViewIfNeeded();
mark("beat 3: resubmitted");
await pause(14);
await still("beat-3-reply");

// Beat 4: Admin -> Audit: the tool calls, the rule that asked, the person's decision, the resubmit.
await page.goto(`${APP}/admin/audit`, { waitUntil: "networkidle" });
mark("beat 4: audit");
// Held on the top rows, which are this take's own events; scrolling further shows earlier runs.
// The table loads after the page settles, and a static page can leave the screencast without a fresh
// frame, so wait for the rows, then rest the pointer on the four that tell the story (each hover
// repaints a row): the status call, the evidence check, Maya's decision, the resubmit.
await page.getByText("approval.person_decided").first().waitFor({ timeout: 30_000 });
await pause(3);
for (const text of ["legal/get_approval_status", "legal/check_security_evidence", "approval.person_decided", "legal/resubmit_for_approval"]) {
  await page.getByText(text).first().hover().catch(() => {});
  await pause(3);
}
await still("beat-4");

// Beat 5: the Contract Copilot's skills and access, then its approval rules.
await page.goto(`${APP}/bots/contract-copilot/access`, { waitUntil: "networkidle" });
mark("beat 5: skills and access");
await pause(16);
await still("beat-5");
await page.goto(`${APP}/bots/contract-copilot/approvals`, { waitUntil: "networkidle" });
mark("beat 5: approval rules");
await pause(10);
await still("beat-5-rules");
mark("end");

capturing = false;
await capture;
await browser.close();

// Assemble: each frame lasts until the next one; frames inside a busy window play BUSY_SPEED x.
const end = marks.at(-1)!.t;
const inBusy = (t: number) => busy.some((b) => t >= b.start && t < (b.end ?? end));
const lines: string[] = [];
let total = 0;
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? end;
  let d = Math.max(0.001, next - f.t);
  if (inBusy(f.t)) d /= BUSY_SPEED;
  total += d;
  lines.push(`file '${f.file}'`, `duration ${d.toFixed(3)}`);
});
lines.push(`file '${frames.at(-1)!.file}'`);
const list = path.join(OUT, "frames.txt");
writeFileSync(list, `${lines.join("\n")}\n`);
writeFileSync(path.join(OUT, "marks.json"), JSON.stringify({ marks, busy, frames: frames.length, seconds: total }, null, 2));
const mp4 = path.join(OUT, "open-harvey-openbot.mp4");
const ff = Bun.spawnSync([
  "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
  "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0xf6f5f1,fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", mp4,
]);
if (ff.exitCode !== 0) throw new Error(`ffmpeg failed: ${ff.stderr.toString()}`);
console.log(`${mp4}  (${total.toFixed(1)} s, ${frames.length} frames)`);
