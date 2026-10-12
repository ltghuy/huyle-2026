"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Verdict } from "@/handbook/ui";
import { SAME_SITES, type CookieLogEntry, type SameSite } from "@/server/handbook/jwt/jwt.schema";

import { Choice, fetchJson, newRun } from "./token-view";

type Place = "local" | "session" | "memory" | "cookie";

const PLACE_OPTIONS: { value: Place; label: string }[] = [
  { value: "local", label: "localStorage" },
  { value: "session", label: "sessionStorage" },
  { value: "memory", label: "A variable in the app" },
  { value: "cookie", label: "HttpOnly cookie" },
];
const SAME_SITE_OPTIONS = SAME_SITES.map((value) => ({ value, label: value }));
const PLACE_NAMES: Record<Place, string> = {
  local: "localStorage (kept after the tab closes)",
  session: "sessionStorage (this tab only)",
  memory: "a variable inside the app's code (gone on reload)",
  cookie: "an HttpOnly cookie set by the server",
};

const STORAGE_KEY = "hb_demo_token";
const API = "/api/handbook/jwt/cookie/api";

// The "memory" option: module scope, not a property of window.
const memory: { token: string | null } = { token: null };

let nextN = 1;

// The "other site": a sandboxed frame without allow-same-origin, so its origin
// is opaque and its request to this site counts as cross-site.
const OTHER_SITE = `<!doctype html><meta charset="utf-8"><script>
addEventListener("message", async (event) => {
  const { ping, id, url } = event.data || {};
  if (ping) { parent.postMessage({ ready: true }, "*"); return; }
  if (!id) return;
  try {
    const response = await fetch(url, { credentials: "include" });
    parent.postMessage({ id, status: response.status }, "*");
  } catch (error) {
    parent.postMessage({ id, status: 0, error: String(error) }, "*");
  }
});
parent.postMessage({ ready: true }, "*");
</script>`;

function storageFor(place: Place): Storage | null {
  if (place === "local") return localStorage;
  if (place === "session") return sessionStorage;
  return null;
}

