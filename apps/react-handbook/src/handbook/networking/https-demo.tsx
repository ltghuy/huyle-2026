"use client";

import { Eye, Lock } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Mode = "http" | "https";

// What someone on the same network (café Wi-Fi, an ISP) can read.
const PARTS: { part: string; value: string; readableOverHttps: boolean; note?: string }[] = [
  { part: "IP addresses", value: "192.0.2.10 → 203.0.113.5", readableOverHttps: true, note: "needed to route packets" },
  { part: "Host name", value: "shop.example", readableOverHttps: true, note: "from DNS and the TLS server name (SNI) unless both are encrypted" },
  { part: "Sizes and timing", value: "~1.2 KB up, ~3 KB down, 80 ms", readableOverHttps: true, note: "can hint at what you did" },
  { part: "Path and query", value: "POST /account/login?next=/orders", readableOverHttps: false },
  { part: "Headers", value: "User-Agent, Accept-Language, Referer…", readableOverHttps: false },
  { part: "Cookie", value: "session=8f2c…", readableOverHttps: false, note: "stolen, it lets someone act as you" },
  { part: "Body", value: "email=ada@example.com&password=…", readableOverHttps: false },
];

const noopSubscribe = () => () => {};

function readContext() {
  return JSON.stringify({ protocol: location.protocol, host: location.hostname, secure: window.isSecureContext });
}

export function HttpsDemo() {
  const [mode, setMode] = useState<Mode>("http");
  const snapshot = useSyncExternalStore(noopSubscribe, readContext, () => "");
  const context = snapshot ? (JSON.parse(snapshot) as { protocol: string; host: string; secure: boolean }) : null;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium">The same login request over</legend>
        {(["http", "https"] as const).map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              mode === option ? "border-primary/40 bg-primary/5" : "border-dashed",
            )}
          >
            <input type="radio" name="https-mode" checked={mode === option} onChange={() => setMode(option)} className="size-4 accent-primary" />
            <span className="font-mono">{option}://</span>
          </label>
        ))}
      </fieldset>

      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium text-foreground/75">What someone on the same network can read (illustration)</caption>
          <thead>
            <tr className="border-b text-xs">
              <th scope="col" className="py-1.5 pr-3 font-medium">
                Part
              </th>
              <th scope="col" className="py-1.5 pr-3 font-medium">
                They see
              </th>
              <th scope="col" className="py-1.5 font-medium">
                Example
              </th>
            </tr>
          </thead>
          <tbody aria-live="polite">
            {PARTS.map((row) => {
              const readable = mode === "http" || row.readableOverHttps;
              return (
                <tr key={row.part} className="border-b align-top last:border-0">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{row.part}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", readable ? "text-destructive" : "text-success")}>
                      {readable ? <Eye aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}
                      {readable ? "Readable" : "Encrypted"}
                    </span>
                  </td>
                  <td className="py-1.5 text-xs">
                    <span className={cn("font-mono break-all", !readable && "text-muted-foreground")}>{readable ? row.value : "••••••••••••"}</span>
                    {row.note && readable ? <span className="block text-foreground/75">{row.note}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/85">
        {mode === "http"
          ? "Over HTTP anyone on the path can also change the page on the way: inject ads or scripts, or swap a download."
          : "TLS also checks the server's certificate (so you talk to the real shop.example) and detects any change in transit."}
      </p>

      <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="text-xs font-medium text-foreground/75">Measured: this page</p>
        {context ? (
          <>
            <p>
              Loaded over <span className="font-mono font-medium">{context.protocol.replace(":", "")}</span>; secure context:{" "}
              <span className="font-medium">{context.secure ? "yes" : "no"}</span>
              {context.protocol === "http:" && context.secure ? ` (${context.host} counts as secure even without HTTPS)` : ""}.
            </p>
            <p className="text-xs text-foreground/85">
              {context.secure
                ? "So this page may use service workers, the clipboard, geolocation, Web Crypto and passkeys, which browsers only allow in secure contexts."
                : "Not a secure context: service workers, the clipboard, geolocation, Web Crypto and passkeys are blocked here."}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Reading…</p>
        )}
      </div>
    </div>
  );
}
