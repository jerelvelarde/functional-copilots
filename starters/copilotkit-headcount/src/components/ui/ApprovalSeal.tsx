// The approval seal: the request's state drawn as one data graphic, in the manner of a security print.
//
// - One petal per check, in policy order from the top, clockwise. A passing check is inked in
//   Northstar green; a check that fails or is missing is red (a person must act on it); a check
//   that only informs (the cost, the chain, a note) is muted.
// - One ring per approver, innermost first. Pending is dashed and lighter; approved is drawn solid;
//   sent back or rejected is a broken red ring.
//
// It is drawn from live state on every render. When a check or a signature changes, that stroke
// inks in once (app/globals.css .seal-ink); the first render never animates, and reduced motion
// shows the final state at once. Screen readers get the same facts as a sentence.

import { useState } from "react";
import type { CheckStatus } from "@/lib/headcount";

export type SealCheck = { id: string; status: CheckStatus };
export type SignerState = "pending" | "approved" | "sent_back" | "rejected";
export type SealSigner = { name: string; state: SignerState };

const INK = { green: "#1E4634", red: "#B42318", muted: "#6B675F", ink: "#16140F" };

const petalInk = (status: CheckStatus) => (status === "pass" ? INK.green : status === "fail" || status === "missing" ? INK.red : INK.muted);

/** "9 rules · 8 pass · 1 to fix" and "3 approvers · 1 signed", for the legend beside the large seal. */
export function sealSummary(checks: readonly SealCheck[], signers: readonly SealSigner[]) {
  const pass = checks.filter((c) => c.status === "pass").length;
  const toFix = checks.filter((c) => c.status === "fail" || c.status === "missing").length;
  const signed = signers.filter((s) => s.state === "approved").length;
  const returned = signers.find((s) => s.state === "sent_back" || s.state === "rejected");
  return {
    pass,
    toFix,
    signed,
    rules: `${checks.length} ${checks.length === 1 ? "check" : "checks"} · ${pass} pass${toFix ? ` · ${toFix} to fix` : ""}`,
    approvers:
      signers.length === 0
        ? "Approvers once the cost is known"
        : `${signers.length} ${signers.length === 1 ? "approver" : "approvers"} · ${signed} signed${returned ? ` · ${returned.state === "sent_back" ? "sent back" : "rejected"}` : ""}`,
  };
}

function sealLabel(requestId: string, checks: readonly SealCheck[], signers: readonly SealSigner[]) {
  const { pass, toFix, signed } = sealSummary(checks, signers);
  const returned = signers.find((s) => s.state === "sent_back" || s.state === "rejected");
  const people = signers.length
    ? `${signed} of ${signers.length} approvers signed${returned ? `; ${returned.state === "sent_back" ? "sent back" : "rejected"} by ${returned.name}` : ""}`
    : "no approvers yet";
  return `Approval seal for ${requestId}: ${pass} of ${checks.length} checks pass${toFix ? `, ${toFix} to fix` : ""}; ${people}.`;
}

// ---------------------------------------------------------------------------------------------
// Which strokes changed since mount, so only those ink in

type Ink = { status: string; count: number; delay: number };

function useInk(entries: readonly (readonly [string, string])[]): Record<string, Ink> {
  const signature = entries.map(([key, status]) => `${key}=${status}`).join("|");
  const [seen, setSeen] = useState(() => ({
    signature,
    map: Object.fromEntries(entries.map(([key, status]) => [key, { status, count: 0, delay: 0 }])) as Record<string, Ink>,
  }));
  if (seen.signature === signature) return seen.map;
  // Adjust state while rendering: the strokes that changed get a new count (a remount, so they ink
  // in) and a delay by their order, so a whole seal filling at once reads as one stroke of the pen.
  const map = { ...seen.map };
  let order = 0;
  for (const [key, status] of entries) {
    const before = map[key];
    if (before && before.status === status) continue;
    map[key] = { status, count: (before?.count ?? 0) + 1, delay: order++ * 45 };
  }
  setSeen({ signature, map });
  return map;
}

// ---------------------------------------------------------------------------------------------

const polar = (r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)] as const;
};

function arc(r: number, from: number, to: number) {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  return `M${x0.toFixed(3)} ${y0.toFixed(3)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`;
}

