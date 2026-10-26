// A small model of how a production build names its chunks by content hash.
// The runtime chunk holds the names of the chunks it loads lazily, so if the
// runtime is inlined into main, changing a lazy page renames main as well.

import { contentHash } from "./sizes";

export type HashInput = {
  app: string;
  about: string;
  reactVersion: string;
  splitVendor: boolean;
  splitRuntime: boolean;
};

export type OutputFile = { chunk: "runtime" | "vendor" | "main" | "about"; name: string; holds: string };

const RUNTIME = "/* runtime: loads chunks on demand, links modules */\nconst chunks = ";
const vendorCode = (version: string) => `/* react@${version}, react-dom@${version} */`;

export async function buildNames(input: HashInput): Promise<OutputFile[]> {
  const aboutName = `about-${await contentHash(input.about)}.js`;
  const runtime = RUNTIME + JSON.stringify({ about: aboutName });
  const vendor = vendorCode(input.reactVersion);
  const main = [input.app, input.splitVendor ? "" : vendor, input.splitRuntime ? "" : runtime].join("\n");

  const files: OutputFile[] = [];
  if (input.splitRuntime) files.push({ chunk: "runtime", name: `runtime-${await contentHash(runtime)}.js`, holds: "the chunk loader and the names of lazy chunks" });
  if (input.splitVendor) files.push({ chunk: "vendor", name: `vendor-${await contentHash(vendor)}.js`, holds: `react and react-dom ${input.reactVersion}` });
  files.push({
    chunk: "main",
    name: `main-${await contentHash(main)}.js`,
    holds: ["App.tsx", input.splitVendor ? null : "react", input.splitRuntime ? null : "the runtime"].filter(Boolean).join(", "),
  });
  files.push({ chunk: "about", name: aboutName, holds: "About.tsx, loaded with import()" });
  return files;
}
