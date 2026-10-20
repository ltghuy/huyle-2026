"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { project } from "./repo";
import {
  LATEST,
  LIBRARY,
  PUBLISHED,
  changelog,
  currentVersion,
  libraryVersions,
  phantomOutcome,
  planRelease,
  type Bump,
  type Changeset,
  type Layout,
  type RangeStyle,
  type ReleaseMode,
  type VersionPolicy,
} from "./versioning";

const POLICY_OPTIONS = [
  { value: "independent", label: "Each project picks its version" },
  { value: "single", label: "One version for the repo (catalog)" },
] as const;
const LAYOUT_OPTIONS = [
  { value: "hoisted", label: "Hoisted (flat node_modules)" },
  { value: "isolated", label: "Isolated (only declared deps)" },
] as const;
const MODE_OPTIONS = [
  { value: "independent", label: "Independent versions" },
  { value: "fixed", label: "Fixed (lockstep) group" },
] as const;
const RANGE_OPTIONS = [
  { value: "caret", label: "workspace:^ (caret range)" },
  { value: "exact", label: "workspace:* (exact version)" },
] as const;
const BUMP_OPTIONS = [
  { value: "patch", label: "patch" },
  { value: "minor", label: "minor" },
  { value: "major", label: "major" },
] as const;
const PACKAGE_OPTIONS = PUBLISHED.map((id) => ({ value: id, label: <span className="font-mono text-xs">{project(id).name}</span> }));

const heading = "text-sm font-semibold";

export function VersioningDemo() {
  return (
    <div className="flex flex-col gap-8">
      <PolicyPart />
      <PhantomPart />
      <ReleasePart />
    </div>
  );
}

