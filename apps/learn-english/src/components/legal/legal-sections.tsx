import type { ReactNode } from "react";
import Link from "next/link";

export type LegalSection = {
  title: string;
  /** Paragraphs, in order. Static content, so the index is a stable key. */
  body: ReactNode[];
  /** An optional bullet list after the paragraphs. */
  list?: ReactNode[];
};

/** A link styled like the others on the legal pages. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-link underline underline-offset-4">
      {children}
    </Link>
  );
}

/** The numbered cards of `/privacy` and `/terms` (feature 029), after a last-updated line. */
export function LegalSections({ updated, note, sections }: { updated: string; note: string; sections: LegalSection[] }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Cập nhật lần cuối: {updated}. {note}
      </p>
      {sections.map((section, index) => (
        <section key={section.title} className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">
            {index + 1}. {section.title}
          </h2>
          {section.body.map((text, i) => (
            <p key={i} className="mt-2 text-sm text-muted-foreground">
              {text}
            </p>
          ))}
          {section.list ? (
            <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground">
              {section.list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}
