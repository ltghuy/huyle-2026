import { PROJECTS, project } from "./repo";

// Dependency policy, phantom dependencies and release planning for the sample
// repo. Release rules follow Changesets 3 (see .artifacts/research/monorepo-tooling.md).

// ---- Third-party version policy -------------------------------------------

export type VersionPolicy = "independent" | "single";

export const LIBRARY = "date-fns";
export const LATEST = "4.1.0";

/** What each project declares when every team upgrades on its own schedule. */
const INDEPENDENT: Record<string, string> = {
  web: "4.1.0",
  admin: "3.6.0",
  marketing: "2.30.0",
  auth: "4.1.0",
  billing: "3.6.0",
  ui: "4.1.0",
};

export function libraryVersions(policy: VersionPolicy) {
  const rows = Object.entries(INDEPENDENT).map(([id, version]) => ({
    project: id,
    declared: policy === "single" ? "catalog:" : `^${version}`,
    resolved: policy === "single" ? LATEST : version,
  }));
  const copies = new Set(rows.map((r) => r.resolved)).size;
  const behind = rows.filter((r) => r.resolved !== LATEST).map((r) => r.project);
  return { rows, copies, behind };
}

// ---- Phantom dependencies --------------------------------------------------

export type Layout = "hoisted" | "isolated";

/**
 * marketing imports lodash-es but never declares it; ui does declare it.
 * Returns what marketing's build does now, and after ui drops lodash-es.
 */
export function phantomOutcome(layout: Layout) {
  if (layout === "hoisted") {
    return {
      now: { ok: true, text: "lodash-es was hoisted to the root node_modules for ui, so marketing finds it by accident." },
      after: { ok: false, text: "Cannot find module 'lodash-es'. marketing's own code didn't change; another team's cleanup broke it." },
    };
  }
  return {
    now: { ok: false, text: "Right away: Cannot find module 'lodash-es'. Only declared dependencies are linked into marketing's node_modules, so you add it to package.json." },
    after: { ok: true, text: "marketing declares lodash-es itself, so ui dropping it changes nothing." },
  };
}

// ---- Releases --------------------------------------------------------------

export type Bump = "patch" | "minor" | "major";
export type ReleaseMode = "independent" | "fixed";
export type RangeStyle = "caret" | "exact";

export type Changeset = { id: number; pkg: string; bump: Bump; summary: string };

export type Release = {
  pkg: string;
  from: string;
  to: string;
  bump: Bump;
  reasons: string[];
  changes: Changeset[];
  updatedDeps: { pkg: string; version: string }[];
};

const ORDER: Record<Bump, number> = { patch: 0, minor: 1, major: 2 };
const maxBump = (a: Bump | undefined, b: Bump): Bump => (a && ORDER[a] >= ORDER[b] ? a : b);

export const PUBLISHED = PROJECTS.filter((p) => p.published).map((p) => p.id);

/** In fixed mode the group moves in lockstep, so every member starts on one version. */
const FIXED_VERSION = "2.3.0";

export function currentVersion(pkg: string, mode: ReleaseMode): string {
  return mode === "fixed" ? FIXED_VERSION : project(pkg).version!;
}

export function bumpVersion(version: string, bump: Bump): string {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Does `version` still satisfy the caret range `^base`? (0.x carets only allow patches.) */
export function inCaretRange(version: string, base: string): boolean {
  const [vM, vm, vp] = version.split(".").map(Number);
  const [bM, bm, bp] = base.split(".").map(Number);
  if (bM > 0) return vM === bM && (vm > bm || (vm === bm && vp >= bp));
  return vM === 0 && vm === bm && vp >= bp;
}

/**
 * Turn changesets into releases. A published dependent whose range the new
 * version leaves gets a patch bump (Changesets: "all updating of dependencies
 * is done as a patch bump"). `exact` ranges (workspace:*) are left by every
 * release; `caret` ranges (workspace:^) only by a major (or a 0.x minor).
 */
export function planRelease(changesets: readonly Changeset[], mode: ReleaseMode, ranges: RangeStyle): Release[] {
  const bumps = new Map<string, Bump>();
  const reasons = new Map<string, string[]>();
  const note = (pkg: string, reason: string) => reasons.set(pkg, [...(reasons.get(pkg) ?? []), reason]);

  for (const c of changesets) {
    bumps.set(c.pkg, maxBump(bumps.get(c.pkg), c.bump));
  }
  for (const pkg of bumps.keys()) note(pkg, "changeset");

  const next = (pkg: string) => bumpVersion(currentVersion(pkg, mode), bumps.get(pkg)!);

  // Pull in dependents until nothing changes (a patch to a dependent can in turn reach its dependents).
  let grew = true;
  while (grew) {
    grew = false;
    for (const pkg of PUBLISHED) {
      for (const dep of project(pkg).deps) {
        if (!bumps.has(dep)) continue;
        const leaves = ranges === "exact" || !inCaretRange(next(dep), currentVersion(dep, mode));
        if (leaves && !bumps.has(pkg)) {
          bumps.set(pkg, "patch");
          note(pkg, `dependency ${project(dep).name} left its range`);
          grew = true;
        }
      }
    }
  }

  if (mode === "fixed" && bumps.size > 0) {
    const top = [...bumps.values()].reduce<Bump>((a, b) => maxBump(a, b), "patch");
    for (const pkg of PUBLISHED) {
      if (bumps.get(pkg) !== top) note(pkg, "fixed group");
      bumps.set(pkg, top);
    }
  }

  return PUBLISHED.filter((pkg) => bumps.has(pkg)).map((pkg) => ({
    pkg,
    from: currentVersion(pkg, mode),
    to: next(pkg),
    bump: bumps.get(pkg)!,
    reasons: reasons.get(pkg) ?? [],
    changes: changesets.filter((c) => c.pkg === pkg),
    updatedDeps: project(pkg).deps.filter((d) => bumps.has(d) && (ranges === "exact" || !inCaretRange(next(d), currentVersion(d, mode)))).map((d) => ({ pkg: d, version: next(d) })),
  }));
}

const HEADING: Record<Bump, string> = { major: "Major Changes", minor: "Minor Changes", patch: "Patch Changes" };

/** The CHANGELOG.md entry Changesets would write for one release. */
export function changelog(release: Release): string {
  const sections = new Map<Bump, string[]>();
  for (const c of release.changes) sections.set(c.bump, [...(sections.get(c.bump) ?? []), `- ${c.summary.trim() || "(no summary)"}`]);
  if (release.updatedDeps.length > 0) {
    const lines = ["- Updated dependencies", ...release.updatedDeps.map((d) => `  - ${project(d.pkg).name}@${d.version}`)];
    sections.set("patch", [...(sections.get("patch") ?? []), ...lines]);
  }
  const body = (["major", "minor", "patch"] as const)
    .filter((b) => sections.has(b))
    .map((b) => `### ${HEADING[b]}\n\n${sections.get(b)!.join("\n")}`)
    .join("\n\n");
  return `## ${release.to}\n\n${body || "### Patch Changes\n\n- Version bump (fixed group)"}`;
}
