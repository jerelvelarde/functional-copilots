// Money typed into the Business case: one number, or a refusal. Never digits glued together.

import { describe, expect, it } from "vitest";
import { parseMoney } from "./format";

describe("parseMoney", () => {
  it('reads "225,000.00", "$225k" and "225000" as 225000', () => {
    for (const text of ["225,000.00", "$225k", "225000", "$ 225,000", "225K", "225.0k", " 225000 "]) {
      expect(parseMoney(text), text).toEqual({ ok: true, value: 225_000 });
    }
  });

  it("rounds cents and fractional thousands to whole dollars", () => {
    expect(parseMoney("212,999.50")).toEqual({ ok: true, value: 213_000 });
    expect(parseMoney("212.5k")).toEqual({ ok: true, value: 212_500 });
  });

  it("an empty field clears the value", () => {
    expect(parseMoney("")).toEqual({ ok: true, value: null });
    expect(parseMoney("$")).toEqual({ ok: true, value: null });
  });

  it("rejects anything ambiguous instead of gluing decimals", () => {
    for (const text of ["225.000", "22,5000", "225,00", "1.234.567", "225k000", "abc", "-225000", "0", "225,000.00.00", "$225m"]) {
      expect(parseMoney(text), text).toEqual({ ok: false });
    }
  });
});
