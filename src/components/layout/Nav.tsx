import { FileText } from "lucide-react";
import { profile } from "@/content/profile";
import { EVAN_MARK } from "@/lib/evanMark";

// Editorial re-style (feature 002): one centered floating glass pill instead of a
// full-width bar — the "Evan" mark, primary links, and résumé (when present) all
// live inside a single rounded container.
const LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

/** Résumé download — set when a PDF is added to /public. Null → link hidden (no dead control). */
const RESUME_URL: string | null = null;

const linkClass =
  "font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-fg-muted transition-colors duration-200 hover:text-accent sm:text-xs";

export function Nav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4 sm:py-6">
      <nav
        aria-label="Primary"
        className="glass pointer-events-auto flex items-center gap-4 rounded-full px-4 py-2.5 shadow-md sm:gap-6 sm:px-6"
      >
        {/* The Evan wordmark — home */}
        <a
          href="#hero"
          aria-label={`${profile.display} — home`}
          className="shrink-0 transition-opacity duration-200 hover:opacity-80"
        >
          <svg
            viewBox={EVAN_MARK.viewBox}
            aria-hidden
            className="h-7 w-auto sm:h-8"
            style={{ filter: "drop-shadow(0 0 10px rgba(215,242,74,0.25))" }}
          >
            <path
              d={EVAN_MARK.path}
              fill="none"
              stroke={EVAN_MARK.ink}
              strokeWidth={EVAN_MARK.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        {/* Hairline divider */}
        <span aria-hidden className="h-4 w-px bg-line" />

        {/* Primary links */}
        <ul className="flex items-center gap-4 sm:gap-6">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
          {RESUME_URL && (
            <li>
              <a
                href={RESUME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 ${linkClass}`}
              >
                <FileText className="size-3.5" />
                Résumé
              </a>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
