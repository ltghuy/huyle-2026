// CODEOWNERS for the sample repo, and a simplified matcher for it. GitHub
// matches paths with gitignore-style patterns and the last matching line wins.
// The matcher covers `*`, `**`, `?`, anchored and directory patterns; it skips
// the rarer syntax.

export type OwnersLine = { pattern: string; owners: string[] };

export type OwnersFile = "ordered" | "catch-all-last" | "no-default";

// General rules first, specific ones after: the docs team owns Markdown files
// unless a team rule further down claims the folder.
const TEAM_RULES: OwnersLine[] = [
  { pattern: "*.md", owners: ["@acme/docs"] },
  { pattern: "/apps/web/", owners: ["@acme/web-team"] },
  { pattern: "/apps/admin/", owners: ["@acme/internal-tools"] },
  { pattern: "/apps/marketing/", owners: ["@acme/growth"] },
  { pattern: "/packages/auth/", owners: ["@acme/identity"] },
  { pattern: "/packages/billing/", owners: ["@acme/payments"] },
  { pattern: "/packages/ui/", owners: ["@acme/design-system"] },
  { pattern: "/packages/ui/src/tokens/", owners: ["@acme/design-system", "@acme/brand"] },
  { pattern: "/packages/api-client/", owners: ["@acme/platform"] },
  { pattern: "/packages/utils/", owners: ["@acme/platform"] },
];

const CATCH_ALL: OwnersLine = { pattern: "*", owners: ["@acme/platform"] };

export const OWNERS_FILES: Record<OwnersFile, OwnersLine[]> = {
  ordered: [CATCH_ALL, ...TEAM_RULES],
  "catch-all-last": [...TEAM_RULES, CATCH_ALL],
  "no-default": TEAM_RULES,
};

export function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

function patternToRegExp(pattern: string): RegExp {
  const dirOnly = pattern.endsWith("/");
  const body = pattern.replace(/^\/+/, "").replace(/\/+$/, "");
  // A slash at the start or in the middle anchors the pattern to the repo root.
  const anchored = pattern.startsWith("/") || body.includes("/");
  const source = body
    .split(/(\*\*|\*|\?)/)
    .map((part) => (part === "**" ? ".*" : part === "*" ? "[^/]*" : part === "?" ? "[^/]" : part.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  // A directory pattern matches everything inside it; a file pattern also matches a directory of that name and its contents.
  const tail = dirOnly ? "/.*" : "(/.*)?";
  return new RegExp(`${anchored ? "^" : "(^|.*/)"}${source}${tail}$`);
}

export function matches(pattern: string, path: string): boolean {
  return patternToRegExp(pattern).test(normalizePath(path));
}

export type OwnersResult = { matching: number[]; winner: number | null; owners: string[] };

/** Indexes of every matching line, and the last one, which decides the owners. */
export function ownersFor(lines: readonly OwnersLine[], path: string): OwnersResult {
  const matching = lines.flatMap((line, i) => (matches(line.pattern, path) ? [i] : []));
  const winner = matching.length > 0 ? matching[matching.length - 1] : null;
  return { matching, winner, owners: winner === null ? [] : lines[winner].owners };
}
