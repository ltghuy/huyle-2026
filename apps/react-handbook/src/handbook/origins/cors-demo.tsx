"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";
import type { CorsLogEntry } from "@/server/handbook/cors-lab.schema";

import { type CorsPolicy, type CorsRequest, explain, needsPreflight, preflightReasons } from "./cors-rules";

// The sender runs in a sandboxed iframe without allow-same-origin: its origin
// is opaque ("null"), so its requests to this site are truly cross-origin.
const SENDER = `<!doctype html><meta charset="utf-8"><script>
addEventListener("message", async (event) => {
  const { ping, id, url, init } = event.data || {};
  if (ping) parent.postMessage({ ready: true }, "*");
  if (!id) return;
  try {
    const response = await fetch(url, init);
    parent.postMessage({ id, ok: true, status: response.status, body: await response.text() }, "*");
  } catch (error) {
    parent.postMessage({ id, ok: false, error: String(error) }, "*");
  }
});
parent.postMessage({ ready: true }, "*");
</script>`;

type SendResult = { ok: true; status: number; body: string } | { ok: false; error: string };
type Attempt = { n: number; request: CorsRequest; policy: CorsPolicy; result: SendResult; log: CorsLogEntry[] };

const pending = new Map<number, (result: SendResult) => void>();
let nextN = 1;

