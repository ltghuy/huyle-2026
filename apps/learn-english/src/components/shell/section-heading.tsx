/** A section's eyebrow, `h2` and optional line of text, as on the home and profile pages (feature 019). */
export function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
