"use client";

import { Rocket } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/playground/code-editor";
import { Choice } from "@/handbook/jwt/token-view";
import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { buildNames, type HashInput, type OutputFile } from "./hashing";

const INITIAL: HashInput = {
  app: 'export function App() {\n  return <Link href="/about">About us</Link>;\n}',
  about: "export default function About() {\n  return <h1>About us</h1>;\n}",
  reactVersion: "19.2.7",
  splitVendor: true,
  splitRuntime: true,
};

const VERSIONS = [
  { value: "19.2.7", label: "React 19.2.7" },
  { value: "19.2.8", label: "React 19.2.8" },
] as const;

type Build = { input: HashInput; files: OutputFile[] };

export function HashingDemo() {
  const [input, setInput] = useState<HashInput>(INITIAL);
  const [build, setBuild] = useState<Build | null>(null);
  const [deployed, setDeployed] = useState<OutputFile[] | null>(null);

  useEffect(() => {
    let current = true;
    void buildNames(input).then((files) => {
      if (!current) return;
      setBuild({ input, files });
      // The first build is what's "deployed" until the reader deploys again.
      setDeployed((before) => before ?? files);
    });
    return () => {
      current = false;
    };
  }, [input]);

  function update(patch: Partial<HashInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  // Changing how chunks are split starts a fresh deploy to compare against.
  function handleSplitChange(patch: Partial<HashInput>) {
    setDeployed(null);
    update(patch);
  }

  function handleAppChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    update({ app: e.target.value });
  }

  function handleAboutChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    update({ about: e.target.value });
  }

  function handleVersionChange(reactVersion: string) {
    update({ reactVersion });
  }

  function handleSplitVendorChange(splitVendor: boolean) {
    handleSplitChange({ splitVendor });
  }

  function handleSplitRuntimeChange(splitRuntime: boolean) {
    handleSplitChange({ splitRuntime });
  }

  function handleDeploy() {
    if (build) setDeployed(build.files);
  }

  const files = build?.input === input ? build.files : null;
  const changed = files && deployed ? files.filter((f) => !deployed.some((d) => d.name === f.name)).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hash-app" className="font-mono text-xs">
            App.tsx (in main)
          </Label>
          <CodeEditor lang="ts" id="hash-app" value={input.app} onChange={handleAppChange} className="min-h-24" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hash-about" className="font-mono text-xs">
            About.tsx (lazy chunk)
          </Label>
          <CodeEditor lang="ts" id="hash-about" value={input.about} onChange={handleAboutChange} className="min-h-24" />
        </div>
      </div>
      <Choice legend="Dependency version" value={input.reactVersion} options={VERSIONS} onChange={handleVersionChange} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          checked={input.splitVendor}
          onCheckedChange={handleSplitVendorChange}
          title="Split dependencies into a vendor chunk"
          detail="Your code changes often; React rarely."
        />
        <Toggle
          checked={input.splitRuntime}
          onCheckedChange={handleSplitRuntimeChange}
          title="Split the runtime into its own chunk"
          detail="The runtime lists the hashed names of lazy chunks."
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-medium">
            {files ? `${changed} of ${files.length} files changed since the last deploy` : "Hashing…"}
          </p>
          <Button variant="outline" onClick={handleDeploy} disabled={!files || changed === 0}>
            <Rocket aria-hidden />
            Deploy this build
          </Button>
        </div>
        <ul className="grid gap-2" aria-label="Output files">
          {(files ?? []).map((file) => {
            const same = deployed?.some((d) => d.name === file.name) ?? true;
            return (
              <li key={file.chunk} className={cn("flex flex-col gap-0.5 rounded-lg border p-2 text-sm sm:flex-row sm:items-center sm:justify-between", same ? "border-dashed" : "border-primary bg-primary/10")}>
                <span className="flex flex-col">
                  <code className="font-mono text-xs font-medium break-all">{file.name}</code>
                  <span className="text-xs text-foreground/75">Holds {file.holds}</span>
                </span>
                <span className={cn("text-xs font-medium", same ? "text-muted-foreground" : "text-foreground")}>
                  {same ? "Same name: browsers keep using their cached copy" : "New name: every visitor downloads it again"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Hashes are real (SHA-256 of each chunk&apos;s content, computed in your browser); the chunks are a simplified model. Bundlers use faster hash functions, such
        as xxHash, but the rule is the same.
      </p>
    </div>
  );
}
