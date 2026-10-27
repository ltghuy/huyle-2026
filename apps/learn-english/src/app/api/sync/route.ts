import type { z } from "zod";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { hashSyncCode } from "@/server/sync/code";
import {
  createSyncBodySchema,
  SYNC_CODE_HEADER,
  SYNC_MESSAGES as MESSAGES,
  syncCodeHeaderSchema,
  updateSyncBodySchema,
  type CreateSyncResponse,
  type GetSyncResponse,
  type SyncConflictResponse,
  type UpdateSyncResponse,
} from "@/server/sync/sync.schema";
import { createSyncProfile, deleteSyncProfile, getSyncProfile, putSyncProfile } from "@/server/sync/sync.service";
import { isLookupThrottled } from "@/server/sync/throttle";

// Sync blobs (AC-047–AC-051). The code is a bearer secret: it only travels in
// the x-sync-code header, and every response is `no-store`.

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function error(message: string, status: number, issues?: unknown): Response {
  return json({ error: { message, ...(issues ? { issues } : {}) } }, status);
}

type Parsed<T> = { data: T } | { response: Response };

/** Reads the code header: 400 when missing or malformed. */
async function readCodeHash(request: Request): Promise<Parsed<string>> {
  const header = request.headers.get(SYNC_CODE_HEADER);
  if (!header) return { response: error(MESSAGES.missingCode, 400) };
  const parsed = syncCodeHeaderSchema.safeParse(header);
  if (!parsed.success) return { response: error(MESSAGES.invalidCode, 400) };
  return { data: await hashSyncCode(parsed.data) };
}

/**
 * Parses a JSON body with Vietnamese errors. A declared length far over the
 * cap is refused before the body is read, so an oversized upload costs no CPU.
 */
async function readBody<T extends z.ZodType>(request: Request, schema: T, maxBytes: number): Promise<Parsed<z.infer<T>>> {
  const declared = Number(request.headers.get("content-length"));
  // base64 is 4/3 of the bytes; 1 KB covers the JSON around it.
  if (declared > Math.ceil(maxBytes / 3) * 4 + 1024) return { response: error(MESSAGES.tooLarge, 413) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: error(MESSAGES.invalidJson, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: error(MESSAGES.invalidBody, 422, parsed.error.issues) };
  return { data: parsed.data };
}

/** 404 for an unknown code, or 429 once this network has failed too often. */
async function unknownCode(request: Request): Promise<Response> {
  if (await isLookupThrottled(request)) return error(MESSAGES.throttled, 429);
  return error(MESSAGES.notFound, 404);
}

function unavailable(scope: string, cause: unknown): Response {
  console.error(`Sync ${scope} failed:`, cause);
  return error(MESSAGES.unavailable, 503);
}

export async function POST(request: Request) {
  let maxBytes: number;
  try {
    maxBytes = getEnv().SYNC_MAX_BYTES;
  } catch (cause) {
    return unavailable("env", cause);
  }
  const body = await readBody(request, createSyncBodySchema, maxBytes);
  if ("response" in body) return body.response;

  try {
    const result = await createSyncProfile(getDb(), body.data.data, { now: Date.now(), maxBytes });
    if (!result.ok) return error(MESSAGES.tooLarge, 413);
    return json({ code: result.code, rev: 1 } satisfies CreateSyncResponse, 201);
  } catch (cause) {
    return unavailable("create", cause);
  }
}

export async function GET(request: Request) {
  const codeHash = await readCodeHash(request);
  if ("response" in codeHash) return codeHash.response;

  let result;
  try {
    result = await getSyncProfile(getDb(), codeHash.data);
  } catch (cause) {
    return unavailable("read", cause);
  }
  if (!result.ok) return unknownCode(request);
  const { rev, data, updatedAt } = result;
  return json({ rev, data, updatedAt } satisfies GetSyncResponse, 200);
}

export async function PUT(request: Request) {
  const codeHash = await readCodeHash(request);
  if ("response" in codeHash) return codeHash.response;
  let maxBytes: number;
  try {
    maxBytes = getEnv().SYNC_MAX_BYTES;
  } catch (cause) {
    return unavailable("env", cause);
  }
  const body = await readBody(request, updateSyncBodySchema, maxBytes);
  if ("response" in body) return body.response;

  let result;
  try {
    result = await putSyncProfile(getDb(), codeHash.data, body.data, { now: Date.now(), maxBytes });
  } catch (cause) {
    return unavailable("write", cause);
  }
  if (result.ok) return json({ rev: result.rev } satisfies UpdateSyncResponse, 200);
  if (result.reason === "conflict") {
    return json({ error: { message: MESSAGES.conflict }, rev: result.rev } satisfies SyncConflictResponse, 409);
  }
  if (result.reason === "too-large") return error(MESSAGES.tooLarge, 413);
  return unknownCode(request);
}

export async function DELETE(request: Request) {
  const codeHash = await readCodeHash(request);
  if ("response" in codeHash) return codeHash.response;

  let deleted: boolean;
  try {
    deleted = await deleteSyncProfile(getDb(), codeHash.data);
  } catch (cause) {
    return unavailable("delete", cause);
  }
  if (!deleted) return unknownCode(request);
  return new Response(null, { status: 204, headers: NO_STORE });
}
