/**
 * Puts Northstar Legal back to a known state, between rehearsals or before trying the full review.
 *
 *   bun legal-system/reset.ts friday   # the clip: Acme sent back by Jordan, its evidence in since 08:50
 *   bun legal-system/reset.ts fresh    # Thursday 10:00: both matters unreviewed, nothing published
 *
 * A running server reads the file on every call, so it needs no restart.
 */
import { STATE_FILE, saveState, seedFresh, seedFriday } from "./state";

const which = process.argv[2];
const seeds = { friday: seedFriday, fresh: seedFresh } as const;
if (which !== "friday" && which !== "fresh") {
  console.error("Usage: bun legal-system/reset.ts friday|fresh");
  process.exit(1);
}
const state = seeds[which]();
saveState(STATE_FILE, state);
console.info(`Northstar Legal reset to ${which} (${state.now}) in ${STATE_FILE}.`);
