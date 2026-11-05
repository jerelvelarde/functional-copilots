// Where a base salary sits in its band: the band from minimum to maximum, a tick at the midpoint,
// and a dot at the base. The stretch from the midpoint to the base turns red only when a rule asks
// for something (POL-COMP-01: above the midpoint needs a reason).

import type { CompBand } from "@/lib/headcount";
import { usd } from "./format";

export function BandBar({ band, base, needsAction }: { band: CompBand; base: number; needsAction: boolean }) {
  const width = 132;
  const pad = 4;
  const x = (amount: number) => pad + ((Math.min(Math.max(amount, band.min), band.max) - band.min) / (band.max - band.min)) * (width - pad * 2);
  const mid = x(band.mid);
  const dot = x(base);
  const position =
    base > band.max ? "above the maximum" : base < band.min ? "below the minimum" : base > band.mid ? "above the midpoint" : base === band.mid ? "at the midpoint" : "below the midpoint";
  return (
    <svg
      width={width}
      height={16}
      viewBox={`0 0 ${width} 16`}
      role="img"
      aria-label={`${usd(base)} is ${position} of the ${usd(band.min)} to ${usd(band.max)} band (midpoint ${usd(band.mid)})`}
      className="shrink-0"
    >
      <path d={`M${pad} 8H${width - pad}M${pad} 4.5v7M${width - pad} 4.5v7`} stroke="#D4D1C9" fill="none" />
      <path d={`M${mid} 2.5v11`} stroke="#6B675F" />
      {dot !== mid && <path d={`M${mid} 8H${dot}`} stroke={needsAction ? "#B42318" : "#6B675F"} strokeWidth={2} />}
      <circle cx={dot} cy={8} r={3.5} fill="#16140F" stroke="#FFFFFF" strokeWidth={1.5} />
    </svg>
  );
}
