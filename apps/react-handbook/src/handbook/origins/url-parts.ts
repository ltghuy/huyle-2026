// URL parts, origins and sites, using the browser's own URL parser. The site
// uses a short built-in list of multi-label public suffixes instead of the
// full Public Suffix List, so it is a simplification.

const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "co.jp", "co.kr", "com.vn", "com.br", "co.nz", "co.in",
  "github.io", "vercel.app", "netlify.app", "pages.dev", "herokuapp.com", "web.app", "appspot.com", "cloudfront.net",
]);

const DEFAULT_PORT: Record<string, string> = { "http:": "80", "https:": "443", "ws:": "80", "wss:": "443", "ftp:": "21" };
const IP = /^(\d{1,3}\.){3}\d{1,3}$|^\[[0-9a-f:]+\]$/i;

/** Scheme + registrable domain (one label under the public suffix); hosts like localhost and IPs are their own site. */
export function siteOf(url: URL): string | null {
  if (url.origin === "null") return null;
  const host = url.hostname;
  if (IP.test(host) || !host.includes(".")) return `${url.protocol}//${host}`;
  const labels = host.split(".");
  const lastTwo = labels.slice(-2).join(".");
  const suffixLength = MULTI_LABEL_SUFFIXES.has(lastTwo) ? 2 : 1;
  const registrable = labels.slice(-(suffixLength + 1)).join(".");
  return `${url.protocol}//${registrable}`;
}

export type Dissected =
  | { ok: false; reason: string }
  | {
      ok: true;
      parts: { label: string; value: string; note?: string }[];
      origin: string;
      site: string | null;
    };

export function dissect(input: string): Dissected {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Type a URL, like https://shop.example.com:8443/cart?item=42#reviews." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return /^[\w-]+(\.[\w-]+)+/.test(text)
      ? { ok: false, reason: `“${text}” has no scheme, so it isn't an absolute URL. Browsers guess https:// in the address bar, but code must not.` }
      : { ok: false, reason: "The browser can't parse this as a URL." };
  }
  const defaultPort = DEFAULT_PORT[url.protocol];
  const parts: { label: string; value: string; note?: string }[] = [
    { label: "Scheme", value: url.protocol.replace(":", ""), note: "how to talk to the server" },
  ];
  if (url.username || url.password) parts.push({ label: "User info", value: `${url.username}${url.password ? ":••••" : ""}`, note: "credentials in a URL: avoid, they leak into logs" });
  parts.push(
    { label: "Hostname", value: url.hostname || "(none)", note: "the name DNS looks up" },
    { label: "Port", value: url.port || (defaultPort ? `${defaultPort} (default, not written)` : "(none)") },
    { label: "Host", value: url.host || "(none)", note: "hostname + port if written; sent in the Host header" },
    { label: "Path", value: decodeURIComponent(url.pathname) || "/" },
  );
  const params = [...url.searchParams];
  parts.push({ label: "Query", value: params.length ? params.map(([k, v]) => `${k} = ${v}`).join(", ") : "(none)" });
  parts.push({ label: "Fragment", value: url.hash ? decodeURIComponent(url.hash.slice(1)) : "(none)", note: url.hash ? "never sent to the server" : undefined });
  return { ok: true, parts, origin: url.origin, site: siteOf(url) };
}

export type Comparison =
  | { ok: false; reason: string }
  | { ok: true; a: URL; b: URL; sameOrigin: boolean; sameSite: boolean; differs: string[] };

export function compareOrigins(first: string, second: string): Comparison {
  let a: URL;
  let b: URL;
  try {
    a = new URL(first.trim());
    b = new URL(second.trim());
  } catch {
    return { ok: false, reason: "Both need to be absolute URLs (with a scheme)." };
  }
  const port = (u: URL) => u.port || DEFAULT_PORT[u.protocol] || "";
  const differs = [
    a.protocol !== b.protocol ? "scheme" : null,
    a.hostname !== b.hostname ? "host" : null,
    // A different scheme brings a different default port; name the scheme only.
    port(a) !== port(b) && !(a.protocol !== b.protocol && !a.port && !b.port) ? "port" : null,
  ].filter((x): x is string => x !== null);
  const siteA = siteOf(a);
  return { ok: true, a, b, sameOrigin: a.origin !== "null" && a.origin === b.origin, sameSite: siteA !== null && siteA === siteOf(b), differs };
}
