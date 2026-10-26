"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";
import { decodeToken } from "@/server/handbook/jwt/jwt-format";
import { ATTACKS, STRICT, type AttackId, type AttackResult, type VerifyChecks, type VerifyResult } from "@/server/handbook/jwt/jwt.schema";

import { ATTACK_INFO, CHECK_LABELS } from "./attacks";
import { CheckList, Choice, fetchJson, PART_STYLES, TokenText } from "./token-view";

const ATTACK_OPTIONS = ATTACKS.map((id) => ({ value: id, label: ATTACK_INFO[id].title }));
const CHECK_KEYS = Object.keys(CHECK_LABELS) as (keyof VerifyChecks)[];

type Run = { attack: AttackId; checks: VerifyChecks; result: AttackResult };

export function AttacksDemo() {
  const [attack, setAttack] = useState<AttackId>("alg-none");
  const [checks, setChecks] = useState<VerifyChecks>(STRICT);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update the screen (fast switch flips overlap).
  const latest = useRef(0);

  async function runWith(nextAttack: AttackId, nextChecks: VerifyChecks) {
    const id = ++latest.current;
    setBusy(true);
    setError(null);
    try {
      const result = await fetchJson<AttackResult>("/api/handbook/jwt/attack", { body: { attack: nextAttack, checks: nextChecks } });
      if (id === latest.current) setRun({ attack: nextAttack, checks: nextChecks, result });
    } catch (e) {
      if (id === latest.current) setError(String(e instanceof Error ? e.message : e));
    } finally {
      if (id === latest.current) setBusy(false);
    }
  }

  function handleAttackChange(next: AttackId) {
    setAttack(next);
    if (run) void runWith(next, checks);
  }

  function handleCheckChange(key: keyof VerifyChecks, on: boolean) {
    const next = { ...checks, [key]: on };
    setChecks(next);
    // Once a result is on screen, keep it in step with the switches.
    if (run) void runWith(attack, next);
  }

  const info = ATTACK_INFO[attack];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="attack-pick" className="flex flex-col gap-3 rounded-lg border p-3">
          <h4 id="attack-pick" className="text-sm font-medium">
            Mallory&apos;s attack
          </h4>
          <Choice legend="Attack" hideLegend value={attack} options={ATTACK_OPTIONS} onChange={handleAttackChange} />
          <p className="text-xs text-foreground/85">{info.story}</p>
        </section>
        <section aria-labelledby="attack-checks" className="flex flex-col gap-2 rounded-lg border p-3">
          <h4 id="attack-checks" className="text-sm font-medium">
            The strict verifier&apos;s checks
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHECK_KEYS.map((key) => (
              <Toggle
                key={key}
                checked={checks[key]}
                onCheckedChange={(on) => handleCheckChange(key, on)}
                title={CHECK_LABELS[key].title}
                detail={CHECK_LABELS[key].detail}
              />
            ))}
          </div>
          <p className="text-xs text-foreground/75">The naive verifier has every check off: it only verifies a signature, with whatever algorithm and key the token asks for.</p>
        </section>
      </div>
      <div>
        <Button onClick={() => runWith(attack, checks)} disabled={busy}>
          {busy ? "Running…" : "Forge the token and send it"}
        </Button>
      </div>
      <div aria-live="polite" className="flex flex-col gap-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {run ? <RunView run={run} /> : null}
      </div>
    </div>
  );
}

function RunView({ run }: { run: Run }) {
  const info = ATTACK_INFO[run.attack];
  const header = decodeToken(run.result.token).header;
  const naiveFell = run.result.naive.valid;
  return (
    <>
      <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
        <p className="text-xs font-medium text-foreground/75">The forged token (built for real by the server)</p>
        <TokenText token={run.result.token} />
        {header ? (
          <p className="font-mono text-xs break-all">
            <span className={cn("font-sans font-medium", PART_STYLES[0])}>header </span>
            {JSON.stringify(header)}
          </p>
        ) : null}
        {run.attack === "key-confusion" ? (
          <details className="text-xs">
            <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">The public key Mallory used as the HMAC secret</summary>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted/60 p-2 font-mono text-[0.6875rem]">{run.result.publicKeyPem}</pre>
          </details>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <VerifierCard title="Naive verifier" result={run.result.naive} />
        <VerifierCard title="Strict verifier (your checks)" result={run.result.strict} />
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm text-foreground/85">
        {naiveFell ? (
          <p>
            <span className="font-medium text-foreground">The mistake: </span>
            {info.mistake}
          </p>
        ) : null}
        <p>
          <span className="font-medium text-foreground">The rule: </span>
          {info.rule}
        </p>
        <p className="text-xs">
          {run.result.strict.valid
            ? run.checks[info.blockedBy]
              ? "The strict verifier accepted it anyway."
              : `With "${CHECK_LABELS[info.blockedBy].title}" off, the strict verifier falls for it too: that is the one check that stops this attack.`
            : `Stopped by "${CHECK_LABELS[info.blockedBy].title}". Turn just that switch off to see it get through.`}
        </p>
      </div>
    </>
  );
}

function VerifierCard({ title, result }: { title: string; result: VerifyResult }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <Verdict pass={!result.valid}>{result.valid ? "Accepted: the API lets Mallory in" : "Rejected: attack stopped"}</Verdict>
      <CheckList checks={result.checks} />
    </div>
  );
}
