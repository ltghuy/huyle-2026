"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";

import { CodeTabs } from "./code-tabs";
import { POM_PATHS as PATHS } from "./pom-paths";

// For each UI change, the lines each version of the tests must edit, found by
// patterns over the recorded files, so the counts follow the real code.

export type PomFiles = { pageObject: string | null; pomSpec: string | null; rawSpec: string | null };

type Change = { id: string; label: string; note: string; patterns: Record<keyof PomFiles, RegExp[]>; lesson: string };

const CHANGES: readonly Change[] = [
  {
    id: "rename",
    label: "Rename the Next button to Continue",
    note: "Copy changes; nothing else does.",
    patterns: { pageObject: [/name: "Next"/], pomSpec: [/name: "Next"/], rawSpec: [/name: "Next"/] },
    lesson: "A locator lives in one place in the page object, and in every test that clicks it without one.",
  },
  {
    id: "move",
    label: "Move the Email field to the Role step",
    note: "The field keeps its label but is asked one step later.",
    patterns: {
      pageObject: [/this\.email\.fill/],
      pomSpec: [/formPage\.email\b/],
      rawSpec: [/getByLabel\("Email"/],
    },
    lesson: "The page object saves less here: the flow changed, so tests that check the email on the first step change in both versions.",
  },
  {
    id: "split",
    label: "Split Personal details into two steps",
    note: "Name and country on one step, email on the next.",
    patterns: {
      pageObject: [/async fillPersonal/, /this\.email\.fill/],
      pomSpec: [/step\("Personal details"\)/],
      rawSpec: [/name: \/Personal details\//, /getByLabel\("Email"/],
    },
    lesson: "Filling the step is one method in the page object; without one, every test that fills it learns the new order.",
  },
];

const OPTIONS = CHANGES.map((c) => ({ value: c.id, label: c.label }));

const FILE_TABS: readonly { key: keyof PomFiles; side: string }[] = [
  { key: "pageObject", side: "With a page object" },
  { key: "pomSpec", side: "With a page object" },
  { key: "rawSpec", side: "Without one" },
];

function PomTab({ side, path, count }: { side: string; path: string; count: number }) {
  return (
    <>
      <span className="font-sans text-foreground/75">{side}</span> {path.split("/").pop()}{" "}
      <span className="rounded-sm bg-primary/10 px-1.5 tabular-nums">
        {count}
        <span className="sr-only"> {count === 1 ? "line" : "lines"} to edit</span>
      </span>
    </>
  );
}

function markedLines(code: string | null, patterns: RegExp[]) {
  const marked = new Set<number>();
  code?.split("\n").forEach((line, i) => {
    if (patterns.some((p) => p.test(line))) marked.add(i + 1);
  });
  return marked;
}

export function PomDemo({ files }: { files: PomFiles }) {
  const [changeId, setChangeId] = useState(CHANGES[0].id);
  const change = CHANGES.find((c) => c.id === changeId)!;
  const marks = {
    pageObject: markedLines(files.pageObject, change.patterns.pageObject),
    pomSpec: markedLines(files.pomSpec, change.patterns.pomSpec),
    rawSpec: markedLines(files.rawSpec, change.patterns.rawSpec),
  };
  const withPom = marks.pageObject.size + marks.pomSpec.size;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Choice legend="Change the page" value={changeId} options={OPTIONS} onChange={setChangeId} />
      <p className="text-sm text-foreground/85">{change.note}</p>

      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">{withPom}</span>
          lines to edit with a page object ({marks.pageObject.size} in the page object, {marks.pomSpec.size} in the tests)
        </p>
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">{marks.rawSpec.size}</span>
          lines to edit without one
        </p>
      </div>
      <p className="rounded-lg bg-muted/40 p-3 text-sm">{change.lesson}</p>

      <CodeTabs
        label="Files to edit"
        files={FILE_TABS.map(({ key, side }) => ({
          path: PATHS[key],
          code: files[key],
          marked: marks[key],
          tab: <PomTab side={side} path={PATHS[key]} count={marks[key].size} />,
        }))}
      />
      <p className="text-xs text-foreground/75">Each tab counts its marked lines. Marked lines are found by matching each change&apos;s locators and steps in the files of the latest recorded run.</p>
    </div>
  );
}

