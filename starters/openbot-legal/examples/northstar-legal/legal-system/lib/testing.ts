// For tests only: load the data files from disk the way the server does, so the tests run against the
// same contracts, playbook and history as Northstar Legal. Copied from the web app's src/lib/testing.ts:
// it reads from northstar-legal/data/ and leaves out the signed-document collection, which is not copied.

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseContract } from "./contract";
import { parseReviewHistory } from "./learning";
import { MATTER_IDS } from "./matters";
import { parsePlaybook } from "./playbook";

export const readData = (name: string) => readFileSync(path.join(import.meta.dir, "../../data", name), "utf8");

export const contracts = Object.fromEntries(MATTER_IDS.map((id) => [id, parseContract(readData(`contracts/${id}.md`))]));
export const playbookText = readData("playbook.md");
export const playbook = parsePlaybook(playbookText);
export const history = parseReviewHistory(readData("review-history.jsonl"));