function newRun() {
  return `cors-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestInit(request: CorsRequest): RequestInit {
  const headers: Record<string, string> = {};
  if (request.method !== "GET") headers["Content-Type"] = request.json ? "application/json" : "text/plain";
  if (request.customHeader) headers["X-Demo"] = "1";
  return {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : JSON.stringify({ bread: "rye" }),
    credentials: request.credentials ? "include" : "omit",
  };
}

async function readLog(run: string, n: number) {
  const response = await fetch(`/api/handbook/cors/log?run=${run}`);
  const { data } = (await response.json()) as { data: { entries: CorsLogEntry[] } };
  return data.entries.filter((entry) => entry.n === n);
}

export function CorsDemo() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<CorsRequest>({ method: "POST", json: true, customHeader: false, credentials: false });
  const [policy, setPolicy] = useState<CorsPolicy>({ allow: "none", put: false, header: false, credentials: false });
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { ready?: boolean; id?: number } & SendResult;
      if (data.ready) setReady(true);
      if (data.id !== undefined) {
        pending.get(data.id)?.(data);
        pending.delete(data.id);
      }
    }
    addEventListener("message", handleMessage);
    // The sender may have loaded (and said ready) before this listener existed.
    frameRef.current?.contentWindow?.postMessage({ ping: true }, "*");
    return () => removeEventListener("message", handleMessage);
  }, []);

  function sendFromFrame(n: number, url: string, init: RequestInit) {
    const result = new Promise<SendResult>((resolve) => pending.set(n, resolve));
    frameRef.current?.contentWindow?.postMessage({ id: n, url: new URL(url, location.href).href, init }, "*");
    return result;
  }

  async function handleSend() {
    runRef.current ??= newRun();
    const run = runRef.current;
    // A unique n per send also keeps the browser's preflight cache out of the way.
    const n = nextN++;
    setBusy(true);
    const query = new URLSearchParams({
      run,
      n: String(n),
      allow: policy.allow,
      put: policy.put ? "1" : "0",
      header: policy.header ? "1" : "0",
      credentials: policy.credentials ? "1" : "0",
    });
    try {
      const result = await sendFromFrame(n, `/api/handbook/cors?${query}`, requestInit(request));
      const log = await readLog(run, n);
      setAttempt({ n, request, policy, result, log });
    } catch (e) {
      setAttempt({ n, request, policy, result: { ok: false, error: `The demo couldn't read the server log: ${String(e)}` }, log: [] });
    } finally {
      setBusy(false);
    }
  }

  function setReq<K extends keyof CorsRequest>(key: K, value: CorsRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  function setPol<K extends keyof CorsPolicy>(key: K, value: CorsPolicy[K]) {
    setPolicy((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <iframe ref={frameRef} title="Cross-origin sender (sandboxed)" sandbox="allow-scripts" srcDoc={SENDER} hidden />
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="cors-request-title" className="flex flex-col gap-2 rounded-lg border p-3">
          <h4 id="cors-request-title" className="text-sm font-medium">
            The page (origin <span className="font-mono">null</span>) sends
          </h4>
          <Radios name="cors-method" value={request.method} options={["GET", "POST", "PUT"]} onChange={(v) => setReq("method", v as CorsRequest["method"])} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={request.json} onCheckedChange={(on) => setReq("json", on)} title="JSON body" detail="Content-Type: application/json" />
            <Toggle checked={request.customHeader} onCheckedChange={(on) => setReq("customHeader", on)} title="Custom header" detail="X-Demo: 1" />
            <Toggle checked={request.credentials} onCheckedChange={(on) => setReq("credentials", on)} title="With credentials" detail={'credentials: "include" (cookies)'} />
          </div>
          <p className="text-xs text-foreground/85">
            {needsPreflight(request) ? `Needs a preflight: ${preflightReasons(request).join("; ")}.` : "A simple request: no preflight."}
          </p>
        </section>
        <section aria-labelledby="cors-policy-title" className="flex flex-col gap-2 rounded-lg border p-3">
          <h4 id="cors-policy-title" className="text-sm font-medium">
            The server answers with
          </h4>
          <Radios
            name="cors-allow"
            value={policy.allow}
            options={["none", "any", "origin"]}
            labels={{ none: "No CORS headers", any: "Allow-Origin: *", origin: "Allow-Origin: the caller" }}
            onChange={(v) => setPol("allow", v as CorsPolicy["allow"])}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={policy.put} onCheckedChange={(on) => setPol("put", on)} title="Allow PUT" detail="Allow-Methods: GET, POST, PUT" />
            <Toggle checked={policy.header} onCheckedChange={(on) => setPol("header", on)} title="Allow the headers" detail="Allow-Headers: Content-Type, X-Demo" />
            <Toggle checked={policy.credentials} onCheckedChange={(on) => setPol("credentials", on)} title="Allow credentials" detail="Allow-Credentials: true" />
          </div>
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!ready || busy} onClick={handleSend}>
          {busy ? "Sending…" : ready ? "Send cross-origin request" : "Preparing…"}
        </Button>
        <span className="text-xs text-foreground/75">A blocked request also logs a CORS error in the browser console: that&apos;s expected.</span>
      </div>
      {attempt ? <AttemptView attempt={attempt} /> : null}
    </div>
  );
}

function AttemptView({ attempt }: { attempt: Attempt }) {
  const expected = explain(attempt.request, attempt.policy);
  const read = attempt.result.ok;
  const preflight = attempt.log.find((e) => e.preflight);
  const actual = attempt.log.find((e) => !e.preflight);
  return (
    <div aria-live="polite" className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
        <Verdict pass={read}>{read ? "The page could read the response" : "Blocked: the page can't read the response"}</Verdict>
        <p className="font-mono text-xs break-all text-foreground/85">
          {attempt.result.ok ? `${attempt.result.status} ${attempt.result.body}` : attempt.result.error}
        </p>
        <p className="text-foreground/85">{expected.reason}</p>
        {expected.allowed !== read ? <p className="text-xs text-destructive">The browser decided differently from the rules above; trust the browser.</p> : null}
        {!read && actual ? <p className="text-xs font-medium">The request still reached the server and ran: CORS protects reading, not sending.</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground/75">Measured: what the server received (its own log)</p>
        <ol className="flex flex-col gap-1 font-mono text-xs">
          {attempt.log.length === 0 ? <li>nothing</li> : null}
          {preflight ? (
            <li className="break-all">
              OPTIONS (preflight) · Origin: {preflight.origin ?? "none"} · asks {preflight.requestMethod}
              {preflight.requestHeaders ? ` + ${preflight.requestHeaders}` : ""}
            </li>
          ) : null}
          {actual ? (
            <li className="break-all">
              {actual.method} · Origin: {actual.origin ?? "none"}
            </li>
          ) : preflight ? (
            <li className="text-destructive">no {attempt.request.method}: the browser stopped after the preflight</li>
          ) : null}
        </ol>
      </div>
    </div>
  );
}

function Radios({ name, value, options, labels, onChange }: { name: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
      <legend className="sr-only">{name === "cors-method" ? "Method" : "Access-Control-Allow-Origin"}</legend>
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} className="size-4 accent-primary" />
          <span className={cn(!labels && "font-mono")}>{labels?.[option] ?? option}</span>
        </label>
      ))}
    </fieldset>
  );
}
