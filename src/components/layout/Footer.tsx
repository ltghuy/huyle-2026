import { ArrowUp } from "lucide-react";
import { profile } from "@/content/profile";

export function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-line px-6 py-12 sm:px-12 lg:px-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="text-sm text-fg-subtle">
          Designed, built &amp; slightly over-thought by{" "}
          <span className="text-fg-muted">{profile.display}</span> · {year}
        </p>

        <a
          href="#hero"
          className="group inline-flex items-center gap-2 text-sm text-fg-muted transition-colors duration-200 hover:text-accent"
        >
          Back to top
          <ArrowUp className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </footer>
  );
}
