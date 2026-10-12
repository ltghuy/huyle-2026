"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";
import { base64UrlEncode, decodeToken } from "@/server/handbook/jwt/jwt-format";
import { ALGS, ROLES, type Alg, type VerifyResult } from "@/server/handbook/jwt/jwt.schema";

import { CheckList, Choice, ClaimsTable, fetchJson, PART_STYLES, TokenText } from "./token-view";

const ALG_OPTIONS = ALGS.map((alg) => ({ value: alg, label: <span className="font-mono">{alg}</span> }));
const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: role }));
const TTL_OPTIONS = [
  { value: "60", label: "1 minute" },
  { value: "3600", label: "1 hour" },
  { value: "-60", label: "Already expired" },
] as const;

/** Signature sizes per algorithm (bytes before base64url). */
const SIG_SIZES: Record<Alg, string> = {
  HS256: "32 bytes: an HMAC-SHA256 with one shared secret. Anyone who can verify can also sign.",
  RS256: "256 bytes with a 2048-bit RSA key. The private key signs; the public key only verifies.",
  ES256: "64 bytes (r and s on curve P-256). Same private/public split as RSA, far smaller.",
};

/** Re-encodes the payload with role "admin" and keeps the original signature. */
function promoteToAdmin(token: string) {
  const decoded = decodeToken(token);
  if (!decoded.payload) return token;
  const [header, , signature] = decoded.parts;
  return `${header}.${base64UrlEncode(JSON.stringify({ ...decoded.payload, role: "admin" }))}.${signature}`;
}

export function AnatomyDemo() {
  const [alg, setAlg] = useState<Alg>("RS256");
  const [sub, setSub] = useState("alice");
  const [role, setRole] = useState<(typeof ROLES)[number]>("reader");
  const [ttl, setTtl] = useState<(typeof TTL_OPTIONS)[number]["value"]>("3600");
  const [token, setToken] = useState("");
  const [issuedAlg, setIssuedAlg] = useState<Alg | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A verification result belongs to the exact text it checked.
  const [verified, setVerified] = useState<{ token: string; result: VerifyResult } | null>(null);

  const decoded = decodeToken(token);
  const result = verified?.token === token ? verified.result : null;
  const subValid = /^[\w.@-]{1,40}$/.test(sub);

  async function handleIssue() {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchJson<{ token: string }>("/api/handbook/jwt/token", { body: { alg, sub, role, ttl: Number(ttl) } });
      setToken(data.token);
      setIssuedAlg(alg);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    const checked = token;
    setBusy(true);
    setError(null);
    try {
      setVerified({ token: checked, result: await fetchJson<VerifyResult>("/api/handbook/jwt/verify", { body: { token: checked.trim() } }) });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="anatomy-issue" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="anatomy-issue" className="text-sm font-medium">
          1. Ask the server for a token
        </h4>
        <div className="grid gap-3 md:grid-cols-2">
          <Choice legend="Algorithm" value={alg} options={ALG_OPTIONS} onChange={setAlg} />
          <Choice legend="Role claim" value={role} options={ROLE_OPTIONS} onChange={setRole} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="anatomy-sub" className="text-xs text-foreground/75">
              Subject (sub)
            </Label>
            <Input id="anatomy-sub" value={sub} maxLength={40} onChange={(e) => setSub(e.target.value)} aria-invalid={!subValid} aria-describedby="anatomy-sub-help" />
            <p id="anatomy-sub-help" className="text-xs text-foreground/75">
              {subValid ? "Letters, digits and . @ - _ (up to 40)." : "Use 1–40 letters, digits or . @ - _"}
            </p>
          </div>
          <Choice legend="Lifetime" value={ttl} options={TTL_OPTIONS} onChange={setTtl} />
        </div>
        <div>
          <Button onClick={handleIssue} disabled={busy || !subValid}>
            {busy ? "Working…" : "Issue token"}
          </Button>
        </div>
      </section>

      <section aria-labelledby="anatomy-read" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="anatomy-read" className="text-sm font-medium">
          2. Read it (decoded here in your browser, no key needed)
        </h4>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anatomy-token" className="text-xs text-foreground/75">
            Token: paste or edit any JWT
          </Label>
          <Textarea
            id="anatomy-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
            rows={4}
            placeholder="eyJhbGciOi…"
            className="font-mono text-xs break-all"
          />
        </div>
        {token.trim() ? <TokenText token={token.trim()} /> : null}
        {decoded.errors.length > 0 && token.trim() ? (
          <ul aria-live="polite" className="flex flex-col gap-1 text-xs text-destructive">
            {decoded.errors.map((e) => (
              <li key={e.part + e.message}>{e.message}</li>
            ))}
          </ul>
        ) : null}
        {decoded.header || decoded.payload ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {decoded.header ? <ClaimsTable title="Header" value={decoded.header} tone={PART_STYLES[0]} /> : null}
            {decoded.payload ? <ClaimsTable title="Payload" value={decoded.payload} tone={PART_STYLES[1]} /> : null}
          </div>
        ) : null}
        {decoded.payload ? (
          <p className="text-xs font-medium">Anyone holding this token can read all of the above: a JWT is signed, not encrypted. Never put secrets in it.</p>
        ) : null}
      </section>

      <section aria-labelledby="anatomy-verify" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="anatomy-verify" className="text-sm font-medium">
          3. Change it, then let the server verify it
        </h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setToken(promoteToAdmin(token))} disabled={!decoded.payload}>
            Make me admin (keep the signature)
          </Button>
          <Button onClick={handleVerify} disabled={busy || !token.trim()}>
            Verify on the server
          </Button>
        </div>
        <div aria-live="polite" className="flex flex-col gap-2">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {result ? (
            <>
              <Verdict pass={result.valid}>{result.valid ? "Valid: the server would accept this token" : "Rejected"}</Verdict>
              <CheckList checks={result.checks} />
            </>
          ) : verified ? (
            <p className="text-xs text-foreground/75">The token changed since the last check; verify again.</p>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-foreground/85">
        <p className="font-medium text-foreground">What is signed (simplified)</p>
        <p className="font-mono break-all">
          signature = sign( <span className={PART_STYLES[0]}>base64url(header)</span> + &quot;.&quot; + <span className={PART_STYLES[1]}>base64url(payload)</span>, key )
        </p>
        <p>
          The signature covers the exact text of the first two parts, so changing one character anywhere in them breaks it. Decoding needs
          no key; only creating a valid signature does.
        </p>
        <ul className="flex flex-col gap-1 pl-4">
          {ALGS.map((a) => (
            <li key={a} className="list-disc">
              <span className="font-mono font-medium text-foreground">{a}</span>: {SIG_SIZES[a]}
              {issuedAlg === a && decoded.signatureBytes !== null ? ` This token's signature: ${decoded.signatureBytes} bytes, ${token.trim().length} characters in all.` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
