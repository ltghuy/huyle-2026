import { z } from "zod";

const run = z.string().regex(/^[a-z0-9-]{4,40}$/);

export const cssModes = ["none", "fast", "slow"] as const;
export type CssMode = (typeof cssModes)[number];

export const scriptModes = ["head", "body-end", "defer", "async", "module"] as const;
export type ScriptMode = (typeof scriptModes)[number];

export const loadSetupSchema = z.object({
  run,
  css: z.enum(cssModes),
  a: z.enum(scriptModes),
  b: z.enum(scriptModes),
  inline: z.enum(["0", "1"]),
});
export type LoadSetup = z.infer<typeof loadSetupSchema>;

export const assetNames = ["a", "b", "css"] as const;
export type AssetName = (typeof assetNames)[number];

export const MAX_ASSET_DELAY = 3000;

export const assetParamsSchema = z.object({
  run,
  name: z.enum(assetNames),
  delay: z.coerce.number().int().min(0).max(MAX_ASSET_DELAY),
});
export type AssetParams = z.infer<typeof assetParamsSchema>;

/** How long each asset takes to arrive, in ms. */
export const ASSET_DELAY = { css: { none: 0, fast: 100, slow: 1500 }, a: 1200, b: 400 } as const;

export type LoadEvent = {
  kind: "ran" | "error" | "interactive" | "dcl" | "load";
  name?: "a" | "b" | "inline" | "css";
  t: number;
  /** For scripts: whether the page content after the scripts was already parsed when it ran. */
  sawContent?: boolean;
};

/** What the sample page measured, posted to the demo once at `load`. */
export type LoadReport = {
  type: "render-lab-report";
  run: string;
  events: LoadEvent[];
  resources: { name: AssetName; start: number; end: number }[];
  firstPaint: number | null;
  hidden: boolean;
};
