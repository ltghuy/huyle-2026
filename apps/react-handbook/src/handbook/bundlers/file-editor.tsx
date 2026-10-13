"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { Project } from "./projects";

/** Tabs of editable virtual files, with a reset back to the sample. */
export function FileEditor({
  files,
  onChange,
  onReset,
  changed,
  label,
  only,
}: {
  files: Project;
  onChange: (path: string, code: string) => void;
  onReset: () => void;
  changed: boolean;
  label: string;
  /** Show only these paths (default: all). */
  only?: string[];
}) {
  const paths = only ?? Object.keys(files);
  return (
    <Tabs defaultValue={paths[0]} className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList aria-label={label} className="h-auto max-w-full flex-wrap justify-start">
          {paths.map((path) => (
            <TabsTrigger key={path} value={path} className="flex-none font-mono text-xs">
              {path.replace(/^src\//, "")}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!changed}>
          <RotateCcw aria-hidden />
          Reset files
        </Button>
      </div>
      {paths.map((path) => (
        <TabsContent key={path} value={path}>
          <Textarea
            aria-label={`Edit ${path}`}
            value={files[path] ?? ""}
            onChange={(e) => onChange(path, e.target.value)}
            spellCheck={false}
            wrap="off"
            className="min-h-48 font-mono text-xs leading-relaxed"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
