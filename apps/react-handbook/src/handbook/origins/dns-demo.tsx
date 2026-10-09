"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DNS_TYPES, type DnsResult, type DnsType } from "@/server/handbook/dns.schema";

const TYPE_TEXT: Record<DnsType, string> = {
  A: "IPv4 address",
  AAAA: "IPv6 address",
  CNAME: "alias to another name",
  MX: "mail servers (priority, host)",
  TXT: "text: domain verification, SPF, DKIM",
  NS: "the domain's own name servers",
};

const PRESETS: [string, DnsType][] = [
  ["example.com", "A"],
  ["www.github.com", "CNAME"],
  ["gmail.com", "MX"],
  ["no-such-name.example", "A"],
];

type Outcome = { kind: "ok"; result: DnsResult } | { kind: "error"; message: string };

async function lookUp(name: string, type: DnsType): Promise<Outcome> {
  const response = await fetch(`/api/handbook/dns?name=${encodeURIComponent(name)}&type=${type}`);
  const json = (await response.json()) as { data?: DnsResult; error?: { message: string; issues?: unknown } };
  if (json.data) return { kind: "ok", result: json.data };
  return { kind: "error", message: response.status === 422 ? "That isn't a valid host name (letters, digits, hyphens and dots)." : (json.error?.message ?? `Failed (${response.status})`) };
}

export function DnsDemo() {
  const [name, setName] = useState("example.com");
  const [type, setType] = useState<DnsType>("A");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, setPending] = useState(false);

  async function run(nextName: string, nextType: DnsType) {
    setPending(true);
    try {
      setOutcome(await lookUp(nextName, nextType));
    } catch (e) {
      setOutcome({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void run(name, type);
  }

  function handlePreset([presetName, presetType]: [string, DnsType]) {
    setName(presetName);
    setType(presetType);
    void run(presetName, presetType);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dns-name">Host name</Label>
          <Input id="dns-name" value={name} spellCheck={false} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dns-type">Record type</Label>
          <select id="dns-type" value={type} onChange={(e) => setType(e.target.value as DnsType)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30">
            {DNS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} · {TYPE_TEXT[t]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Looking up…" : "Look up"}
        </Button>
      </form>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/75">
        Try:
        {PRESETS.map((preset) => (
          <button key={preset.join()} type="button" onClick={() => handlePreset(preset)} className="rounded-sm font-mono underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {preset[1]} {preset[0]}
          </button>
        ))}
      </p>

      <div aria-live="polite" className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium text-foreground/75">Measured: this site&apos;s server asked its resolver</p>
          {outcome === null ? (
            <p className="text-xs text-muted-foreground">Look up a name to see its records.</p>
          ) : outcome.kind === "error" ? (
            <p className="flex items-center gap-2 text-destructive">
              <TriangleAlert aria-hidden className="size-4 shrink-0" />
              {outcome.message}
            </p>
          ) : outcome.result.records.length === 0 ? (
            <p>
              {outcome.result.name} exists but has no {outcome.result.type} record ({outcome.result.ms} ms).
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-0.5 font-mono text-xs">
                {outcome.result.records.map((record) => (
                  <li key={record.value} className="break-all">
                    {outcome.result.name} {outcome.result.type} {record.value}
                    {record.ttl !== undefined ? <span className="text-foreground/75"> · TTL {record.ttl} s</span> : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-foreground/75">
                {outcome.result.records.length} record{outcome.result.records.length === 1 ? "" : "s"} in {outcome.result.ms} ms. A repeat lookup is often faster: the resolver cached it.
              </p>
            </>
          )}
        </div>
        <ResolverChain name={outcome?.kind === "ok" ? outcome.result.name : name} />
      </div>
    </div>
  );
}

/** Illustration of a full (uncached) resolution for the name. */
function ResolverChain({ name }: { name: string }) {
  const labels = name.replace(/\.$/, "").split(".").filter(Boolean);
  const tld = labels.at(-1) ?? "com";
  const domain = labels.slice(-2).join(".") || "example.com";
  const steps = [
    ["Browser and OS cache", "Seen recently? Answer at once."],
    ["Recursive resolver (ISP, 1.1.1.1, 8.8.8.8)", "Has it cached? Otherwise it asks on your behalf:"],
    ["Root server", `“Who handles .${tld}?” → the .${tld} servers`],
    [`.${tld} TLD server`, `“Who handles ${domain}?” → ${domain}'s name servers`],
    [`${domain} name server (authoritative)`, `“${name || domain}?” → the record, with a TTL`],
    ["Back down the chain", "Each cache keeps the answer for its TTL."],
  ];
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      <li className="text-xs font-medium text-foreground/75">How a resolver finds it (illustration)</li>
      {steps.map(([who, what], i) => (
        <li key={who} className="flex gap-2">
          <span className="font-mono text-xs leading-5 text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="min-w-0">
            <span className="font-medium">{who}</span>
            <span className="block text-xs break-words text-foreground/85">{what}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
