/**
 * Static, self-contained hero fallback (no WebGL / reduced-motion / mobile).
 * Purely decorative CSS — never references an external image, so it can never
 * show a broken asset. If a rendered poster WebP is added later, swap it in here.
 */
export function HeroPoster() {
  return (
    <div aria-hidden className="relative h-full w-full overflow-hidden">
      <div className="glow-blob left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 opacity-80" />
      <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20" />
      <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" />
    </div>
  );
}
