"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Choice } from "@/handbook/jwt/token-view";

import { cssModules, scopedNames } from "./css-modules";
import { useFrameReport } from "./frame-report";
import { loadPostcss } from "./postcss-tools";

type Mode = "global" | "modules";

const MODES = [
  { value: "global", label: "Global CSS (import \"./Card.css\")" },
  { value: "modules", label: "CSS Modules (import styles from \"./Card.module.css\")" },
] as const satisfies readonly { value: Mode; label: string }[];

const CARD = `.title {
  color: crimson;
  font-size: 18px;
}

:global(.dark) .title {
  color: pink;
}
`;

const BANNER = `.title {
  color: royalblue;
  font-size: 24px;
  letter-spacing: 0.02em;
}
`;

type Built = { css: string; card: Record<string, string>; banner: Record<string, string> };

function frameDoc(css: string, cardTitle: string, bannerTitle: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Two components</title><style>body{margin:0;padding:16px;font:15px system-ui,sans-serif;background:#fff;color:#111}section{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-bottom:8px}small{color:#555}
${css}</style></head><body>
<section><small>&lt;Card&gt;</small><h2 id="card" class="${cardTitle}">Card title</h2></section>
<section><small>&lt;Banner&gt;</small><h2 id="banner" class="${bannerTitle}">Banner title</h2></section>
<script>
const color = (id) => getComputedStyle(document.getElementById(id)).color;
parent.postMessage({ kind: "css-modules", card: color("card"), banner: color("banner") }, "*");
</script></body></html>`;
}

export function ModulesDemo() {
  const [mode, setMode] = useState<Mode>("global");
  const [card, setCard] = useState(CARD);
  const [banner, setBanner] = useState(BANNER);
  const deferredCard = useDeferredValue(card);
  const deferredBanner = useDeferredValue(banner);
  const [built, setBuilt] = useState<Built | null>(null);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        if (mode === "global") {
          // Both files end up in one stylesheet, in import order; :global() means nothing here, so strip it.
          const css = [deferredCard, deferredBanner].join("\n").replace(/:global\(([^)]*)\)/g, "$1");
          if (current) setBuilt({ css, card: { title: "title" }, banner: { title: "title" } });
          return;
        }
        const postcss = await loadPostcss();
        const outCard: Record<string, string> = {};
        const outBanner: Record<string, string> = {};
        const a = await postcss([cssModules(await scopedNames("components/Card.module.css", deferredCard), outCard)]).process(deferredCard, { from: undefined });
        const b = await postcss([cssModules(await scopedNames("components/Banner.module.css", deferredBanner), outBanner)]).process(deferredBanner, { from: undefined });
        if (current) setBuilt({ css: a.css + "\n" + b.css, card: outCard, banner: outBanner });
      } catch {
        if (current) setBuilt(null);
      }
    })();
    return () => {
      current = false;
    };
  }, [mode, deferredCard, deferredBanner]);

  const key = built ? `${mode}:${built.css}` : "none";
  const { frame, report } = useFrameReport<{ card: string; banner: string }>("css-modules", key);
  const collision = report && report.card === report.banner;

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="How the two files are imported" value={mode} options={MODES} onChange={setMode} />
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="mod-card" className="font-mono text-xs">
            Card{mode === "modules" ? ".module" : ""}.css
          </Label>
          <Textarea id="mod-card" value={card} onChange={(e) => setCard(e.target.value)} spellCheck={false} wrap="off" className="min-h-40 font-mono text-xs" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="mod-banner" className="font-mono text-xs">
            Banner{mode === "modules" ? ".module" : ""}.css
          </Label>
          <Textarea id="mod-banner" value={banner} onChange={(e) => setBanner(e.target.value)} spellCheck={false} wrap="off" className="min-h-40 font-mono text-xs" />
        </div>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          {built ? (
            <iframe key={key} ref={frame} title="Card and Banner rendered" sandbox="allow-scripts" srcDoc={frameDoc(built.css, built.card.title ?? "", built.banner.title ?? "")} className="h-56 w-full rounded-lg border bg-white" />
          ) : (
            <p className="text-sm text-muted-foreground">Building…</p>
          )}
          <p aria-live="polite" className="text-sm">
            {report
              ? collision
                ? `Both titles are ${report.banner}: the two .title rules clash, and the one loaded last wins for both components.`
                : `Card title ${report.card}, Banner title ${report.banner}: each component gets its own rule.`
              : "Rendering…"}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {built && mode === "modules" ? (
            <CodePanel
              title="What each import gives the component"
              code={`// import styles from "./Card.module.css"\nstyles = ${JSON.stringify(built.card, null, 2)};\n\n// import styles from "./Banner.module.css"\nstyles = ${JSON.stringify(built.banner, null, 2)};\n`}
            />
          ) : null}
          {built ? <CodePanel title={mode === "modules" ? "The CSS the bundle ships" : "One global stylesheet"} code={built.css} /> : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The frame is a real browser rendering the CSS; the colors are read back with getComputedStyle. Names are [file]_[class]__[hash], the hash being the first
        characters of the SHA-256 of the file path and class: one common scheme, as tools differ.
      </p>
    </div>
  );
}
