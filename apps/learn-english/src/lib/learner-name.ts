/**
 * What the app calls the learner (feature 022): the name they chose, else their Google name.
 * The leaderboard shows the same (AC-024); the server applies the Google-name fallback there.
 */
export function learnerName(alias: string | undefined, googleName: string | undefined): string | undefined {
  return alias?.trim() || googleName?.trim() || undefined;
}
