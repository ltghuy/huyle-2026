"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "themechange";
const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };
const ICON = { light: Sun, dark: Moon, system: Monitor };

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const osDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark" || (theme === "system" && osDark));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function saveTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode, disabled): the choice lasts for this page.
  }
}

function subscribe(onChange: () => void) {
  // Keep other tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    const value = event.newValue;
    applyTheme(value === "light" || value === "dark" ? value : "system");
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  const next = NEXT[theme];
  const Icon = ICON[theme];

  // Read the live value, not the rendered one: rapid clicks can land before
  // React re-renders.
  function handleClick() {
    const target = NEXT[readTheme()];
    saveTheme(target);
    applyTheme(target);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 md:size-9"
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}`}
      title={`Theme: ${LABEL[theme]} (click for ${LABEL[next]})`}
      onClick={handleClick}
    >
      <Icon aria-hidden />
    </Button>
  );
}
