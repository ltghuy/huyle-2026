"use client";

import { File, Folder } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { ALLOWED } from "./boundaries";
import { OWNERS_FILES, normalizePath, ownersFor, type OwnersFile } from "./codeowners";
import { TREE } from "./layout";
import { KIND_LABEL, project } from "./repo";

const heading = "text-sm font-semibold";

export function PracticesDemo() {
  return (
    <div className="flex flex-col gap-8">
      <TreePart />
      <OwnersPart />
    </div>
  );
}

function TreePart() {
  const name = useId();
  const [selected, setSelected] = useState("packages/ui/");
  const entry = TREE.find((e) => e.path === selected)!;
  const p = entry.project ? project(entry.project) : null;
  const owners = entry.ownerProbe ? ownersFor(OWNERS_FILES.ordered, entry.ownerProbe).owners : null;

  return (
    <section aria-labelledby="tree-heading" className="flex flex-col gap-3">
      <h4 id="tree-heading" className={heading}>
        1. The sample repo, folder by folder
      </h4>
      <div className="grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr]">
        <fieldset className="min-w-0 rounded-lg border p-2">
          <legend className="sr-only">Repo entries</legend>
          <ul className="flex flex-col font-mono text-xs">
            {TREE.map((e) => {
              const Icon = e.folder ? Folder : File;
              return (
                <li key={e.path}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      selected === e.path ? "bg-primary/10 font-medium text-foreground" : "text-foreground/85 hover:bg-muted",
                    )}
                    style={{ paddingLeft: `${0.5 + e.depth * 1.25}rem` }}
                  >
                    <input type="radio" name={name} checked={selected === e.path} onChange={() => setSelected(e.path)} className="sr-only" />
                    <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{e.depth > 0 ? e.path.split("/").at(-2) + "/" : e.path}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
          <p className="font-mono text-xs font-medium break-all">{entry.path}</p>
          {p ? <p className="font-mono text-xs text-foreground/75">{p.name}</p> : null}
          <p className="text-foreground/85">{entry.purpose}</p>
          <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-xs">
            {p ? (
              <>
                <dt className="font-medium">Layer</dt>
                <dd>{KIND_LABEL[p.kind]}</dd>
                <dt className="font-medium">May import</dt>
                <dd>{ALLOWED[p.kind].length === 0 ? "Nothing" : ALLOWED[p.kind].map((k) => KIND_LABEL[k]).join(", ")}</dd>
                <dt className="font-medium">Published</dt>
                <dd>{p.published ? `Yes, ${p.version}` : "No, internal to the repo"}</dd>
              </>
            ) : null}
            <dt className="font-medium">Code owners</dt>
            <dd className="font-mono">{owners ? owners.join(" ") : <span className="font-sans">Each project&apos;s own team</span>}</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}

const FILE_OPTIONS = [
  { value: "ordered", label: "Catch-all first" },
  { value: "catch-all-last", label: "Catch-all last" },
  { value: "no-default", label: "No catch-all" },
] as const;

const SAMPLE_PATHS = [
  "packages/ui/src/button.tsx",
  "packages/ui/src/tokens/colors.ts",
  "packages/ui/README.md",
  "apps/web/next.config.ts",
  "packages/tsconfig/base.json",
  "README.md",
];

function OwnersPart() {
  const [file, setFile] = useState<OwnersFile>("ordered");
  const [path, setPath] = useState(SAMPLE_PATHS[0]);
  const lines = OWNERS_FILES[file];
  const clean = normalizePath(path);
  const result = ownersFor(lines, clean);
  const catchAll = lines.findIndex((l) => l.pattern === "*");
  const shadowed = result.winner === catchAll && result.matching.length > 1;

  return (
    <section aria-labelledby="owners-heading" className="flex flex-col gap-3">
      <h4 id="owners-heading" className={heading}>
        2. Who has to review this path?
      </h4>
      <Choice legend="CODEOWNERS file" value={file} options={FILE_OPTIONS} onChange={setFile} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owners-path">Changed file</Label>
        <Input id="owners-path" value={path} onChange={(e) => setPath(e.target.value)} className="font-mono text-xs" spellCheck={false} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sample paths">
        {SAMPLE_PATHS.map((sample) => (
          <Button key={sample} variant="outline" size="sm" className="font-mono text-xs" onClick={() => setPath(sample)}>
            {sample}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div role="region" aria-label=".github/CODEOWNERS (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <p className="border-b px-3 py-2 font-mono text-xs text-foreground/75">.github/CODEOWNERS</p>
          <ol className="min-w-max py-1 font-mono text-xs">
            {lines.map((line, i) => {
              const isMatch = clean !== "" && result.matching.includes(i);
              const isWinner = clean !== "" && result.winner === i;
              return (
                <li key={line.pattern} className={cn("flex gap-3 px-3 py-1", isWinner ? "bg-primary/10" : isMatch && "bg-muted/60")}>
                  <span aria-hidden className="w-4 text-right text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="w-40 shrink-0 sm:w-48">{line.pattern}</span>
                  <span className="text-foreground/85">{line.owners.join(" ")}</span>
                  <span className={cn("ml-auto pl-3 font-sans", isWinner ? "font-medium text-foreground" : "text-foreground/75")}>
                    {isWinner ? "owner (last match)" : isMatch ? "matches" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
          {clean === "" ? (
            <p className="text-foreground/75">Type a path from the repo root, such as packages/ui/src/button.tsx.</p>
          ) : result.winner === null ? (
            <p>
              No line matches <span className="font-mono text-xs">{clean}</span>, so it has no code owner and a pull request touching only this file needs no
              code-owner review. A catch-all <span className="font-mono text-xs">*</span> on the first line closes that gap.
            </p>
          ) : (
            <>
              <p>
                {result.matching.length === 1 ? (
                  <>Only line {result.winner + 1} matches </>
                ) : (
                  <>
                    Lines {result.matching.map((i) => i + 1).join(", ")} match{" "}
                  </>
                )}
                <span className="font-mono text-xs">{clean}</span>
                {result.matching.length === 1 ? ", so " : `. Line ${result.winner + 1} comes last, so `}
                <strong className="font-mono text-xs">{result.owners.join(" ")}</strong> {result.owners.length === 1 ? "owns" : "own"} it.
              </p>
              {shadowed ? (
                <p className="text-foreground/85">
                  The catch-all is the last line, so it beats the more specific rule on line {result.matching[result.matching.length - 2] + 1}. With the catch-all at
                  the bottom, every review goes to the platform team. Move it to the top.
                </p>
              ) : null}
              {result.owners.length > 1 ? <p className="text-foreground/85">Any one of these owners can approve the change.</p> : null}
            </>
          )}
          <p className="text-xs text-foreground/75">
            Simplified matcher: it handles <span className="font-mono">*</span>, <span className="font-mono">**</span>, anchored paths and folder patterns.
            GitHub reads the file from the pull request&apos;s base branch.
          </p>
        </div>
      </div>
    </section>
  );
}
