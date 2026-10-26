import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CodeLang } from "@/components/playground/code";

import { CodeBlock } from "./code-block";

export type CodeTab = { path: string; code: string | null; marked?: ReadonlySet<number>; lang?: CodeLang; tab?: ReactNode };

/** Quoted files as tabs, one at full width; each tab is named after its file unless `tab` says otherwise. */
export function CodeTabs({ files, label }: { files: readonly CodeTab[]; label: string }) {
  return (
    <Tabs defaultValue={files[0]?.path} className="min-w-0">
      <TabsList aria-label={label} className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
        {files.map((f) => (
          <TabsTrigger key={f.path} value={f.path} className="flex-none font-mono text-xs">
            {f.tab ?? f.path.split("/").pop()}
          </TabsTrigger>
        ))}
      </TabsList>
      {files.map((f) => (
        <TabsContent key={f.path} value={f.path} className="min-w-0">
          <CodeBlock path={f.path} code={f.code} marked={f.marked} lang={f.lang} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