function PolicyPart() {
  const [policy, setPolicy] = useState<VersionPolicy>("independent");
  const { rows, copies, behind } = libraryVersions(policy);
  return (
    <section aria-labelledby="policy-heading" className="flex flex-col gap-3">
      <h4 id="policy-heading" className={heading}>
        1. One third-party library ({LIBRARY}), six projects
      </h4>
      <Choice legend="Version policy" value={policy} options={POLICY_OPTIONS} onChange={setPolicy} />
      <div role="region" aria-label={`${LIBRARY} per project (scrollable)`} tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Project</th>
              <th scope="col" className="px-3 py-2 font-medium">package.json says</th>
              <th scope="col" className="px-3 py-2 font-medium">Installed</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((r) => (
              <tr key={r.project} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {project(r.project).path}
                </th>
                <td className="px-3 py-1.5">&quot;{LIBRARY}&quot;: &quot;{r.declared}&quot;</td>
                <td className="px-3 py-1.5">
                  {r.resolved}
                  {r.resolved !== LATEST ? <span className="ml-2 font-sans text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning">behind</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm" aria-live="polite">
        <strong>
          {copies} {copies === 1 ? "copy" : "copies"}
        </strong>{" "}
        of {LIBRARY} installed
        {behind.length > 0
          ? `; ${behind.length} projects behind ${LATEST} (${behind.join(", ")}). A shared component that passes a date between two of them can hit two incompatible copies.`
          : `; everyone is on ${LATEST}. An upgrade is one change that every project's tests must pass.`}
      </p>
    </section>
  );
}

function PhantomPart() {
  const [layout, setLayout] = useState<Layout>("hoisted");
  const outcome = phantomOutcome(layout);
  return (
    <section aria-labelledby="phantom-heading" className="flex flex-col gap-3">
      <h4 id="phantom-heading" className={heading}>
        2. A phantom dependency
      </h4>
      <p className="text-sm text-foreground/85">
        <code className="font-mono text-xs">apps/marketing</code> imports <code className="font-mono text-xs">lodash-es</code> but never lists it in its package.json.{" "}
        <code className="font-mono text-xs">packages/ui</code> does list it.
      </p>
      <Choice legend="node_modules layout" value={layout} options={LAYOUT_OPTIONS} onChange={setLayout} />
      <dl className="grid gap-3 text-sm sm:grid-cols-2" aria-live="polite">
        <div className="flex flex-col gap-1 rounded-lg border p-3">
          <dt className="font-medium">Today</dt>
          <dd className="flex flex-col gap-1">
            <Verdict pass={outcome.now.ok}>{outcome.now.ok ? "Builds" : "Fails"}</Verdict>
            <span className="text-foreground/85">{outcome.now.text}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border p-3">
          <dt className="font-medium">After the UI team removes lodash-es from ui</dt>
          <dd className="flex flex-col gap-1">
            <Verdict pass={outcome.after.ok}>{outcome.after.ok ? "Builds" : "Fails"}</Verdict>
            <span className="text-foreground/85">{outcome.after.text}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

const FIRST_CHANGESETS: Changeset[] = [{ id: 1, pkg: "utils", bump: "major", summary: "Drop the CommonJS build." }];

function ReleasePart() {
  const [mode, setMode] = useState<ReleaseMode>("independent");
  const [ranges, setRanges] = useState<RangeStyle>("caret");
  const [changesets, setChangesets] = useState<Changeset[]>(FIRST_CHANGESETS);
  const [pkg, setPkg] = useState("ui");
  const [bump, setBump] = useState<Bump>("minor");
  const [summary, setSummary] = useState("Add a Tabs component.");
  const releases = planRelease(changesets, mode, ranges);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = Math.max(0, ...changesets.map((c) => c.id)) + 1;
    setChangesets([...changesets, { id, pkg, bump, summary }]);
  }

  function handleRemove(id: number) {
    setChangesets(changesets.filter((c) => c.id !== id));
  }

  return (
    <section aria-labelledby="release-heading" className="flex flex-col gap-3">
      <h4 id="release-heading" className={heading}>
        3. Record changes, then version the published packages
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Versioning" value={mode} options={MODE_OPTIONS} onChange={setMode} />
        <Choice legend="How packages depend on each other" value={ranges} options={RANGE_OPTIONS} onChange={setRanges} />
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-lg border p-3">
        <Choice legend="Package" value={pkg} options={PACKAGE_OPTIONS} onChange={setPkg} />
        <Choice legend="Bump" value={bump} options={BUMP_OPTIONS} onChange={setBump} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="changeset-summary">Summary (goes in the changelog)</Label>
          <Input id="changeset-summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Button type="submit">Add changeset</Button>
        </div>
      </form>

      <div className="flex flex-col gap-1.5">
        <h5 className="text-xs font-medium text-foreground/75">Pending changesets ({changesets.length})</h5>
        {changesets.length === 0 ? (
          <p className="text-sm text-foreground/75">None. With nothing recorded, nothing gets released.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {changesets.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs">
                  &quot;{project(c.pkg).name}&quot;: {c.bump}
                </span>
                <span className="text-foreground/85">{c.summary || "(no summary)"}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(c.id)} aria-label={`Remove the ${c.bump} changeset for ${project(c.pkg).name}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <h5 className="text-xs font-medium text-foreground/75">Release plan</h5>
        {releases.length === 0 ? (
          <p className="text-sm text-foreground/75">No packages to release.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {releases.map((r) => (
              <li key={r.pkg} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm">
                  <span className="font-mono text-xs font-medium">{project(r.pkg).name}</span>{" "}
                  <span className="tabular-nums">
                    {r.from} → <strong>{r.to}</strong>
                  </span>{" "}
                  <span className="text-xs text-foreground/75">({r.bump}: {r.reasons.join("; ")})</span>
                </p>
                <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">{changelog(r)}</pre>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-foreground/75">
          Unreleased: {PUBLISHED.filter((id) => !releases.some((r) => r.pkg === id)).map((id) => `${project(id).name}@${currentVersion(id, mode)}`).join(", ") || "none"}. The private apps
          and features aren&apos;t versioned at all: they pick up the new code through the workspace link and ship with their next deploy.
        </p>
      </div>
    </section>
  );
}
