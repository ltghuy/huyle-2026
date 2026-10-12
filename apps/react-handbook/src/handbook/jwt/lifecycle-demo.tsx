"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";
import { REVOCATIONS, type Revocation, type SessionLogEntry, type SessionState, type TokenPair } from "@/server/handbook/jwt/jwt.schema";

import { Choice, fetchJson } from "./token-view";

const TTL_OPTIONS = [
  { value: "15", label: "15 s" },
  { value: "30", label: "30 s" },
  { value: "60", label: "60 s" },
] as const;
const LEEWAY_OPTIONS = [
  { value: "0", label: "0 s" },
  { value: "10", label: "10 s" },
  { value: "30", label: "30 s" },
] as const;
const REVOCATION_LABELS: Record<Revocation, string> = { none: "None (pure stateless)", denylist: "Deny-list of token ids", version: "Token version per user" };
const REVOCATION_OPTIONS = REVOCATIONS.map((value) => ({ value, label: REVOCATION_LABELS[value] }));

type Actor = "user" | "attacker";
type Holder = { accessToken: string; refreshToken: string; expiresAt: number };
type Outcome = { ok: boolean; text: string };
type Log = { entries: SessionLogEntry[]; state: SessionState };

const ACTOR_NAMES: Record<SessionLogEntry["actor"], string> = { user: "Alice", attacker: "Mallory", server: "Server" };

const SESSION_URL = "/api/handbook/jwt/session";

function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Ticks while a countdown is shown; re-reads the clock when the tab becomes visible. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}

function Countdown({ expiresAt, leeway }: { expiresAt: number; leeway: number }) {
  const now = useNow();
  const left = Math.ceil((expiresAt - now) / 1000);
  const graceLeft = left + leeway;
  return (
    <p role="timer" aria-live="off" className={cn("font-mono text-sm tabular-nums", left <= 0 && "text-destructive")}>
      {left > 0
        ? `Access token expires in ${left} s`
        : graceLeft > 0
          ? `Expired ${-left} s ago; the ${leeway} s leeway still accepts it for ${graceLeft} s`
          : `Expired ${-left} s ago`}
    </p>
  );
}

function preview(token: string) {
  return `${token.slice(0, 18)}…${token.slice(-6)}`;
}

