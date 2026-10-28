import { useState } from "react";

// Screens whose intro has already played in this app run (resets when the app restarts).
const seen = new Set<string>();

/**
 * true only the first time a screen with this key mounts in this app run, so an intro
 * animation plays once and not again on every visit (e.g. Sign in -> back -> Sign in).
 */
export function useFirstVisit(key: string): boolean {
  // Decided once per mount: re-renders of the same screen keep the same answer.
  const [first] = useState(() => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return first;
}
