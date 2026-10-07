import { z } from "zod";

export const MB = 1024 * 1024;
export const MAX_PIECE = 5 * MB;
/** Total bytes the server keeps; oldest stored files go first. */
export const STORAGE_LIMIT = 200 * MB;

export const KINDS = ["image", "pdf", "text", "zip"] as const;
export type Kind = (typeof KINDS)[number];

/** Allowed MIME types and extensions per kind. An empty MIME type falls back to the extension. */
export const KIND_RULES: Record<Kind, { label: string; mimes: string[]; extensions: string[] }> = {
  image: {
    label: "Images",
    mimes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/avif"],
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"],
  },
  pdf: { label: "PDF", mimes: ["application/pdf"], extensions: ["pdf"] },
  text: {
    label: "Text, CSV, JSON",
    mimes: ["text/plain", "text/csv", "application/json", "text/markdown"],
    extensions: ["txt", "csv", "json", "md"],
  },
  zip: {
    label: "ZIP",
    mimes: ["application/zip", "application/x-zip-compressed"],
    extensions: ["zip"],
  },
};

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function kindOf(name: string, type: string): Kind | null {
  for (const kind of KINDS) {
    const rule = KIND_RULES[kind];
    if (type && rule.mimes.includes(type)) return kind;
  }
  const ext = extensionOf(name);
  for (const kind of KINDS) {
    if (KIND_RULES[kind].extensions.includes(ext)) return kind;
  }
  return null;
}

export const settingsSchema = z.object({
  /** Null = unlimited. */
  speedKBps: z.number().int().min(16).max(100_000).nullable(),
  failRate: z.number().min(0).max(1),
  maxSizeMB: z.number().int().min(1).max(100),
  allowedKinds: z.array(z.enum(KINDS)),
});

export type UploadSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: UploadSettings = {
  speedKBps: 1024,
  failRate: 0,
  maxSizeMB: 50,
  allowedKinds: [...KINDS],
};

export const createBodySchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().max(1024).nullable().optional(),
  size: z.number().int().min(0),
  type: z.string().max(255),
  fingerprint: z.string().min(1).max(1500),
});

export const uploadIdSchema = z.uuid();

export const pieceQuerySchema = z.object({
  offset: z.coerce.number().int().min(0),
});

export const completeBodySchema = z.object({
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type CreateBody = z.infer<typeof createBodySchema>;

export type UploadStatus = "uploading" | "complete";

export type UploadInfo = {
  id: string;
  offset: number;
  size: number;
  status: UploadStatus;
};

export type StoredFile = {
  id: string;
  name: string;
  path: string | null;
  size: number;
  type: string;
  sha256: string;
  /** The client's checksum matched the server's. */
  verified: boolean;
  completedAt: string;
};

export type FilesResponse = { files: StoredFile[]; usedBytes: number; limitBytes: number };
