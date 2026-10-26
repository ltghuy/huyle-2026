"use client";

import { ArrowUp } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { useContent } from "@/lib/i18n/useContent.client";
import { LanguageSwitcher } from "./LanguageSwitcher.client";

export function Footer() {
  const { t } = useLocale();
  const { profile } = useContent();
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
            aria-label={`${profile.display} — ${t.footer.backToTopSuffix}`}
            className="display block leading-[0.85] tracking-tight text-fg transition-colors duration-200 hover:text-accent text-[clamp(2.5rem,8vw,6rem)]"
          >
            {profile.display}
          </a>
          <p className="line-clamp-2 max-w-md text-sm text-fg-muted md:mb-2 md:text-right">
            {t.footer.personality}
          </p>
        </div>

        {/* Colophon bar — copyright/credit (left) balanced by the language
            switcher + back-to-top (right). */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row">
          {/* Full legal name in the colophon: always-visible on-page text so
              the site ranks for "Le Tran Gia Huy" searches, not just "Huy Le". */}
          <p className="text-sm text-fg-subtle">
            © {year} {profile.name} · {t.footer.colophon}
          </p>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            <a
              href="#hero"
              className="group inline-flex items-center gap-2 text-sm text-fg-muted transition-colors duration-200 hover:text-accent"
            >
              {t.footer.backToTop}
              <ArrowUp
                aria-hidden
                className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
