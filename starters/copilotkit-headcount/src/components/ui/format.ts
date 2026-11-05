// Display helpers shared by the panels and the chat cards.

import { getPerson, type Quarter, type RequestType } from "@/lib/headcount";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const usd = (amount: number) => currency.format(amount);

export const dateLabel = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const quarterLabel = (quarter: Quarter) => `${quarter} FY2027`;

export const typeLabel = (type: RequestType) => (type === "net_new" ? "Net-new" : "Backfill");

export const personName = (id: string) => getPerson(id).name;

/**
 * A base salary typed by a person. "225,000.00", "$225k" and "225000" are all 225000; an empty field
 * clears the value. Anything ambiguous is rejected instead of guessed: misplaced commas ("22,5000"),
 * a dot that could be a thousands separator ("225.000"), two dots, or a zero.
 */
export function parseMoney(text: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = text.trim().replace(/^\$\s*/, "");
  if (trimmed === "") return { ok: true, value: null };
  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*([kK])?$/.exec(trimmed);
  if (!match) return { ok: false };
  const [, whole, decimals = "", thousands] = match;
  if (!thousands && decimals.length > 2) return { ok: false }; // "225.000": 225 or 225,000?
  const amount = Number(`${whole.replace(/,/g, "")}${decimals ? `.${decimals}` : ""}`) * (thousands ? 1000 : 1);
  const value = Math.round(amount);
  return Number.isFinite(value) && value > 0 ? { ok: true, value } : { ok: false };
}
