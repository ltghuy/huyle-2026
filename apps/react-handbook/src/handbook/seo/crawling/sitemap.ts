// Reading this site's sitemap, and checking many of its pages without
// flooding the server.

export type SitemapEntry = { loc: string; lastmod: string | null };

export function parseSitemap(xml: string): SitemapEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagName("url")].map((url) => ({
    loc: url.getElementsByTagName("loc")[0]?.textContent?.trim() ?? "",
    lastmod: url.getElementsByTagName("lastmod")[0]?.textContent?.trim() ?? null,
  }));
}

/** The path and query of a sitemap URL, to fetch it from the current origin. */
export function localPath(loc: string) {
  const url = new URL(loc);
  return url.pathname + url.search;
}

/** Runs `task` over the items, `parallel` at a time, reporting each result as it lands. */
export async function runPool<T, R>(items: readonly T[], parallel: number, task: (item: T) => Promise<R>, onResult: (result: R) => void) {
  const queue = [...items];
  async function worker() {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) onResult(await task(item));
  }
  await Promise.all(Array.from({ length: parallel }, worker));
}
