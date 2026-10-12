"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Verdict } from "@/handbook/ui";
import { Choice, fetchJson } from "@/handbook/jwt/token-view";
import { DESTRUCTIVE_TEXT } from "@/practices/accessible-modal/modal";
import { cn } from "@/lib/utils";
import { DEFENCES, SAME_SITES, type CsrfLogEntry, type CsrfState, type Defence, type SameSite } from "@/server/handbook/security/security.schema";

// The attacker's site: an opaque-origin sandboxed frame (Origin: null), so its
// POST to our endpoint is a genuine cross-site request with a real cookie
// decision. It can add a custom header only because the server's CORS allows
// it; a real cross-site <form> could not.
const ATTACKER_SITE = `<!doctype html><meta charset="utf-8"><script>
addEventListener("message", async (event) => {
  const { ping, id, url, withHeader } = event.data || {};
  if (ping) { parent.postMessage({ ready: true }, "*"); return; }
  if (!id) return;
  const headers = withHeader ? { "X-Requested-With": "fetch" } : {};
  try {
    const response = await fetch(url, { method: "POST", credentials: "include", headers, body: "{}" });
    parent.postMessage({ id, status: response.status }, "*");
  } catch (error) {
    parent.postMessage({ id, status: 0, error: String(error) }, "*");
  }
});
parent.postMessage({ ready: true }, "*");
</script>`;

const SAME_SITE_OPTIONS = SAME_SITES.map((value) => ({ value, label: value }));
const DEFENCE_LABELS: Record<Defence, string> = { none: "None", token: "Synchronizer token", header: "Required custom header" };
const DEFENCE_OPTIONS = DEFENCES.map((value) => ({ value, label: DEFENCE_LABELS[value] }));
const DO_URL = "/api/handbook/security/csrf/do";

let nextN = 1;

