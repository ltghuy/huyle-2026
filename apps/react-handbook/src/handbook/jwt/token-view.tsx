"use client";

import { Check, Minus, X } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";
import { FIELD_NOTES, formatClaimTime, TIME_CLAIMS } from "@/server/handbook/jwt/jwt-format";
import type { CheckId, CheckResult } from "@/server/handbook/jwt/jwt.schema";

// Pieces shared by the JWT demos: the coloured token, a claims table, the
// verifier's checks, small radio groups and a JSON fetch helper.

export const PART_STYLES = ["text-info", "text-success", "text-foreground/75"] as const;
const PART_NAMES = ["header", "payload", "signature"] as const;

export function newRun(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** POST or GET JSON; resolves to `data`, throws the API's error message. */
export async function fetchJson<T>(url: string, init?: { method?: string; body?: unknown; headers?: Record<string, string>; credentials?: RequestCredentials }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
    headers: { ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }), ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: init?.credentials,
  });
  const json = (await response.json().catch(() => ({}))) as { data?: T; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data as T;
}

/** The compact token with its three parts coloured, plus a legend in words. */
export function TokenText({ token, className }: { token: string; className?: string }) {
  const parts = token.split(".");
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <p className="font-mono text-xs leading-relaxed break-all">
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 ? <span className="font-bold text-foreground">.</span> : null}
            <span className={PART_STYLES[Math.min(i, 2)]}>{part || (i === 2 ? "(empty)" : "")}</span>
          </span>
        ))}
      </p>
      {parts.length === 3 ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {PART_NAMES.map((name, i) => (
            <span key={name} className={cn("inline-flex items-center gap-1.5 font-medium", PART_STYLES[i])}>
              <span aria-hidden className="size-2 rounded-full bg-current" />
              {name} ({parts[i].length} chars)
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

function formatValue(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

/** Each field of a decoded header or payload, with what it means. */
export function ClaimsTable({ title, value, tone }: { title: string; value: Record<string, unknown>; tone: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className={cn("text-xs font-medium", tone)}>{title}</p>
      <dl className="flex flex-col divide-y rounded-lg border text-xs">
        {Object.entries(value).map(([key, v]) => (
          <div key={key} className="grid gap-x-3 gap-y-0.5 p-2 sm:grid-cols-[6rem_1fr]">
            <dt className="font-mono font-medium">{key}</dt>
            <dd className="flex min-w-0 flex-col gap-0.5">
              <span className="font-mono break-all">
                {formatValue(v)}
                {TIME_CLAIMS.has(key) && typeof v === "number" ? <span className="text-foreground/75"> = {formatClaimTime(v)}</span> : null}
              </span>
              {FIELD_NOTES[key] ? <span className="text-foreground/75">{FIELD_NOTES[key]}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const CHECK_NAMES: Record<CheckId, string> = {
  format: "Format",
  alg: "Algorithm",
  key: "Key",
  signature: "Signature",
  exp: "Expiry (exp)",
  nbf: "Not before (nbf)",
  iss: "Issuer (iss)",
  aud: "Audience (aud)",
  session: "Revocation",
};

/** The verifier's checks in order, each with an icon and a status word. */
export function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <ol className="flex flex-col gap-1.5 text-xs">
      {checks.map((check) => (
        <li key={check.id} className="grid grid-cols-[1rem_1fr] gap-x-2">
          {check.status === "pass" ? (
            <Check aria-hidden className="mt-px size-4 text-success" />
          ) : check.status === "fail" ? (
            <X aria-hidden className="mt-px size-4 text-destructive" />
          ) : (
            <Minus aria-hidden className="mt-px size-4 text-foreground/60" />
          )}
          <span className="min-w-0">
            <span className="font-medium">{CHECK_NAMES[check.id]}</span>{" "}
            <span className={cn("font-medium", check.status === "fail" && "text-destructive", check.status === "pass" && "text-success")}>
              {check.status === "pass" ? "passed" : check.status === "fail" ? "failed" : "skipped"}
            </span>
            <span className="text-foreground/80">: {check.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A row of native radio buttons with a visible or hidden legend. */
export function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
  hideLegend,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className={cn("mb-1.5 text-xs font-medium text-foreground/75", hideLegend && "sr-only")}>{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-6 items-center gap-2 text-sm">
            <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} className="size-4 accent-primary" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
