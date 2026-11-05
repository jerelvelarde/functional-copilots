// Server-only reads of the data files that are not JSON (JSON files are imported directly), and the
// choice of model.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { SIGNED_DOC_IDS } from "./collection";
import { parseContract, type Contract } from "./contract";
import { parseReviewHistory } from "./learning";
import { MATTER_IDS } from "./matters";
import { createMockModel } from "./mock-model";

const dataFile = (name: string) => readFileSync(path.join(process.cwd(), "src", "data", name), "utf8");

export const readPlaybook = () => dataFile("playbook.md");
export const readReviewHistory = () => parseReviewHistory(dataFile("review-history.jsonl"));
/** The two matters' contracts, and the six signed contracts in the Vendor contracts 2026 collection (lib/collection.ts). */
export const readContracts = (): Record<string, Contract> => ({
  ...Object.fromEntries(MATTER_IDS.map((id) => [id, parseContract(dataFile(path.join("contracts", `${id}.md`)))])),
  ...Object.fromEntries(SIGNED_DOC_IDS.map((id) => [id, parseContract(dataFile(path.join("collection", `${id}.md`)))])),
});

// ---------------------------------------------------------------------------------------------
// The model, chosen in one place. COPILOT_MODEL in .env.local overrides it (any provider/model id).
// The scripted mock (lib/mock-model.ts) plays the README demo with no key and no network. It runs:
// - with COPILOT_MODEL=mock, or without the key for the model's provider (OPENAI_API_KEY for the default);
// - in a production build (`npm start`, `npm run start:public`, any deploy) unless ALLOW_REAL_MODEL=true.
//   The runtime endpoint has no auth, so a deployed server with a key would let anyone run the agent on
//   it. In production the real model is opt-in, and belongs behind your own auth.

export const DEFAULT_MODEL = "openai/gpt-5.4-mini";
export const MOCK_MODEL = "mock";

type Env = Record<string, string | undefined>;

/**
 * The environment variable the CopilotKit runtime reads for each provider's key (resolveModel in
 * @copilotkit/runtime). Vertex signs in with Google credentials from the environment, not a key.
 */
const PROVIDER_KEYS: Record<string, string | null> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  gemini: "GOOGLE_API_KEY",
  "google-gemini": "GOOGLE_API_KEY",
  minimax: "MINIMAX_API_KEY",
  vertex: null,
};

/** The key a "provider/model" (or "provider:model") id needs, or null when it needs none we can check. */
export function keyFor(model: string): string | null {
  const provider = model.split(/[:/]/)[0].trim().toLowerCase();
  return PROVIDER_KEYS[provider] ?? null;
}

/** The model to run, and why it is the mock when it is (null when it is the real one). */
export function chooseModel(env: Env = process.env): { model: string; mockReason: string | null } {
  const configured = env.COPILOT_MODEL?.trim();
  if (configured === MOCK_MODEL) return { model: MOCK_MODEL, mockReason: "COPILOT_MODEL=mock" };
  const model = configured || DEFAULT_MODEL;
  const key = keyFor(model);
  if (key && !env[key]?.trim()) return { model: MOCK_MODEL, mockReason: `no ${key}` };
  if (env.NODE_ENV === "production" && env.ALLOW_REAL_MODEL?.trim() !== "true") {
    return { model: MOCK_MODEL, mockReason: `production build without ALLOW_REAL_MODEL=true; ${key ? `${key} is` : "the model's credentials are"} ignored` };
  }
  return { model, mockReason: null };
}

export const copilotModel = (env: Env = process.env) => chooseModel(env).model;

export const usesMockModel = (env: Env = process.env) => copilotModel(env) === MOCK_MODEL;

/** The chat always answers: on the mock, or on the provider when its key is set (chooseModel checks it). */
export const chatEnabled = () => true;

/** What BuiltInAgent runs on: a provider/model id, or the mock model itself. */
export function agentModel(): string | LanguageModelV3 {
  const { model, mockReason } = chooseModel();
  if (!mockReason) return model;
  console.info(`[copilot] Running on the scripted mock model (${mockReason}).`);
  return createMockModel();
}

/** The model name in the chat header. */
export const modelLabel = () => (usesMockModel() ? "mock · scripted demo" : copilotModel());
