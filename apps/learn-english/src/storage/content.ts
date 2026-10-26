import { notifyChanged } from "./broadcast";
import { getDb, type ContentCacheEntry } from "./db";

export type { ContentCacheEntry } from "./db";

export function contentKey(kind: string, level: string): string {
  return `${kind}:${level}`;
}

export async function getContentCache<T = unknown>(
  kind: string,
  level: string,
): Promise<ContentCacheEntry<T> | undefined> {
  return (await (await getDb()).get("content", contentKey(kind, level))) as ContentCacheEntry<T> | undefined;
}

export async function putContentCache<T>(
  kind: string,
  level: string,
  entry: Omit<ContentCacheEntry<T>, "key">,
): Promise<void> {
  await (await getDb()).put("content", { ...entry, key: contentKey(kind, level) });
  notifyChanged(["content"]);
}