export function LifecycleDemo() {
  const [ttl, setTtl] = useState<(typeof TTL_OPTIONS)[number]["value"]>("15");
  const [revocation, setRevocation] = useState<Revocation>("none");
  const [leeway, setLeeway] = useState<(typeof LEEWAY_OPTIONS)[number]["value"]>("0");
  const [sid, setSid] = useState<string | null>(null);
  const [holders, setHolders] = useState<Record<Actor, Holder | null>>({ user: null, attacker: null });
  const [outcomes, setOutcomes] = useState<Record<Actor, Outcome | null>>({ user: null, attacker: null });
  const [log, setLog] = useState<Log | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [busy, setBusy] = useState(false);

  async function reloadLog(forSid: string) {
    try {
      setLog(await fetchJson<Log>(`${SESSION_URL}/log?sid=${forSid}`));
    } catch {
      setLog(null);
    }
  }

  function setOutcome(actor: Actor, outcome: Outcome) {
    setOutcomes((current) => ({ ...current, [actor]: outcome }));
  }

  async function handleSignIn() {
    setBusy(true);
    try {
      const pair = await fetchJson<TokenPair>(SESSION_URL, { body: { action: "login", accessTtl: Number(ttl), revocation } });
      setSid(pair.sid);
      setStartedAt(Date.now());
      setHolders({ user: pair, attacker: null });
      setOutcomes({ user: { ok: true, text: "Signed in: the page holds an access token and a refresh token." }, attacker: null });
      await reloadLog(pair.sid);
    } catch (e) {
      setOutcome("user", { ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleCallApi(actor: Actor) {
    const holder = holders[actor];
    if (!sid || !holder) return;
    setBusy(true);
    try {
      await fetchJson(`${SESSION_URL}/api?sid=${sid}&leeway=${leeway}&actor=${actor}`, { headers: { Authorization: `Bearer ${holder.accessToken}` } });
      setOutcome(actor, { ok: true, text: "200 OK: the API accepted the access token." });
    } catch (e) {
      setOutcome(actor, { ok: false, text: `401: ${errorText(e)}` });
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  async function handleRefresh(actor: Actor) {
    const holder = holders[actor];
    if (!sid || !holder) return;
    setBusy(true);
    try {
      const pair = await fetchJson<TokenPair>(SESSION_URL, { body: { action: "refresh", sid, refreshToken: holder.refreshToken, actor } });
      setHolders((current) => ({ ...current, [actor]: pair }));
      setOutcome(actor, { ok: true, text: "New pair issued; the old refresh token is now used up." });
    } catch (e) {
      setOutcome(actor, { ok: false, text: errorText(e) });
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  function handleSteal() {
    setHolders((current) => ({ ...current, attacker: current.user }));
    setOutcome("attacker", { ok: true, text: "Mallory copied both of Alice's tokens (say, through an XSS bug)." });
  }

  async function handleSignOut() {
    if (!sid) return;
    setBusy(true);
    try {
      const { detail } = await fetchJson<{ detail: string }>(SESSION_URL, { body: { action: "logout", sid } });
      setHolders((current) => ({ ...current, user: null }));
      setOutcome("user", { ok: true, text: `Signed out; the page deleted its tokens. ${detail}` });
    } catch (e) {
      setOutcome("user", { ok: false, text: errorText(e) });
    } finally {
      await reloadLog(sid);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="life-settings" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="life-settings" className="text-sm font-medium">
          Server settings
        </h4>
        <div className="grid gap-3 md:grid-cols-3">
          <Choice legend="Access token lifetime" value={ttl} options={TTL_OPTIONS} onChange={setTtl} />
          <Choice legend="Clock-skew leeway (applies at once)" value={leeway} options={LEEWAY_OPTIONS} onChange={setLeeway} />
          <Choice legend="Revoking access tokens early" value={revocation} options={REVOCATION_OPTIONS} onChange={setRevocation} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSignIn} disabled={busy}>
            {sid ? "Sign in again (new session)" : "Sign in as Alice"}
          </Button>
          <span className="text-xs text-foreground/75">Lifetime and revocation apply from the next sign-in.</span>
        </div>
      </section>

      {sid ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <HolderPanel
            title="Alice (the real user)"
            holder={holders.user}
            outcome={outcomes.user}
            leeway={Number(leeway)}
            busy={busy}
            emptyText="Alice is signed out."
            onCallApi={() => handleCallApi("user")}
            onRefresh={() => handleRefresh("user")}
          >
            <Button variant="outline" onClick={handleSignOut} disabled={busy || !holders.user}>
              Sign out
            </Button>
          </HolderPanel>
          <HolderPanel
            title="Mallory (holds a stolen copy)"
            holder={holders.attacker}
            outcome={outcomes.attacker}
            leeway={Number(leeway)}
            busy={busy}
            emptyText="Mallory has nothing yet."
            onCallApi={() => handleCallApi("attacker")}
            onRefresh={() => handleRefresh("attacker")}
          >
            <Button variant="outline" onClick={handleSteal} disabled={busy || !holders.user}>
              Steal Alice&apos;s current tokens
            </Button>
          </HolderPanel>
        </div>
      ) : null}

      {log ? <ServerView log={log} startedAt={startedAt} /> : null}
    </div>
  );
}

function HolderPanel({
  title,
  holder,
  outcome,
  leeway,
  busy,
  emptyText,
  onCallApi,
  onRefresh,
  children,
}: {
  title: string;
  holder: Holder | null;
  outcome: Outcome | null;
  leeway: number;
  busy: boolean;
  emptyText: string;
  onCallApi: () => void;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
      <h4 className="text-sm font-medium">{title}</h4>
      {holder ? (
        <>
          <Countdown expiresAt={holder.expiresAt} leeway={leeway} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-foreground/75">Access (JWT)</dt>
            <dd className="font-mono break-all">{preview(holder.accessToken)}</dd>
            <dt className="text-foreground/75">Refresh (opaque)</dt>
            <dd className="font-mono break-all">{preview(holder.refreshToken)}</dd>
          </dl>
        </>
      ) : (
        <p className="text-sm text-foreground/75">{emptyText}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCallApi} disabled={busy || !holder}>
          Call the API
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={busy || !holder}>
          Refresh
        </Button>
        {children}
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {outcome ? <Verdict pass={outcome.ok}>{outcome.text}</Verdict> : null}
      </div>
    </section>
  );
}

function ServerView({ log, startedAt }: { log: Log; startedAt: number }) {
  const { state } = log;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground/75">Measured: the auth server&apos;s own log</p>
        <ol className="flex flex-col gap-1 text-xs">
          {log.entries.map((entry, i) => (
            <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-x-2">
              <span className="font-mono text-foreground/75 tabular-nums">+{((entry.at - startedAt) / 1000).toFixed(1)} s</span>
              <span className="min-w-0">
                <span className="font-medium">{ACTOR_NAMES[entry.actor]}</span> · {entry.kind} ·{" "}
                <span className={cn("font-medium", entry.ok ? "text-success" : "text-destructive")}>{entry.ok ? "ok" : "refused"}</span>
                <span className="text-foreground/85">: {entry.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-1 rounded-lg border p-3 text-xs">
        <p className="font-medium text-foreground/75">State the server keeps</p>
        <p>Session: {state.revoked ? <span className="font-medium text-destructive">revoked</span> : "active"}</p>
        <p>
          Refresh tokens:{" "}
          {state.refreshTokens.map((t) => (
            <span key={t.id} className="mr-2 font-mono">
              {t.id}:{t.status}
            </span>
          ))}
        </p>
        {state.revocation === "denylist" ? <p>Deny-list: {state.denylist.length} token id(s), each kept until its exp</p> : null}
        {state.revocation === "version" ? <p>Alice&apos;s token version: {state.version}</p> : null}
        {state.revocation === "none" ? <p>Nothing for access tokens: they are trusted until exp.</p> : null}
      </div>
    </div>
  );
}
