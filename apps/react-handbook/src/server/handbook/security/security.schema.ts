import { z } from "zod";

// Request shapes for the CSP sample page and the CSRF lab. Client-safe: the
// demos share the enums and types.

export const SCRIPT_SRCS = ["none", "self", "nonce", "unsafe-inline", "strict-dynamic"] as const;
export type ScriptSrc = (typeof SCRIPT_SRCS)[number];

const flag = z.enum(["0", "1"]).transform((v) => v === "1");

export const cspPageSchema = z.object({
  script: z.enum(SCRIPT_SRCS),
  img: flag,
  reportOnly: flag,
});
export type CspPageParams = z.infer<typeof cspPageSchema>;

export const SAME_SITES = ["None", "Lax", "Strict"] as const;
export type SameSite = (typeof SAME_SITES)[number];

export const DEFENCES = ["none", "token", "header"] as const;
export type Defence = (typeof DEFENCES)[number];

const runId = z.string().regex(/^[a-z0-9-]{4,40}$/);

export const csrfActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), sameSite: z.enum(SAME_SITES), defence: z.enum(DEFENCES) }),
  z.object({ action: z.literal("reset"), sid: runId }),
]);
export type CsrfAction = z.infer<typeof csrfActionSchema>;

export const csrfDoSchema = z.object({
  sid: runId,
  n: z.coerce.number().int().min(0).max(100000),
  from: z.enum(["page", "other-site", "subdomain"]),
  amount: z.coerce.number().int().min(1).max(1000).default(100),
});

export const csrfLogSchema = z.object({ sid: runId });

export type CsrfState = { sameSite: SameSite; defence: Defence; balance: number; token: string };

export type CsrfLogEntry = {
  n: number;
  at: number;
  from: "page" | "other-site" | "subdomain";
  method: string;
  origin: string | null;
  fetchSite: string | null;
  cookie: boolean;
  tokenOk: boolean;
  headerOk: boolean;
  applied: boolean;
  detail: string;
};
