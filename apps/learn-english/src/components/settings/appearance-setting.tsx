"use client";

import { useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACCENTS, DEFAULT_ACCENT, getAccent, isAccent, setAccent, subscribeAccent } from "@/lib/appearance";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo thiết bị", icon: Monitor },
] as const;

const serverAccent = () => DEFAULT_ACCENT;
const noSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** Light/dark mode and main colour for this device (feature 004, AC-001–AC-004). */
export function AppearanceSetting() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored mode after hydration.
  const mounted = useSyncExternalStore(noSubscribe, onClient, onServer);
  const accent = useSyncExternalStore(subscribeAccent, getAccent, serverAccent);

  function handleModeChange(value: string[]) {
    // A toggle group lets the pressed item be un-pressed; keep a mode selected.
    if (value[0]) setTheme(value[0]);
  }

  function handleAccentChange(value: string) {
    if (isAccent(value)) setAccent(value);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label id="mode-label">Chế độ</Label>
        {mounted ? (
          <ToggleGroup
            aria-labelledby="mode-label"
            variant="outline"
            spacing={0}
            value={[theme ?? "system"]}
            onValueChange={handleModeChange}
            className="flex-wrap"
          >
            {MODES.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} className="h-11 gap-2 px-4 aria-pressed:bg-primary/10 aria-pressed:text-foreground">
                <Icon aria-hidden /> {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : (
          <Skeleton className="h-11 w-full max-w-sm" />
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">Màu chính</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map(({ id, label, swatch }) => (
            <label
              key={id}
              className={cn(
                "flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                accent === id && "border-primary bg-primary/10",
              )}
            >
              <input
                type="radio"
                name="accent"
                value={id}
                checked={accent === id}
                onChange={(event) => handleAccentChange(event.target.value)}
                className="sr-only"
              />
              <span className="flex size-5 items-center justify-center rounded-full" style={{ background: swatch }} aria-hidden>
                {accent === id ? <Check className="size-3.5 text-white" strokeWidth={3} /> : null}
              </span>
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