function readToken(place: Place): string | null {
  if (place === "memory") return memory.token;
  if (place === "cookie") return null; // HttpOnly: unreadable from the page; the browser attaches it
  try {
    return storageFor(place)!.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function clearEverywhere() {
  memory.token = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked (private mode): nothing to clear
  }
  await fetch("/api/handbook/jwt/cookie", { method: "DELETE" });
}

async function readLogEntry(run: string, n: number) {
  const { entries } = await fetchJson<{ entries: CookieLogEntry[] }>(`/api/handbook/jwt/cookie/log?run=${run}`);
  return entries.find((entry) => entry.n === n) ?? null;
}

type StoreResult = { place: Place; sameSite: SameSite; note: string };
type ScriptResult = { couldRead: boolean; readNote: string; requestNote: string };
type CrossResult = { status: number; entry: CookieLogEntry | null; note: string };

export function StorageDemo() {
  const [place, setPlace] = useState<Place>("local");
  const [sameSite, setSameSite] = useState<SameSite>("Lax");
  const [stored, setStored] = useState<StoreResult | null>(null);
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runRef = useRef(newRun("cookie"));
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef(new Map<number, (status: number) => void>());
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { ready?: boolean; id?: number; status?: number };
      if (data.ready) setFrameReady(true);
      if (data.id !== undefined) {
        pending.current.get(data.id)?.(data.status ?? 0);
        pending.current.delete(data.id);
      }
    }
    addEventListener("message", handleMessage);
    frameRef.current?.contentWindow?.postMessage({ ping: true }, "*");
    return () => removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => () => void clearEverywhere(), []);

  async function handleStore() {
    setBusy(true);
    setError(null);
    setScriptResult(null);
    setCrossResult(null);
    try {
      await clearEverywhere();
      const run = runRef.current;
      if (place === "cookie") {
        await fetchJson(`/api/handbook/jwt/cookie`, { body: { run, sameSite } });
      } else {
        const { token } = await fetchJson<{ token: string }>("/api/handbook/jwt/token", { body: { alg: "ES256", sub: "alice", role: "reader", ttl: 600 } });
        if (place === "memory") memory.token = token;
        else storageFor(place)!.setItem(STORAGE_KEY, token);
      }
      setStored({ place, sameSite, note: `A token is now in ${PLACE_NAMES[place]}${place === "cookie" ? ` with SameSite=${sameSite}` : ""}.` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // The "injected script": a fixed function standing in for what an XSS payload
  // would run in this page. It tries to read the token, then makes an
  // authenticated request the way the app would.
  async function handleInject() {
    if (!stored) return;
    setBusy(true);
    setError(null);
    try {
      const run = runRef.current;
      const token = readToken(stored.place);
      const couldRead = token !== null;
      const readNote = couldRead
        ? `Read the token straight out of ${PLACE_NAMES[stored.place]}: ${token.slice(0, 24)}… It can now be sent anywhere.`
        : stored.place === "cookie"
          ? "Could not read it: an HttpOnly cookie is invisible to JavaScript (document.cookie doesn't show it)."
          : "Nothing stored to read.";
      const n = nextN++;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const response = await fetch(`${API}?run=${run}&n=${n}&from=script`, { credentials: "include", headers });
      const entry = await readLogEntry(run, n);
      const requestNote = response.ok
        ? `It then called the API and was authenticated (via the ${entry?.via}). Reading the token or not, the script can act as the user.`
        : "The API refused the script's request.";
      setScriptResult({ couldRead, readNote, requestNote });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function sendFromFrame(url: string, n: number) {
    return new Promise<number>((resolve) => {
      pending.current.set(n, resolve);
      frameRef.current?.contentWindow?.postMessage({ id: n, url: new URL(url, location.href).href }, "*");
    });
  }

  async function handleCrossSite() {
    if (!stored) return;
    setBusy(true);
    setError(null);
    try {
      const run = runRef.current;
      const n = nextN++;
      const status = await sendFromFrame(`${API}?run=${run}&n=${n}&from=other-site`, n);
      const entry = await readLogEntry(run, n);
      const carried = entry?.via === "cookie";
      const note =
        stored.place === "cookie"
          ? carried
            ? `The cookie rode along with this cross-site request (SameSite=${stored.sameSite}). This is the shape of a CSRF attack.`
            : `The cookie was held back (SameSite=${stored.sameSite} keeps it off cross-site requests), so the request arrived with no token.`
          : "A token in storage is never attached automatically: another site's script can't reach this site's storage, and the request arrives with no token.";
      setCrossResult({ status, entry, note });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <iframe ref={frameRef} title="Another website (sandboxed)" sandbox="allow-scripts" srcDoc={OTHER_SITE} hidden />

      <section aria-labelledby="store-where" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="store-where" className="text-sm font-medium">
          1. Where does the token live?
        </h4>
        <Choice legend="Storage" hideLegend value={place} options={PLACE_OPTIONS} onChange={setPlace} />
        {place === "cookie" ? <Choice legend="Cookie SameSite" value={sameSite} options={SAME_SITE_OPTIONS} onChange={setSameSite} /> : null}
        <div>
          <Button onClick={handleStore} disabled={busy}>
            Sign in and store the token
          </Button>
        </div>
        {stored ? (
          <p aria-live="polite" className="text-xs font-medium">
            {stored.note}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="attacks" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="attacks" className="text-sm font-medium">
          2. Attack it
        </h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleInject} disabled={busy || !stored}>
            Run a script injected into this page (XSS)
          </Button>
          <Button variant="outline" onClick={handleCrossSite} disabled={busy || !stored || !frameReady}>
            {frameReady ? "Send a request from another site (CSRF)" : "Preparing…"}
          </Button>
        </div>
        <div aria-live="polite" className="flex flex-col gap-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {scriptResult ? (
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-medium text-foreground/75">Injected script (same page as the token)</p>
              <Verdict pass={!scriptResult.couldRead}>{scriptResult.couldRead ? "Stole the token" : "Could not read the token"}</Verdict>
              <p className="text-foreground/85">{scriptResult.readNote}</p>
              <p className="text-foreground/85">{scriptResult.requestNote}</p>
            </div>
          ) : null}
          {crossResult ? (
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-medium text-foreground/75">Request from another site (its log entry)</p>
              <p className="font-mono text-xs break-all">
                origin: {crossResult.entry?.origin ?? "null"} · Sec-Fetch-Site: {crossResult.entry?.fetchSite ?? "—"} · token via: {crossResult.entry?.via ?? "none"} · status {crossResult.status || "blocked"}
              </p>
              <p className="text-foreground/85">{crossResult.note}</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
