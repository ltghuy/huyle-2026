"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ECHO_STATUSES, type EchoReceived } from "@/server/handbook/http-echo.schema";

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;
type Method = (typeof METHODS)[number];

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

const CLASS_TEXT: Record<string, string> = {
  "2": "2xx success: the request worked (201 created something, 204 has no body).",
  "3": "3xx redirection: look elsewhere; fetch follows the Location header for you.",
  "4": "4xx client error: fix the request (bad input, not signed in, wrong address, too many requests).",
  "5": "5xx server error: the server failed; retrying later may help (see Retry-After).",
};

type Result = {
  status: number;
  statusText: string;
  redirected: boolean;
  url: string;
  headers: [string, string][];
  received: EchoReceived | null;
  body: string;
  elapsed: number;
};

async function send(method: Method, status: number, body: string): Promise<Result> {
  const started = performance.now();
  const hasBody = method !== "GET" && body.trim() !== "";
  const response = await fetch(`/api/handbook/http?status=${status}`, {
    method,
    headers: hasBody ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
    body: hasBody ? body : undefined,
  });
  const text = await response.text();
  let received: EchoReceived | null = null;
  try {
    received = (JSON.parse(text) as { data?: { received?: EchoReceived } }).data?.received ?? null;
  } catch {
    // An empty body (204) isn't JSON.
  }
  return {
    status: response.status,
    statusText: response.statusText || STATUS_TEXT[response.status] || "",
    redirected: response.redirected,
    url: new URL(response.url).pathname + new URL(response.url).search,
    headers: [...response.headers],
    received,
    body: text,
    elapsed: Math.round(performance.now() - started),
  };
}

function bodyError(method: Method, body: string) {
  if (method === "GET" || body.trim() === "") return null;
  try {
    JSON.parse(body);
    return null;
  } catch {
    return "The body isn't valid JSON, so it wasn't sent.";
  }
}

export function HttpDemo() {
  const [method, setMethod] = useState<Method>("POST");
  const [status, setStatus] = useState(201);
  const [body, setBody] = useState('{ "name": "Sourdough", "price": 4.5 }');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const invalid = bodyError(method, body);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (invalid) return;
    setPending(true);
    setError(null);
    try {
      setResult(await send(method, status, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSend} className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto] md:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="http-method">Method</Label>
          <select id="http-method" value={method} onChange={(e) => setMethod(e.target.value as Method)} className={SELECT}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="http-status">Server answers with</Label>
          <select id="http-status" value={status} onChange={(e) => setStatus(Number(e.target.value))} className={SELECT}>
            {ECHO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s} {STATUS_TEXT[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="http-body">JSON body {method === "GET" ? "(GET has no body)" : "(optional)"}</Label>
          <Textarea
            id="http-body"
            rows={1}
            value={body}
            disabled={method === "GET"}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? "http-body-error" : undefined}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-9 font-mono text-xs"
          />
        </div>
        <Button type="submit" disabled={pending || Boolean(invalid)}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        {invalid ? (
          <p id="http-body-error" className="text-xs font-medium text-destructive md:col-span-4">
            {invalid}
          </p>
        ) : null}
      </form>

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          <TriangleAlert aria-hidden className="size-4" />
          The request failed: {error}
        </p>
      ) : null}

      {result ? <Exchange result={result} /> : <p className="text-sm text-muted-foreground">Send a request to see the real exchange.</p>}
    </div>
  );
}

const SELECT = "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Exchange({ result }: { result: Result }) {
  const received = result.received;
  return (
    <div aria-live="polite" className="grid gap-4 lg:grid-cols-2">
      <Message title="Request (as the server received it)">
        {received ? (
          <>
            <p className="font-semibold">
              {received.method} {received.url}
            </p>
            {received.headers.map(([name, value]) => (
              <p key={name} className="break-all">
                <span className="text-foreground/75">{name}:</span> {value}
              </p>
            ))}
            {received.body ? <p className="mt-2 break-all">{received.body}</p> : null}
          </>
        ) : (
          <p className="text-foreground/75">This status has no response body, so the server&apos;s echo isn&apos;t shown.</p>
        )}
      </Message>
      <Message title={`Response · ${result.elapsed} ms`}>
        <p className={cn("font-semibold", result.status >= 400 && "text-destructive")}>
          {result.status} {result.statusText}
        </p>
        {result.headers.map(([name, value]) => (
          <p key={name} className="break-all">
            <span className="text-foreground/75">{name}:</span> {value}
          </p>
        ))}
        {result.body ? <p className="mt-2 break-all">{result.body}</p> : <p className="mt-2 text-foreground/75">(no body)</p>}
      </Message>
      <p className="text-sm text-foreground/85 lg:col-span-2">
        {result.redirected ? (
          <>
            The server answered <strong>301</strong>; fetch followed its <code className="font-mono text-xs">Location</code> to{" "}
            <code className="font-mono text-xs">{result.url}</code>, so the script only sees the final {result.status}.{" "}
          </>
        ) : null}
        {CLASS_TEXT[String(result.redirected ? 3 : Math.floor(result.status / 100))]}
      </p>
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-foreground/75">{title}</p>
      <div className="font-mono text-xs">{children}</div>
    </div>
  );
}
