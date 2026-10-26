"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Toggle, Verdict } from "@/handbook/ui";

import { WrongWay } from "./ui";

type Settings = { zoom: boolean; spacing: boolean; justify: boolean };

// WCAG 1.4.12 text spacing: content must survive these without loss.
const SPACING: React.CSSProperties = { lineHeight: 1.5, letterSpacing: "0.12em", wordSpacing: "0.16em" };

export function TypographyDemo() {
  const [settings, setSettings] = useState<Settings>({ zoom: false, spacing: false, justify: false });

  function handleChange(key: keyof Settings, on: boolean) {
    setSettings((current) => ({ ...current, [key]: on }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Toggle checked={settings.zoom} onCheckedChange={(on) => handleChange("zoom", on)} title="Text at 200%" detail="What browser text zoom or a larger default size does" />
        <Toggle
          checked={settings.spacing}
          onCheckedChange={(on) => handleChange("spacing", on)}
          title="WCAG text spacing"
          detail="Line height 1.5, paragraphs 2×, letters 0.12em, words 0.16em"
        />
        <Toggle
          checked={settings.justify}
          onCheckedChange={(on) => handleChange("justify", on)}
          title="Justify the text"
          detail={settings.justify ? <WrongWay /> : "Uneven gaps (rivers) make lines harder to track"}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card settings={settings} fixed />
        <Card settings={settings} fixed={false} />
      </div>
    </div>
  );
}

function Card({ settings, fixed }: { settings: Settings; fixed: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(0);

  // Measure after every size change of the text, whatever caused it.
  useEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;
    const observer = new ResizeObserver(() => setHidden(Math.max(0, box.scrollHeight - box.clientHeight)));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const style: React.CSSProperties = {
    ...(settings.zoom ? { fontSize: "200%" } : null),
    ...(settings.spacing ? SPACING : null),
    ...(settings.justify ? { textAlign: "justify" } : null),
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {fixed ? (
          <>
            Fixed height, overflow hidden <WrongWay />
          </>
        ) : (
          "Grows with its text (min-height)"
        )}
      </p>
      <div ref={boxRef} className={cn("w-full max-w-80 rounded-lg border p-3", fixed ? "h-40 overflow-hidden" : "min-h-40")}>
        <div ref={contentRef} style={style} className={cn("text-sm", settings.spacing && "[&_p+p]:mt-[2em]")}>
          <h4 className="font-semibold">Weekend baking class</h4>
          <p>Learn to shape and bake a country loaf in three hours, with flour, aprons and coffee included.</p>
          <p>Saturdays at nine. Bring a container to take your bread home.</p>
        </div>
      </div>
      <p aria-live="polite" className="text-sm">
        {hidden > 0 ? (
          <Verdict pass={false}>Text cut off: {hidden} px hidden</Verdict>
        ) : (
          <Verdict pass>All text visible</Verdict>
        )}
      </p>
    </div>
  );
}
