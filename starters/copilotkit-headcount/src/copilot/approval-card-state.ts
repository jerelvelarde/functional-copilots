// Which draft the copilot's approval card is waiting on, if any. The card (useSubmitForApproval.tsx)
// sets it while it waits for a click; the Business case reads it, so the page shows one primary
// action at a time: while the card waits, the panel's Submit steps back and says where to click.
// Plain module state with useSyncExternalStore; it is UI state only and never persisted.

import { useSyncExternalStore } from "react";

let waitingOn: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  if (next === waitingOn) return;
  waitingOn = next;
  listeners.forEach((listener) => listener());
}

/** The card for `requestId` is open and waiting for the person's click. */
export function approvalCardOpened(requestId: string) {
  set(requestId);
}

/** The card for `requestId` was answered, or left the screen. */
export function approvalCardClosed(requestId: string) {
  if (waitingOn === requestId) set(null);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The id of the draft the approval card is waiting on, or null. */
export const useApprovalCardWaiting = () => useSyncExternalStore(subscribe, () => waitingOn, () => null);
