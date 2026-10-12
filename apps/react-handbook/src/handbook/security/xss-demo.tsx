"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle, Verdict } from "@/handbook/ui";
import { Choice } from "@/handbook/jwt/token-view";
import { escapeAttr, escapeHtml, safeHref, SINKS, XSS_PRESETS, type XssSink } from "./encoding";

// A tiny app in an opaque-origin sandbox (no allow-same-origin): it renders the
// learner's value through the chosen sink and tells the parent whether the
// payload ran. report() stands in for what an attacker's code would do; it
// never uses alert(), and it cannot read the handbook page.
const SANDBOX_APP = `<!doctype html><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body { font: 13px/1.5 system-ui, sans-serif; margin: 0; padding: 12px; }
  #out { min-height: 2.5rem; padding: 8px; border: 1px dashed #8884; border-radius: 8px; }
  #marker { margin-top: 8px; padding: 6px 8px; border-radius: 6px; background: #d22; color: #fff; font-weight: 600; }
  [hidden] { display: none; }
  a { color: inherit; }
</style>
<div id="out"></div>
<div id="marker" hidden></div>
<script>
  let ran = [];
  function report(where) {
    ran.push(where);
    var m = document.getElementById("marker");
    m.hidden = false;
    m.textContent = "\\u26A0 attacker code ran: " + ran.join(", ");
    parent.postMessage({ type: "xss-ran", where: where }, "*");
  }
  window.report = report;
  addEventListener("message", function (event) {
    var d = event.data || {};
    if (d.ping) { parent.postMessage({ ready: true }, "*"); return; }
    if (d.type !== "render") return;
    ran = [];
    var out = document.getElementById("out");
    document.getElementById("marker").hidden = true;
    out.innerHTML = "";
    try {
      if (d.sink === "html") out.innerHTML = d.value;
      else if (d.sink === "text") out.textContent = d.value;
      else if (d.sink === "attr") out.innerHTML = '<span title="' + d.value + '">hover this text</span>';
      else if (d.sink === "href") {
        var a = document.createElement("a");
        a.setAttribute("href", d.value);
        a.textContent = "a link the user might click";
        out.appendChild(a);
        a.click();
      }
    } catch (err) {}
    var href = out.querySelector("a") ? out.querySelector("a").getAttribute("href") : null;
    setTimeout(function () {
      parent.postMessage({ type: "xss-result", sink: d.sink, ran: ran.slice(), href: href }, "*");
    }, 80);
  });
  parent.postMessage({ ready: true }, "*");
</script>`;

function encodeValue(sink: XssSink, payload: string, encode: boolean): string {
  if (!encode) return payload;
  if (sink === "html") return escapeHtml(payload);
  if (sink === "attr") return escapeAttr(payload);
  if (sink === "href") return safeHref(payload);
  return payload; // text sink is already inert
}

type Result = { sink: XssSink; executed: boolean; where: string[]; href: string | null; encoded: boolean };

export function XssDemo() {
  const [sink, setSink] = useState<XssSink>("html");
  const [payload, setPayload] = useState(XSS_PRESETS[0].payload);
  const [encode, setEncode] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [ready, setReady] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const run = useRef<{ encoded: boolean } | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { ready?: boolean; type?: string; sink?: XssSink; ran?: string[]; href?: string | null };
      if (data.ready) setReady(true);
      if (data.type === "xss-result" && run.current) {
        setResult({ sink: data.sink!, executed: (data.ran ?? []).length > 0, where: data.ran ?? [], href: data.href ?? null, encoded: run.current.encoded });
      }
    }
    addEventListener("message", handleMessage);
    frameRef.current?.contentWindow?.postMessage({ ping: true }, "*");
    return () => removeEventListener("message", handleMessage);
  }, []);

  function handleRender() {
    run.current = { encoded: encode };
    setResult(null);
    frameRef.current?.contentWindow?.postMessage({ type: "render", sink, value: encodeValue(sink, payload, encode) }, "*");
  }

  const sinkInfo = SINKS.find((s) => s.value === sink)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="xss-input" className="flex flex-col gap-3 rounded-lg border p-3">
          <h4 id="xss-input" className="text-sm font-medium">
            The attacker&apos;s input
          </h4>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="xss-payload" className="text-xs text-foreground/75">
              Payload (a stored comment, a URL parameter…)
            </Label>
            <Textarea id="xss-payload" value={payload} onChange={(e) => setPayload(e.target.value)} spellCheck={false} rows={3} className="font-mono text-xs" />
          </div>
          <div className="flex flex-wrap gap-2">
            {XSS_PRESETS.map((preset) => (
              <Button key={preset.label} size="sm" variant="outline" onClick={() => setPayload(preset.payload)}>
                {preset.label}
              </Button>
            ))}
          </div>
        </section>
        <section aria-labelledby="xss-sink" className="flex flex-col gap-3 rounded-lg border p-3">
          <h4 id="xss-sink" className="text-sm font-medium">
            How the app renders it
          </h4>
          <Choice legend="Sink" hideLegend value={sink} options={SINKS.map((s) => ({ value: s.value, label: s.label }))} onChange={setSink} />
          <p className="text-xs text-foreground/85">{sinkInfo.context}</p>
          <Toggle
            checked={encode}
            onCheckedChange={setEncode}
            title="Encode for this context (what a framework does)"
            detail={sink === "text" ? "Text nodes are already safe." : sink === "href" ? "Reject non-http(s) schemes." : sink === "attr" ? "Attribute-encode the value." : "HTML-escape the value."}
          />
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleRender} disabled={!ready}>
          {ready ? "Render in the sandbox" : "Preparing…"}
        </Button>
        <span className="text-xs text-foreground/75">Runs only inside the sandbox below (its own opaque origin); it can&apos;t touch this page.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Sandboxed app" className="flex flex-col gap-2">
          <p className="text-xs font-medium text-foreground/75">The sandboxed app (opaque origin)</p>
          <iframe ref={frameRef} title="Sandboxed app rendering the payload" sandbox="allow-scripts" srcDoc={SANDBOX_APP} className="h-40 w-full rounded-lg border bg-background" />
        </section>
        <div aria-live="polite" className="flex flex-col gap-2">
          {result ? <ResultView result={result} /> : <p className="text-sm text-foreground/75">Render a payload to see whether it executed.</p>}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: Result }) {
  const dangerousHref = result.sink === "href" && !!result.href && /^\s*javascript:/i.test(result.href);
  const safe = !result.executed && !dangerousHref;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <Verdict pass={safe}>{safe ? "Safe: the payload stayed inert" : "Vulnerable: the payload could run as code"}</Verdict>
      {result.executed ? <p className="text-foreground/85">It executed here: {result.where.join(", ")}.</p> : null}
      {dangerousHref ? <p className="text-foreground/85">The link&apos;s href is a <code className="font-mono">javascript:</code> URL; clicking it runs script.</p> : null}
      {result.href ? <p className="font-mono text-xs break-all text-foreground/75">href = {result.href}</p> : null}
      <p className="text-xs text-foreground/85">
        {result.encoded
          ? "Encoded for this context: the value is treated as data, not markup."
          : result.sink === "text"
            ? "A text node renders markup as characters, so nothing executes even unencoded."
            : result.sink === "html" && !result.executed
              ? "innerHTML doesn't run <script> tags inserted this way — but it does run event handlers like onerror, so an <img onerror> payload works."
              : "The value was inserted without encoding, so the browser parsed the attacker's markup."}
      </p>
    </div>
  );
}
