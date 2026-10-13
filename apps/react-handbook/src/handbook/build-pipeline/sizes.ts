"use client";

import { useEffect, useState } from "react";

// Real sizes of the text shown in a demo: UTF-8 bytes, and gzip measured by
// the browser's own CompressionStream (null where it isn't available).

export type Size = { bytes: number; gzip: number | null };

const encoder = new TextEncoder();

export async function gzipSize(text: string): Promise<number | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([encoder.encode(text)]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(stream).arrayBuffer();
  return compressed.byteLength;
}

export async function measure(text: string): Promise<Size> {
  return { bytes: encoder.encode(text).byteLength, gzip: await gzipSize(text) };
}

/** First 8 hex digits of the text's SHA-256, like a bundler's [contenthash]. */
export async function contentHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 4), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`;
}

/** Measures `text` whenever it changes; ignores results for text that has since changed. */
export function useSize(text: string): Size | null {
  const [result, setResult] = useState<{ text: string; size: Size } | null>(null);
  useEffect(() => {
    let current = true;
    void measure(text).then((size) => {
      if (current) setResult({ text, size });
    });
    return () => {
      current = false;
    };
  }, [text]);
  return result?.text === text ? result.size : null;
}

export function sizeLabel(size: Size | null) {
  if (!size) return "measuring…";
  return size.gzip === null ? formatBytes(size.bytes) : `${formatBytes(size.bytes)} · ${formatBytes(size.gzip)} gzipped`;
}
