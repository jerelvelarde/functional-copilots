/**
 * The bearer token Northstar HR requires, kept in one file so it survives a restart.
 *
 * OpenBot stores the token `connect.ts` gave it and sends it on every call. A server that minted a
 * new token on each start would refuse all of them until `connect.ts` ran again, so the first start
 * writes the token to `.env.northstar-hr` beside this file and every later start reads it back.
 * OpenBot's `.gitignore` already ignores `.env.*`, so the file stays out of a commit.
 *
 * `NORTHSTAR_HR_TOKEN` in the environment wins over the file, for anyone who keeps it elsewhere, and
 * `NORTHSTAR_HR_TOKEN_FILE` moves the file.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const NAME = "NORTHSTAR_HR_TOKEN";

export function tokenFile(environment = process.env): string {
  return (
    environment.NORTHSTAR_HR_TOKEN_FILE?.trim() ||
    fileURLToPath(new URL(".env.northstar-hr", import.meta.url))
  );
}

/** The token from the environment or the file, or undefined when neither has one. */
export function savedToken(
  environment = process.env,
): { token: string; from: string } | undefined {
  const fromEnvironment = environment[NAME]?.trim();
  if (fromEnvironment) return { token: fromEnvironment, from: NAME };
  const file = tokenFile(environment);
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((entry) => entry.startsWith(`${NAME}=`));
  const token = line?.slice(NAME.length + 1).trim();
  return token ? { token, from: file } : undefined;
}

/** The saved token, or a new one written to the file for every later start to reuse. */
export function ensureToken(environment = process.env): {
  token: string;
  from: string;
  created: boolean;
} {
  const saved = savedToken(environment);
  if (saved) return { ...saved, created: false };
  const token = randomBytes(24).toString("hex");
  const file = tokenFile(environment);
  writeFileSync(
    file,
    `# Northstar HR's bearer token. connect.ts gives the same value to OpenBot.\n${NAME}=${token}\n`,
    { mode: 0o600 },
  );
  return { token, from: file, created: true };
}
