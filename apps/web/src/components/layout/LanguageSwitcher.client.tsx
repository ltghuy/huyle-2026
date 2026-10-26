"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

/** Switcher-local microcopy (kept here so the control is self-contained). */
const UI: Record<Locale, { trigger: string; menu: string }> = {
  en: { trigger: "Change language", menu: "Select language" },
  vi: { trigger: "Đổi ngôn ngữ", menu: "Chọn ngôn ngữ" },
};

/**
 * Footer language switcher — a glass dropdown (listbox pattern) for EN / VI.
 *
 * Custom (not a native <select>) to match the glass aesthetic, but built to the
 * ARIA listbox contract: the trigger owns `aria-haspopup`/`aria-expanded`, the
 * list is `role="listbox"` with `role="option"` + `aria-selected` rows, and it's
 * fully keyboard-driven (Arrow/Home/End/Enter/Escape, Tab/click-outside close,
 * focus returns to the trigger). Open/close motion is CSS-transition based, so
 * the global reduced-motion rule neutralizes it.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();

  const ui = UI[locale];
  const currentIdx = Math.max(0, LOCALES.indexOf(locale));

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    setActiveIdx(currentIdx);
    setOpen(true);
  }, [currentIdx]);

  const choose = useCallback(
    (next: Locale) => {
      setLocale(next);
      close();
    },
    [setLocale, close],
  );

  // Move focus to the active option whenever the menu opens or moves.
  useEffect(() => {
    if (open) optionRefs.current[activeIdx]?.focus();
  }, [open, activeIdx]);

  // Close on outside pointer / focus leaving the control.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(LOCALES.length - 1);
      setOpen(true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % LOCALES.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + LOCALES.length) % LOCALES.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIdx(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIdx(LOCALES.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(LOCALES[activeIdx]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-label={ui.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className="glass inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors duration-200 hover:text-accent focus-visible:text-accent"
      >
        <Languages aria-hidden className="size-4 shrink-0 text-accent" />
        <span className="font-mono uppercase tracking-[0.14em]">
          {LOCALE_LABELS[locale].short}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 8"
          className={`size-2.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M1 1.5 6 6.5 11 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Popover — mounted only while open; grows from the trigger's lower edge.
          Opens UPWARD (footer sits at the page bottom). */}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ui.menu}
          aria-activedescendant={`${listboxId}-${activeIdx}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="glass absolute bottom-full left-0 z-50 mb-2 min-w-[11rem] origin-bottom overflow-hidden rounded-2xl p-1.5 shadow-lg motion-safe:animate-[langpop_180ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          {LOCALES.map((code, i) => {
            const selected = code === locale;
            return (
              <li key={code} role="none">
                <button
                  ref={(node) => {
                    optionRefs.current[i] = node;
                  }}
                  id={`${listboxId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => choose(code)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 focus:outline-none ${
                    i === activeIdx
                      ? "bg-accent/12 text-fg"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                      {LOCALE_LABELS[code].short}
                    </span>
                    <span>{LOCALE_LABELS[code].name}</span>
                  </span>
                  {selected && (
                    <Check aria-hidden className="size-4 shrink-0 text-accent" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
