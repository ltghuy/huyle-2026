import Image from "next/image";

/**
 * Interim hero centerpiece — a studio portrait of Huy on a deep-red block,
 * composed to overlap the oversized wordmark "spine" (à la the majd reference,
 * whose red-backed portrait threads through the display type). The red block
 * pops against the dark-green ground; a faint lime rim ties it to the palette.
 * Decorative (`alt=""`): the h1 already carries the name.
 *
 * The tilt lives on an INNER card, not on `[data-hero-portrait]` itself:
 * `ScrollPortrait` measures that element's `getBoundingClientRect()` to size and
 * centre its flying clone, so the measured box must stay axis-aligned. The inner
 * card carries the resting 15° tilt and is free to overflow the (unclipped) box.
 */
export function HeroPortrait({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        data-hero-portrait
        className="relative aspect-[700/959] w-[clamp(12rem,32vw,14rem)] lg:w-[clamp(9rem,17vw,14rem)]"
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-accent/15 shadow-lg rotate-[15deg]">
          <Image
            src="/assets/evan.png"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 50vw, 224px"
            className="object-cover"
          />
          {/* Inset lime rim so the red block reads as part of the dark-green system */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/10"
          />
        </div>
      </div>
    </div>
  );
}
