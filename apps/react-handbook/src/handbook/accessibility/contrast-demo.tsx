"use client";

import { CircleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Toggle, Verdict } from "@/handbook/ui";

import { contrastRatio, formatRatio, LEVELS } from "./contrast";
import { WrongWay } from "./ui";

const PRESETS = [
  { label: "Light gray on white", fg: "#949494", bg: "#ffffff" },
  { label: "Just enough", fg: "#767676", bg: "#ffffff" },
  { label: "Gray on dark", fg: "#6b6b6b", bg: "#262626" },
  { label: "Blue on white", fg: "#2563eb", bg: "#ffffff" },
  { label: "Dark mode text", fg: "#e5e5e5", bg: "#171717" },
];

// The colors below are the demo's data, so they are raw values. The two
// borders have the same lightness: only their hue tells them apart.
const VALID_BORDER = "#3d8f3d";
const ERROR_BORDER = "#f05a5a";

export function ContrastDemo() {
  const [fg, setFg] = useState("#767676");
  const [bg, setBg] = useState("#ffffff");
  const [grayscale, setGrayscale] = useState(false);
  const ratio = contrastRatio(fg, bg);

  function handlePreset(preset: (typeof PRESETS)[number]) {
    setFg(preset.fg);
    setBg(preset.bg);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <ColorField id="contrast-fg" label="Text color" value={fg} onChange={setFg} />
          <ColorField id="contrast-bg" label="Background" value={bg} onChange={setBg} />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <PresetButton key={preset.label} {...preset} active={preset.fg === fg && preset.bg === bg} onPick={() => handlePreset(preset)} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border p-4" style={{ color: fg, backgroundColor: bg }}>
            <p className="text-sm">Normal text: our bakery opens at seven every morning.</p>
            <p className="text-2xl">Large text: fresh bread</p>
          </div>
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="text-sm">
              Contrast ratio <span className="font-mono text-lg font-semibold tabular-nums">{formatRatio(ratio)}</span>
              {ratio < 4.5 ? (
                <span className="ml-2">
                  <WrongWay />
                </span>
              ) : null}
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {LEVELS.map((level) => (
                <li key={level.id} className="flex flex-wrap items-center justify-between gap-x-3 border-b pb-1 last:border-0">
                  <span>
                    {level.label} <span className="font-mono text-xs text-foreground/75">≥ {level.min}:1</span>
                  </span>
                  <Verdict pass={ratio >= level.min} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <h4 className="text-sm font-medium">Color alone</h4>
        <div className="max-w-xs">
          <Toggle checked={grayscale} onCheckedChange={setGrayscale} title="View in grayscale" detail="About how the sample looks without color vision" />
        </div>
        <div className={cn("grid gap-4 sm:grid-cols-2", grayscale && "grayscale")}>
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
              Error shown by color only <WrongWay />
            </p>
            <SampleField label="Name" value="Ada" border={VALID_BORDER} />
            <SampleField label="Email" value="ada@" border={ERROR_BORDER} />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-xs font-medium">Error shown with an icon and text</p>
            <SampleField label="Name" value="Ada" border={VALID_BORDER} />
            <SampleField label="Email" value="ada@" border={ERROR_BORDER} error="Enter a full email address, like ada@example.com." />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <span className="flex items-center gap-2">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border bg-transparent" />
        <span className="font-mono text-xs">{value}</span>
      </span>
    </div>
  );
}

function PresetButton({
  label,
  fg,
  bg,
  active,
  onPick,
}: {
  label: string;
  fg: string;
  bg: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" aria-pressed={active} onClick={onPick}>
      <span aria-hidden className="size-3 rounded-full border" style={{ background: `linear-gradient(135deg, ${fg} 50%, ${bg} 50%)` }} />
      {label}
    </Button>
  );
}

function SampleField({ label, value, border, error }: { label: string; value: string; border: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-foreground/75">{label}</span>
      <span className="rounded-md border-2 px-2 py-1 font-mono text-xs" style={{ borderColor: border }}>
        {value}
      </span>
      {error ? (
        <span className="flex items-start gap-1 text-xs text-destructive">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