export function ApprovalSeal({
  requestId,
  checks,
  signers,
  size = 88,
  label,
  className = "",
}: {
  requestId: string;
  checks: readonly SealCheck[];
  signers: readonly SealSigner[];
  size?: number;
  /** Overrides the generated description, e.g. for the empty seal before a request exists. */
  label?: string;
  className?: string;
}) {
  const fine = size >= 64; // the large seal draws three nested lines per petal; the small one, one
  const ink = useInk([...checks.map((c) => [`p:${c.id}`, c.status] as const), ...signers.map((s, i) => [`r:${i}`, s.state] as const)]);

  const n = Math.max(checks.length, 1);
  const petalWidth = Math.min(8.5, Math.max(3.5, 16 * Math.sin(Math.PI / n) * 1.05));
  const ringGap = signers.length > 3 ? 3.3 : 4.4;
  const allSigned = signers.length > 0 && signers.every((s) => s.state === "approved");
  // Weights chosen to survive a Zoom screen share at 88px: nothing under 0.8 units (0.7px)
  const stroke = fine ? { outer: 1.8, mid: 1.1, inner: 0.8, ring: 2.1, pending: 1.1, frame: 0.8 } : { outer: 2.6, mid: 0, inner: 0, ring: 3.2, pending: 2, frame: 1.4 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      role="img"
      aria-label={label ?? sealLabel(requestId, checks, signers)}
      className={`block shrink-0 ${className}`}
    >
      {/* The frame the petals sit in */}
      <circle r={33} fill="none" stroke={INK.muted} strokeOpacity={0.5} strokeWidth={stroke.frame} />

      {/* Approver rings */}
      {signers.map((signer, i) => {
        const r = 37 + i * ringGap;
        const { count, delay } = ink[`r:${i}`] ?? { count: 0, delay: 0 };
        const inked = count > 0 ? "seal-ink" : "";
        const style = { "--ink-delay": `${delay}ms` } as React.CSSProperties;
        if (signer.state === "pending") {
          return (
            <circle
              key={`r${i}-${count}`}
              r={r}
              fill="none"
              stroke={INK.muted}
              strokeOpacity={0.75}
              strokeWidth={stroke.pending}
              strokeDasharray={fine ? "1.6 2.4" : "3 4"}
            />
          );
        }
        if (signer.state === "approved") {
          return (
            <circle
              key={`r${i}-${count}`}
              r={r}
              fill="none"
              stroke={INK.green}
              strokeWidth={stroke.ring}
              pathLength={1}
              transform="rotate(-90)"
              className={inked}
              style={style}
            />
          );
        }
        // Sent back or rejected: a broken red ring (three arcs, or six for a rejection)
        const pieces = signer.state === "sent_back" ? 3 : 6;
        const span = 360 / pieces;
        return (
          <g key={`r${i}-${count}`} fill="none" stroke={INK.red} strokeWidth={stroke.ring}>
            {Array.from({ length: pieces }, (_, k) => (
              <path key={k} d={arc(r, k * span + span * 0.14, (k + 1) * span - span * 0.14)} pathLength={1} className={inked} style={style} />
            ))}
          </g>
        );
      })}

      {/* One petal per check */}
      {checks.map((check, i) => {
        const { count, delay } = ink[`p:${check.id}`] ?? { count: 0, delay: 0 };
        const color = petalInk(check.status);
        const inked = count > 0 ? "seal-ink" : "";
        const style = { "--ink-delay": `${delay}ms` } as React.CSSProperties;
        return (
          <g
            key={`${check.id}-${count}`}
            transform={`rotate(${(i * 360) / n})`}
            fill="none"
            stroke={color}
          >
            <ellipse cy={-17} rx={petalWidth} ry={14} strokeWidth={stroke.outer} pathLength={1} className={inked} style={style} />
            {fine && <ellipse cy={-17.5} rx={petalWidth * 0.62} ry={10} strokeWidth={stroke.mid} pathLength={1} className={inked} style={style} />}
            {fine && <ellipse cy={-18} rx={petalWidth * 0.28} ry={6} strokeWidth={stroke.inner} pathLength={1} className={inked} style={style} />}
          </g>
        );
      })}

      {/* The boss: green once every approver has signed */}
      <circle r={fine ? 4.4 : 6} fill="#FFFFFF" stroke={INK.ink} strokeOpacity={0.6} strokeWidth={fine ? 0.9 : 1.4} />
      <circle r={fine ? 1.7 : 2.6} fill={allSigned ? INK.green : INK.muted} />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// The large seal with its key: a petal for each check, a ring for each approver, and the number

/** A single petal in the seal's green: a pointed leaf with its inner line, so it never reads as a 0. */
function PetalGlyph() {
  return (
    <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden className="shrink-0">
      <g transform="rotate(40)" fill="none" stroke={INK.green} strokeLinejoin="round">
        <path d="M0 -5.4 C2.9 -2.6 2.9 2.6 0 5.4 C-2.9 2.6 -2.9 -2.6 0 -5.4Z" fill="#E8EFEA" strokeWidth="1.3" />
        <path d="M0 -3.6 V3.6" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

function RingGlyph() {
  return (
    <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden className="shrink-0">
      <circle r="4.6" fill="none" stroke={INK.ink} strokeWidth="1.3" strokeDasharray="2 1.6" />
    </svg>
  );
}

export function SealWithKey({ requestId, checks, signers }: { requestId: string; checks: readonly SealCheck[]; signers: readonly SealSigner[] }) {
  const { pass, signed } = sealSummary(checks, signers);
  return (
    <div className="flex items-center gap-3.5">
      <dl className="space-y-1 text-small text-muted">
        <div className="flex items-center justify-end gap-2">
          <PetalGlyph />
          <dt className="sr-only">Checks</dt>
          <dd>
            <span className="font-semibold text-ink">{checks.length}</span> checks · {pass} pass
          </dd>
        </div>
        <div className="flex items-center justify-end gap-2">
          <RingGlyph />
          <dt className="sr-only">Approvers</dt>
          <dd>
            <span className="font-semibold text-ink">{signers.length}</span> approvers · {signed} signed
          </dd>
        </div>
      </dl>
      <figure className="flex shrink-0 flex-col items-center gap-1">
        <ApprovalSeal requestId={requestId} checks={checks} signers={signers} size={88} />
        <figcaption className="font-mono text-small text-ink">{requestId}</figcaption>
      </figure>
    </div>
  );
}
