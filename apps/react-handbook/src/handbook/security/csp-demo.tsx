"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/handbook/ui";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";
import { SCRIPT_SRCS, type ScriptSrc } from "@/server/handbook/security/security.schema";

const SCRIPT_LABELS: Record<ScriptSrc, string> = {
  none: "'none' (no scripts)",
  self: "'self' (same-origin files only)",
  nonce: "'nonce-…' (tagged inline + scripts)",
  "unsafe-inline": "'unsafe-inline' (any inline)",
  "strict-dynamic": "'strict-dynamic' + nonce",
};
const SCRIPT_OPTIONS = SCRIPT_SRCS.map((value) => ({ value, label: SCRIPT_LABELS[value] }));

type Probe = { label: string; ran: boolean; why: string };

// What the policy should do to each attempted resource, explained in words.
function explain(script: ScriptSrc, img: boolean) {
  const inlineAllowed = script === "unsafe-inline";
  const noncedAllowed = script === "nonce" || script === "strict-dynamic" || script === "unsafe-inline";
  const externalAllowed = script === "self" || script === "nonce" || script === "strict-dynamic";
  return { inlineAllowed, noncedAllowed, externalAllowed, imgAllowed: img };
}

export function CspDemo() {
  const [script, setScript] = useState<ScriptSrc>("unsafe-inline");
  const [img, setImg] = useState(true);
  const [reportOnly, setReportOnly] = useState(false);
  const [probes, setProbes] = useState<Probe[] | null>(null);
  const [loadedPolicy, setLoadedPolicy] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const policy = `img-src ${img ? "'self' data:" : "'none'"}; script-src ${
    script === "none" ? "'none'" : script === "self" ? "'self'" : script === "nonce" ? "'nonce-…'" : script === "unsafe-inline" ? "'unsafe-inline'" : "'strict-dynamic' 'nonce-…'"
  }`;

  function handleLoad() {
    // The sample page is same-origin, so we read which scripts set their marker.
    const win = frameRef.current?.contentWindow as (Window & { __inline?: number; __nonced?: number; __external?: number }) | null | undefined;
    const doc = frameRef.current?.contentDocument;
    if (!win || !doc) {
      setProbes([{ label: "Sample page", ran: false, why: "The sample page couldn't be read." }]);
      return;
    }
    const expected = explain(script, img);
    const image = doc.querySelector("img");
    const imgLoaded = !!image && image.complete && image.naturalWidth > 0;
    const mode = reportOnly ? " (report-only: reported, not blocked)" : "";
    setProbes([
      { label: "Inline <script>", ran: !!win.__inline, why: expected.inlineAllowed ? "'unsafe-inline' lets any inline script run." : `Blocked by script-src${mode}: no 'unsafe-inline' and no nonce.` },
      { label: "Inline script with a nonce", ran: !!win.__nonced, why: expected.noncedAllowed ? "Its nonce matches the policy." : `Blocked by script-src${mode}: the policy carries no matching nonce.` },
      { label: "External script (same-origin)", ran: !!win.__external, why: expected.externalAllowed ? "Allowed by 'self', its nonce, or strict-dynamic." : `Blocked by script-src${mode}: 'self' isn't allowed and it has no accepted nonce.` },
      { label: "Image", ran: imgLoaded, why: expected.imgAllowed ? "img-src allows data: images." : `Blocked by img-src${mode}: images aren't allowed.` },
    ]);
    setLoadedPolicy(reportOnly ? `${policy} — as report-only` : policy);
  }

  function handleApply() {
    setProbes(null);
    const query = new URLSearchParams({ script, img: img ? "1" : "0", reportOnly: reportOnly ? "1" : "0" });
    // Reassigning src reloads the frame with the new policy header; handleLoad reads the result.
    if (frameRef.current) frameRef.current.src = `/api/handbook/security/csp/page?${query}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="csp-build" className="flex flex-col gap-3 rounded-lg border p-3">
        <h4 id="csp-build" className="text-sm font-medium">
          Build a policy
        </h4>
        <Choice legend="script-src" value={script} options={SCRIPT_OPTIONS} onChange={setScript} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={img} onCheckedChange={setImg} title="img-src allows images" detail="Off blocks the sample image." />
          <Toggle checked={reportOnly} onCheckedChange={setReportOnly} title="Report-only mode" detail="Reports violations without blocking." />
        </div>
        <p className="font-mono text-xs break-all text-foreground/75">
          Content-Security-Policy{reportOnly ? "-Report-Only" : ""}: default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;; {policy}
        </p>
        <div>
          <Button onClick={handleApply}>Serve the sample page with this policy</Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Sample page under the policy" className="flex flex-col gap-2">
          <p className="text-xs font-medium text-foreground/75">The sample page (served with the real header)</p>
          <iframe ref={frameRef} title="Sample page served under the chosen CSP" onLoad={handleLoad} className="h-40 w-full rounded-lg border bg-background" />
        </section>
        <div aria-live="polite" className="flex flex-col gap-2">
          {probes ? (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-foreground/75">Measured: what the browser {reportOnly ? "reported" : "enforced"}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {probes.map((probe) => (
                  <li key={probe.label} className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", probe.ran ? "bg-info/15 text-info" : "bg-muted text-foreground/70")}>{probe.ran ? "ran" : "blocked"}</span>
                      {probe.label}
                    </span>
                    <span className="text-xs text-foreground/80">{probe.why}</span>
                  </li>
                ))}
              </ul>
              {loadedPolicy ? <p className="text-xs text-foreground/75">Under {reportOnly ? "report-only, everything still ran; a real policy would block the same things." : "this policy."}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-foreground/75">Serve the page to see which resources the policy allows.</p>
          )}
        </div>
      </div>
    </div>
  );
}
