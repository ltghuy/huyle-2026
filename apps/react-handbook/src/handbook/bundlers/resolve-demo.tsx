"use client";

import { Check, CircleSlash, Info, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { type Environment, type ImportKind, resolve, type ResolveStep } from "./bundler/resolve";
import { FileEditor } from "./file-editor";
import { RESOLVE } from "./projects";
import { useProject } from "./use-project";

const PRESETS = ["./App", "./utils", "tiny-date", "tiny-date/locale/fr", "tiny-date/internal", "old-lib", "./missing"];

const ENVIRONMENTS = [
  { value: "browser", label: "browser" },
  { value: "node", label: "node" },
] as const satisfies readonly { value: Environment; label: string }[];

const KINDS = [
  { value: "import", label: "import" },
  { value: "require", label: "require()" },
] as const satisfies readonly { value: ImportKind; label: string }[];

const ICONS: Record<ResolveStep["outcome"], React.ReactNode> = {
  hit: <Check aria-hidden className="size-3.5 text-success" />,
  miss: <X aria-hidden className="size-3.5 text-destructive" />,
  skip: <CircleSlash aria-hidden className="size-3.5 text-muted-foreground" />,
  info: <Info aria-hidden className="size-3.5 text-muted-foreground" />,
};

const OUTCOME_WORD: Record<ResolveStep["outcome"], string> = { hit: "found", miss: "not found", skip: "skipped", info: "" };

export function ResolveDemo() {
  const { files, update, reset, changed } = useProject(RESOLVE);
  const [specifier, setSpecifier] = useState("tiny-date");
  const [environment, setEnvironment] = useState<Environment>("browser");
  const [kind, setKind] = useState<ImportKind>("import");
  const result = useMemo(() => resolve(files, "src/main.ts", specifier.trim(), { environment, kind }), [files, specifier, environment, kind]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resolve-specifier">
              Resolve <code className="font-mono">import … from &quot;<span className="sr-only">specifier</span>…&quot;</code> in src/main.ts
            </Label>
            <Input id="resolve-specifier" value={specifier} onChange={(e) => setSpecifier(e.target.value)} spellCheck={false} className="font-mono" />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example specifiers">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSpecifier(p)}
                  aria-pressed={specifier === p}
                  className={cn("min-h-7 rounded-md border px-2 font-mono text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50", specifier === p && "border-primary bg-primary/10")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice legend="Environment condition" value={environment} options={ENVIRONMENTS} onChange={setEnvironment} />
            <Choice legend="Import style" value={kind} options={KINDS} onChange={setKind} />
          </div>
          <p className="text-xs text-muted-foreground">Active conditions, in order: {environment}, {kind}, default. Real bundlers add more, such as module, development or production.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <ol className="flex flex-col gap-1 rounded-lg border p-2 font-mono text-xs" aria-label="Resolution steps">
            {result.steps.map((step, i) => (
              <li key={i} className={cn("flex items-start gap-1.5", step.outcome === "info" && "text-foreground/75")}>
                <span className="mt-0.5 shrink-0">{ICONS[step.outcome]}</span>
                <span className="break-all">
                  {step.text}
                  {OUTCOME_WORD[step.outcome] ? <span className="sr-only">: {OUTCOME_WORD[step.outcome]}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          <p aria-live="polite" className={cn("rounded-lg border p-2 text-sm", result.ok ? "border-success/40" : "border-destructive/40 bg-destructive/5")}>
            {result.ok ? (
              <>
                Resolved to <code className="font-mono text-xs break-all">{result.path}</code>
              </>
            ) : (
              <>
                <strong>Error:</strong> <span className="font-mono text-xs break-all">{result.error}</span>
              </>
            )}
          </p>
        </div>
      </div>
      <FileEditor files={files} onChange={update} onReset={reset} changed={changed} label="Package files" only={["node_modules/tiny-date/package.json", "node_modules/old-lib/package.json"]} />
      <p className="text-xs text-muted-foreground">Edit a package.json, such as the order of the conditions, and resolve again. The files themselves are a virtual file system in the page.</p>
    </div>
  );
}
