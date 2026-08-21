import { ArrowUp } from "lucide-react";
import { profile } from "@/content/profile";

export function Footer() {
  const year = 2026;

  return (
    <footer className="relative overflow-hidden border-t border-line px-6 pb-12 pt-16 sm:px-12 lg:px-20">
      {/* Faint accent hairline riding the top edge — ties the footer to the brand. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
      />

      <div className="mx-auto max-w-6xl">
        {/* Meta line — the nav pill already handles wayfinding, so no link list here. */}
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-fg-muted">{profile.title}</p>
          <p className="text-fg-subtle">{profile.location}</p>
        </div>

        {/* Oversized signature (doubles as "back home") balanced by a short
            personality line, so the mark isn't marooned in empty space. */}
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <a
            href="#hero"
            aria-label={`${profile.display} — back to top`}
            className="display block leading-[0.85] tracking-tight text-fg transition-colors duration-200 hover:text-accent text-[clamp(2.5rem,8vw,6rem)]"
          >
            {profile.display}
          </a>
          <p className="line-clamp-2 max-w-md text-sm text-fg-muted md:mb-2 md:text-right">
            Shipping fast, accessible web things since 2021 — fueled by coffee,
            supervised by one very judgmental cat.
          </p>
        </div>

        {/* Colophon bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row">
          <p className="text-sm text-fg-subtle">
            Designed, built &amp; slightly over-thought · {year}
          </p>

          <a
            href="#hero"
            className="group inline-flex items-center gap-2 text-sm text-fg-muted transition-colors duration-200 hover:text-accent"
          >
            Back to top
            <ArrowUp
              aria-hidden
              className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
