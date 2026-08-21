"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { MagneticLink } from "@/components/motion/MagneticLink";

/**
 * The contact section's primary action: a magnetic `mailto:` pill paired with a
 * copy-to-clipboard button. The pill is the reliable fallback everywhere; the
 * copy button is progressive (guarded — some browsers block the Clipboard API),
 * flipping to a "Copied" confirmation for a couple of seconds.
 */
export function EmailActions({ href, value }: { href: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API unavailable/denied — the mailto pill is the fallback. */
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <MagneticLink
        href={href}
        strength={0.3}
        className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-4 text-lg font-medium text-on-accent shadow-glow-accent transition-colors duration-200 hover:bg-accent-bright"
      >
        <Mail className="size-5" aria-hidden />
        {value}
      </MagneticLink>

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Email address copied" : "Copy email address"}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-5 py-4 text-sm font-medium text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
      >
        {copied ? (
          <Check className="size-4 text-accent" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
