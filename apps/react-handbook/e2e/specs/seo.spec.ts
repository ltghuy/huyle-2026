import type { APIRequestContext } from "@playwright/test";

import { tokensFor } from "@/lib/ai-bots";

import { expect, test } from "../fixtures";

// SEO checks on the production build, read the way a crawler reads it: the
// HTML as text, with no script run. Each page check loops over the sitemap
// with soft assertions, so one broken page doesn't hide the others and every
// message names the URL.

type Page = { url: string; path: string; html: string; robotsHeader: string | null };

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };

function text(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#x27|#39);/g, (e) => ENTITIES[e]).trim();
}

function meta(html: string, attr: "name" | "property", key: string) {
  return html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;
}

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

async function sitemapPages(request: APIRequestContext): Promise<Page[]> {
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return Promise.all(
    urls.map(async (url) => {
      const path = new URL(url).pathname;
      const res = await request.get(path);
      expect.soft(res.status(), `${path} status`).toBe(200);
      return { url, path, html: await res.text(), robotsHeader: res.headers()["x-robots-tag"] ?? null };
    }),
  );
}

test.describe("SEO of every page in the sitemap", () => {
  let pages: Page[] = [];

  test.beforeAll(async ({ request }) => {
    pages = await sitemapPages(request);
  });

  test("the sitemap lists the site's pages", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  test("every page has one h1, a title and a meta description", () => {
    for (const { path, html } of pages) {
      expect.soft(html.match(/<h1[\s>]/g)?.length, `${path} h1 count`).toBe(1);
      expect.soft(text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""), `${path} title`).not.toBe("");
      expect.soft(meta(html, "name", "description") ?? "", `${path} description`).not.toBe("");
    }
  });

  test("every page's canonical URL is its sitemap URL, and og:url agrees", () => {
    for (const { url, path, html } of pages) {
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect.soft(canonical, `${path} canonical`).toBe(url);
      expect.soft(meta(html, "property", "og:url"), `${path} og:url`).toBe(url);
    }
  });

  test("no page in the sitemap sends noindex", () => {
    for (const { path, html, robotsHeader } of pages) {
      expect.soft(meta(html, "name", "robots") ?? "", `${path} robots meta`).not.toContain("noindex");
      expect.soft(robotsHeader ?? "", `${path} X-Robots-Tag`).not.toContain("noindex");
    }
  });

  test("handbook pages send Article and BreadcrumbList JSON-LD that match the page", () => {
    for (const { path, html } of pages.filter((p) => meta(p.html, "property", "og:type") === "article")) {
      const blocks = jsonLd(html);
      const article = blocks.find((b) => b["@type"] === "Article");
      const breadcrumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
      expect.soft(article?.headline, `${path} Article headline`).toBe(text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ""));
      expect.soft(breadcrumbs?.itemListElement, `${path} BreadcrumbList`).toBeDefined();
    }
  });
});

test.describe("Site-wide SEO files and rules", () => {
  test("robots.txt allows crawlers, blocks AI training bots and names the sitemap", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*\nAllow: \//);
    expect(robots).toContain("Sitemap: https://learn.huyle.work/sitemap.xml");
    const blocked = robots.match(/((?:User-Agent: .+\n)+)Disallow: \//)?.[1] ?? "";
    for (const token of tokensFor("training", "control")) expect.soft(blocked, `${token} disallowed`).toContain(`User-Agent: ${token}\n`);
  });

  test("llms.txt links only to pages in the sitemap", async ({ request }) => {
    const [llms, sitemap] = await Promise.all([request.get("/llms.txt").then((r) => r.text()), request.get("/sitemap.xml").then((r) => r.text())]);
    const listed = [...llms.matchAll(/\]\((https:[^)]+)\)/g)].map((m) => m[1]);
    expect(listed.length).toBeGreaterThan(40);
    for (const url of listed) expect.soft(sitemap, `${url} in the sitemap`).toContain(`<loc>${url}</loc>`);
  });

  test("old practice URLs redirect permanently, straight to the new URL", async ({ request }) => {
    for (const [from, to] of [
      ["/practices", "/react-practices"],
      ["/practices/toast-notifications", "/react-practices/toast-notifications"],
    ]) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect.soft(res.status(), `${from} status`).toBe(308);
      expect.soft(res.headers().location, `${from} target`).toBe(to);
      const target = await request.get(to, { maxRedirects: 0 });
      expect.soft(target.status(), `${to} answers without another redirect`).toBe(200);
    }
  });

  test("lab pages and API responses send noindex", async ({ request }) => {
    for (const path of ["/seo-lab/server", "/api/health"]) {
      const res = await request.get(path);
      expect.soft(res.headers()["x-robots-tag"], `${path} X-Robots-Tag`).toBe("noindex");
    }
  });

  test("an unknown URL returns 404", async ({ request }) => {
    const res = await request.get("/seo/no-such-page");
    expect(res.status()).toBe(404);
  });
});
