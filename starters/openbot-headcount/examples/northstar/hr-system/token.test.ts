/**
 * Restarting Northstar HR must not change its token: OpenBot holds the copy connect.ts gave it and
 * has no way to learn a new one.
 */
import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureToken, savedToken } from "./token";

const directory = mkdtempSync(join(tmpdir(), "northstar-hr-token-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

test("the first start creates a token and every later start reuses it", () => {
  const environment = {
    NORTHSTAR_HR_TOKEN_FILE: join(directory, ".env.northstar-hr"),
  };
  expect(savedToken(environment)).toBeUndefined();

  const first = ensureToken(environment);
  expect(first.created).toBe(true);
  expect(first.token).toMatch(/^[0-9a-f]{48}$/);
  expect(statSync(environment.NORTHSTAR_HR_TOKEN_FILE).mode & 0o077).toBe(0);

  const restart = ensureToken(environment);
  expect(restart).toMatchObject({ created: false, token: first.token });
  // connect.ts reads the same value.
  expect(savedToken(environment)?.token).toBe(first.token);
});

test("NORTHSTAR_HR_TOKEN in the environment wins over the file", () => {
  const environment = {
    NORTHSTAR_HR_TOKEN_FILE: join(directory, ".env.northstar-hr"),
    NORTHSTAR_HR_TOKEN: "set-by-hand",
  };
  expect(ensureToken(environment)).toMatchObject({
    token: "set-by-hand",
    from: "NORTHSTAR_HR_TOKEN",
    created: false,
  });
});
