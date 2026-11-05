// Server-only reads of the two data files that are not JSON (JSON files are imported directly), and
// the choice of model. The files in src/data are copies of ../shared-data, which is the source of
// truth: `npm run sync-data`.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { parseHistory } from "./learning";
import { createMockModel } from "./mock-model";

const dataFile = (name: string) => readFileSync(path.join(process.cwd(), "src", "data", name), "utf8");

export const readPolicies = () => dataFile("policies.md");
export const readApprovalHistory = () => parseHistory(dataFile("approval-history.jsonl"));

// ---------------------------------------------------------------------------------------------
// The model, chosen in one place. COPILOT_MODEL in .env.local overrides it (any provider/model id).
// COPILOT_MODEL=mock, or no OPENAI_API_KEY, runs the scripted mock (lib/mock-model.ts) instead: it
// plays the README demo with no key and no network.

export const DEFAULT_MODEL = "openai/gpt-5.4-mini";
export const MOCK_MODEL = "mock";

export function copilotModel(): string {
  const configured = process.env.COPILOT_MODEL?.trim();
  if (configured === MOCK_MODEL || !process.env.OPENAI_API_KEY?.trim()) return MOCK_MODEL;
  return configured || DEFAULT_MODEL;
}

export const usesMockModel = () => copilotModel() === MOCK_MODEL;

/**
 * Whether the chat can answer, from the model choice itself: the scripted mock needs no key, and
 * copilotModel() only picks a provider model when its key is set. So with no key, or a blank one, the
 * chat still answers (on the mock) instead of showing a disabled box.
 */
export const chatEnabled = () => usesMockModel() || Boolean(process.env.OPENAI_API_KEY?.trim());

/** What BuiltInAgent runs on: a provider/model id, or the mock model itself. */
export function agentModel(): string | LanguageModelV3 {
  if (!usesMockModel()) return copilotModel();
  console.info("[copilot] Running on the scripted mock model (COPILOT_MODEL=mock or no OPENAI_API_KEY).");
  return createMockModel();
}

/** The model name in the chat header. */
export const modelLabel = () => (usesMockModel() ? "mock · scripted demo" : copilotModel());
