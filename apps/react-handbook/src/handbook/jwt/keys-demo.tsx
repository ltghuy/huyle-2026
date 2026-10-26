"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";
import type { RingKey, RingView, VerifyResult } from "@/server/handbook/jwt/jwt.schema";

import { fetchJson, newRun } from "./token-view";

const KEYS_URL = "/api/handbook/jwt/keys";

type Held = { token: string; kid: string };
type Outcome = { ok: boolean; text: string };

const STATUS_LABEL: Record<RingKey["status"], string> = { signing: "signing (active)", published: "published", retired: "retired" };
const STATUS_STYLE: Record<RingKey["status"], string> = {
  signing: "border-primary/40 bg-primary/5",
  published: "border-border",
  retired: "border-dashed text-foreground/60",
};

export function KeysDemo() {
  const runRef = useRef(newRun("keys"));
  const [ring, setRing] = useState<RingView | null>(null);
  const [held, setHeld] = useState<Held[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJson<RingView>(`${KEYS_URL}?run=${runRef.current}`).then(setRing).catch(() => setOutcome({ ok: false, text: "Couldn't load the key set." }));
  }, []);

  async function act(body: Record<string, unknown>, after: (data: unknown) => void) {
    setBusy(true);
    try {
      after(await fetchJson(KEYS_URL, { body: { run: runRef.current, ...body } }));
    } catch (e) {
      setOutcome({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  function handleSign() {
    void act({ action: "sign" }, (data) => {
      const { token, kid } = data as Held;
      setHeld((current) => [{ token, kid }, ...current].slice(0, 4));
      setOutcome({ ok: true, text: `Signed a token with the current key, ${kid}.` });
    });
  }

  function handleVerify(token: string) {
    void act({ action: "verify", token }, (data) => {
      const result = data as VerifyResult;
      const keyCheck = result.checks.find((c) => c.id === "key");
      setOutcome({ ok: result.valid, text: result.valid ? "Verified: its key id is still in the published set." : `Rejected: ${keyCheck?.detail ?? result.failedAt}` });
    });
  }

  const ringAction = (body: Record<string, unknown>) => act(body, (data) => setRing(data as RingView));

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="jwks" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="jwks" className="text-sm font-medium">
          The published key set (JWKS)
        </h4>
        <p className="text-xs text-foreground/75">Only public keys, each with a key id (kid) and algorithm. The private keys never leave the server.</p>
        <ul className="flex flex-col gap-2">
          {ring?.keys.map((key) => (
            <li key={key.kid} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2 text-xs", STATUS_STYLE[key.status])}>
              <span className="font-mono font-medium">{key.kid}</span>
              <span className="font-medium">{STATUS_LABEL[key.status]}</span>
              {key.status === "published" ? (
                <span className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => ringAction({ action: "promote", kid: key.kid })} disabled={busy}>
                    Make signing key
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => ringAction({ action: "retire", kid: key.kid })} disabled={busy}>
                    Retire
                  </Button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" onClick={() => ringAction({ action: "add" })} disabled={busy}>
            Add a new key (published, not yet signing)
          </Button>
        </div>
      </section>

      <section aria-labelledby="ring-tokens" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="ring-tokens" className="text-sm font-medium">
          Sign and verify across a rotation
        </h4>
        <p className="text-xs text-foreground/75">
          Sign a token, make a new key the signing key, then retire the old one. Each token names the key that signed it by kid, so old tokens keep verifying until their key is retired.
        </p>
        <div>
          <Button onClick={handleSign} disabled={busy || !ring}>
            Sign a token with the current key
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {held.map((item) => (
            <li key={item.token} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2 text-xs">
              <span className="font-mono">signed by {item.kid}</span>
              <span className="font-mono break-all text-foreground/75">{item.token.slice(0, 20)}…</span>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleVerify(item.token)} disabled={busy}>
                Verify now
              </Button>
            </li>
          ))}
        </ul>
        <div aria-live="polite" className="min-h-5 text-sm">
          {outcome ? <Verdict pass={outcome.ok}>{outcome.text}</Verdict> : null}
        </div>
      </section>
    </div>
  );
}
