// Small presentational pieces shared by the panels and the chat cards: the card frame, tags, the
// verdict tag every check carries, and buttons. Colours come from the tokens in app/globals.css.

import { Check, CircleAlert, CircleDashed, Info, StickyNote } from "lucide-react";
import type { ReactNode } from "react";
import type { CheckStatus } from "@/lib/headcount";

/** A white work surface behind a hairline. Used for the chat cards and the error fallback. */
export function Card({ title, meta, aside, className = "", children }: { title: ReactNode; meta?: ReactNode; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-md border border-hairline bg-surface text-ink ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-3.5 py-2.5">
        <div className="min-w-0">
          <h3 className="text-body font-semibold">{title}</h3>
          {meta && <p className="mt-0.5 text-small text-muted">{meta}</p>}
        </div>
        {aside}
      </header>
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

export type Tone = "neutral" | "outline" | "green" | "red" | "amber";

const TONES: Record<Tone, string> = {
  neutral: "bg-stone text-ink",
  outline: "border border-hairline bg-surface text-muted",
  green: "bg-green-tint text-green",
  red: "bg-red-tint text-red",
  amber: "bg-amber-tint text-amber",
};

/** A muted tinted tag. It always carries a word: colour is never the only signal. */
export function Tag({ children, tone = "neutral", icon, className = "" }: { children: ReactNode; tone?: Tone; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-small font-medium ${TONES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

const VERDICT: Record<CheckStatus, { label: string; tone: Tone; Icon: typeof Check }> = {
  pass: { label: "Pass", tone: "green", Icon: Check },
  fail: { label: "Fix", tone: "red", Icon: CircleAlert },
  missing: { label: "Missing", tone: "red", Icon: CircleDashed },
  warn: { label: "Note", tone: "amber", Icon: StickyNote },
  info: { label: "Info", tone: "neutral", Icon: Info },
};

export const verdictLabel = (status: CheckStatus) => VERDICT[status].label;

/** The verdict of one check: an icon and a word, in the check's tone. */
export function VerdictTag({ status, className = "" }: { status: CheckStatus; className?: string }) {
  const { label, tone, Icon } = VERDICT[status];
  return (
    <Tag tone={tone} className={`w-[72px] justify-start ${className}`} icon={<Icon aria-hidden className="size-3 shrink-0" strokeWidth={2.25} />}>
      {label}
    </Tag>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "on-green";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-green text-on-green hover:bg-green-deep disabled:border disabled:border-hairline disabled:bg-stone disabled:text-muted",
  secondary: "border border-rule bg-surface text-ink hover:bg-stone disabled:text-muted disabled:hover:bg-surface",
  danger: "border border-rule bg-surface text-red hover:bg-red-tint disabled:text-muted disabled:hover:bg-surface",
  ghost: "text-muted hover:bg-stone hover:text-ink disabled:text-muted disabled:hover:bg-transparent",
  "on-green": "border border-on-green/35 text-on-green hover:bg-on-green/10",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] font-medium transition-colors duration-150 disabled:cursor-not-allowed ${
        size === "sm" ? "h-7 px-2.5 text-small" : "h-8 px-3.5 text-body"
      } ${VARIANTS[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
