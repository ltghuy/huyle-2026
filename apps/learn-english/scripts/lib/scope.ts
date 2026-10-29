// A content scope is the name of a source file without `.json`: a CEFR level
// (content/word/A1.json) or a vocabulary set (content/word/set-it.json,
// feature 012). The review, audio and drafting scripts work per scope.
import { LEVELS } from "../../src/learning/types";

const SET_SCOPE = /^set-[a-z0-9][a-z0-9-]*$/;

export function isSetScope(scope: string): boolean {
  return SET_SCOPE.test(scope);
}

export function isScope(scope: string): boolean {
  return (LEVELS as readonly string[]).includes(scope) || isSetScope(scope);
}

/** `set-it` → `set:it`, the id of the set the scope's files belong to. */
export function setIdOf(scope: string): string {
  return `set:${scope.slice("set-".length)}`;
}

/** The scopes among a folder's file names (levels in order, then sets by name), or only `wanted`. */
export function scopesOf(fileNames: readonly string[], wanted?: string): string[] {
  const scopes = fileNames.filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -".json".length)).filter(isScope);
  const rank = (scope: string) => {
    const level = (LEVELS as readonly string[]).indexOf(scope);
    return level === -1 ? LEVELS.length : level;
  };
  const sorted = scopes.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return wanted ? sorted.filter((scope) => scope === wanted) : sorted;
}

export const SCOPE_HINT = `${LEVELS.join(", ")} or set-<slug>`;