export function CsrfDemo() {
  const [sameSite, setSameSite] = useState<SameSite>("None");
  const [defence, setDefence] = useState<Defence>("none");
  const [sid, setSid] = useState<string | null>(null);
  const [state, setState] = useState<CsrfState | null>(null);
  const [log, setLog] = useState<CsrfLogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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

  async function reloadLog(forSid: string) {
    try {
      const data = await fetchJson<{ entries: CsrfLogEntry[]; state: CsrfState }>(`/api/handbook/security/csrf/log?sid=${forSid}`);
      setLog(data.entries);
      setState(data.state);
    } catch {
      // session gone (server restart): leave the last view
    }
  }

  async function handleLogin() {
    setBusy(true);
    setNote(null);
    try {
      const { sid: newSid, state: newState } = await fetchJson<{ sid: string; state: CsrfState }>("/api/handbook/security/csrf", { body: { action: "login", sameSite, defence }, credentials: "include" });
      setSid(newSid);
      setState(newState);
      setLog([]);
      setNote(`Signed in. A session cookie was set with SameSite=${sameSite}; the CSRF defence is "${DEFENCE_LABELS[defence]}".`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // The legitimate app making its own request (same-origin, cookie + token as needed).
  async function handleLegit() {
    if (!sid || !state) return;
    setBusy(true);
    try {
      const n = nextN++;
      const query = new URLSearchParams({ sid, n: String(n), from: "page", amount: "100" });
      if (state.defence === "token") query.set("token", state.token);
      const headers = state.defence === "header" ? { "X-Requested-With": "fetch" } : undefined;
      await fetch(`${DO_URL}?${query}`, { method: "POST", credentials: "include", headers, body: "{}" }).catch(() => {});
      setNote("The real app sent its own request, with the cookie and whatever defence it uses.");
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  // A forged request that DOES carry the cookie: a same-site/subdomain attacker,
  // or any browser from before SameSite. It omits the app's token and header, so
  // only a CSRF token or required header can tell it from the real thing.
  async function handleForged() {
    if (!sid) return;
    setBusy(true);
    try {
      const n = nextN++;
      const query = new URLSearchParams({ sid, n: String(n), from: "subdomain", amount: "100" });
      await fetch(`${DO_URL}?${query}`, { method: "POST", credentials: "include", body: "{}" }).catch(() => {});
      setNote("A forged request that still carried the cookie — only a token or required header can stop it.");
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  function sendFromFrame(url: string, n: number, withHeader: boolean) {
    return new Promise<number>((resolve) => {
      pending.current.set(n, resolve);
      frameRef.current?.contentWindow?.postMessage({ id: n, url: new URL(url, location.href).href, withHeader }, "*");
    });
  }

  async function handleAttack(withHeader: boolean) {
    if (!sid) return;
    setBusy(true);
    try {
      const n = nextN++;
      const query = new URLSearchParams({ sid, n: String(n), from: "other-site", amount: "100" });
      await sendFromFrame(`${DO_URL}?${query}`, n, withHeader);
      setNote("Mallory's site sent a cross-site POST using whatever the browser attached.");
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <iframe ref={frameRef} title="Attacker's website (sandboxed)" sandbox="allow-scripts" srcDoc={ATTACKER_SITE} hidden />

      <section aria-labelledby="csrf-login" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="csrf-login" className="text-sm font-medium">
          1. Sign in to the sample app
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice legend="Session cookie SameSite" value={sameSite} options={SAME_SITE_OPTIONS} onChange={setSameSite} />
          <Choice legend="CSRF defence" value={defence} options={DEFENCE_OPTIONS} onChange={setDefence} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleLogin} disabled={busy}>
            {sid ? "Sign in again" : "Sign in"}
          </Button>
          {state ? <span className="font-mono text-sm">Balance: {state.balance}</span> : null}
        </div>
      </section>

      {sid && state ? (
        <section aria-labelledby="csrf-act" className="flex flex-col gap-3 rounded-lg border p-3">
          <h4 id="csrf-act" className="text-sm font-medium">
            2. Make the transfer request
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleLegit} disabled={busy}>
              The real app transfers (same site)
            </Button>
            <Button variant="outline" onClick={handleForged} disabled={busy}>
              A forged request that carries your cookie
            </Button>
            <Button variant="outline" onClick={() => handleAttack(false)} disabled={busy || !frameReady}>
              {frameReady ? "Mallory's unrelated site transfers (cross-site)" : "Preparing…"}
            </Button>
            {defence === "header" ? (
              <Button variant="outline" onClick={() => handleAttack(true)} disabled={busy}>
                Mallory adds the custom header (needs CORS)
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-foreground/75">
            A modern browser withholds the cookie from an unrelated cross-site request (SameSite, and third-party-cookie blocking) — the first line. The middle button models an attacker whose cookie still rides (a same-site/subdomain page, or an older browser), where only a token or required header stops it.
          </p>
          <p aria-live="polite" className="min-h-5 text-sm text-foreground/85">
            {note}
          </p>
        </section>
      ) : null}

      {log.length > 0 ? <LogView log={log} balance={state?.balance ?? 0} /> : null}
    </div>
  );
}

function LogView({ log, balance }: { log: CsrfLogEntry[]; balance: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <p className="flex items-center justify-between text-xs font-medium text-foreground/75">
        <span>Measured: the server&apos;s log</span>
        <span className="font-mono">Balance: {balance}</span>
      </p>
      <ol className="flex flex-col gap-2 text-xs">
        {[...log].reverse().map((entry) => (
          <li key={entry.n} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <Verdict pass={!entry.applied}>{entry.applied ? "Transfer applied" : "Refused"}</Verdict>
              <span className={cn("rounded px-1.5 py-0.5 font-medium", entry.from === "page" ? "bg-muted text-foreground/70" : cn("bg-destructive/10", DESTRUCTIVE_TEXT))}>
                {entry.from === "other-site" ? "cross-site" : entry.from === "subdomain" ? "forged, cookie rode" : "same site"}
              </span>
            </span>
            <span className="font-mono break-all text-foreground/75">
              origin: {entry.origin ?? "null"} · Sec-Fetch-Site: {entry.fetchSite ?? "—"} · cookie: {entry.cookie ? "sent" : "withheld"}
            </span>
            <span className="text-foreground/85">{entry.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
