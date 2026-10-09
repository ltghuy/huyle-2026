import "server-only";

import { Resolver } from "node:dns/promises";

import type { DnsRecord, DnsResult, DnsType } from "./dns.schema";

const TIMEOUT_MS = 3000;

async function lookup(resolver: Resolver, name: string, type: DnsType): Promise<DnsRecord[]> {
  switch (type) {
    case "A":
      return (await resolver.resolve4(name, { ttl: true })).map((r) => ({ value: r.address, ttl: r.ttl }));
    case "AAAA":
      return (await resolver.resolve6(name, { ttl: true })).map((r) => ({ value: r.address, ttl: r.ttl }));
    case "CNAME":
      return (await resolver.resolveCname(name)).map((value) => ({ value }));
    case "MX":
      return (await resolver.resolveMx(name)).sort((a, b) => a.priority - b.priority).map((r) => ({ value: `${r.priority} ${r.exchange}` }));
    case "TXT":
      return (await resolver.resolveTxt(name)).map((chunks) => ({ value: chunks.join("") }));
    case "NS":
      return (await resolver.resolveNs(name)).map((value) => ({ value }));
  }
}

/** Look a name up with this server's resolver. "not-found" when the name doesn't exist. */
export async function resolveName(name: string, type: DnsType): Promise<DnsResult | "not-found" | "timeout"> {
  const resolver = new Resolver({ timeout: TIMEOUT_MS, tries: 1 });
  const started = performance.now();
  try {
    const records = await lookup(resolver, name, type);
    return { name, type, records, ms: Math.round(performance.now() - started) };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND") return "not-found";
    if (code === "ENODATA") return { name, type, records: [], ms: Math.round(performance.now() - started), reason: "no-data" };
    if (code === "ETIMEOUT") return "timeout";
    throw error;
  }
}
