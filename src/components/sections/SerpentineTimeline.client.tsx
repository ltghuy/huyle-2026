"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import type { ExperienceItem } from "@/content/experience";

/**
 * Serpentine career timeline — numbered nodes threaded by a winding SVG path that
 * DRAWS ITSELF on scroll (à la https://gsapvault.com/effects/svg-line-draw): the
 * stroke-dasharray/stroke-dashoffset technique, no paid plugin. The path is built
 * from the measured node centres, so it always weaves through them at any width;
 * each node lights up as the drawn line reaches it. Content alternates left/right
 * on desktop, stacks to the right of the line on mobile. Under reduced motion the
 * path shows fully drawn with every node lit.
 */

const ACTIVE_STYLE = {
  backgroundColor: "var(--color-accent)",
  color: "var(--color-on-accent)",
  borderColor: "var(--color-accent)",
  boxShadow: "0 0 34px 8px rgba(215, 242, 74, 0.5)",
} as const;

const IDLE_STYLE = {
  backgroundColor: "var(--color-surface)",
  color: "var(--color-fg-subtle)",
  borderColor: "var(--color-line)",
  boxShadow: "none",
} as const;

function applyNodeState(el: HTMLElement, active: boolean) {
  Object.assign(el.style, active ? ACTIVE_STYLE : IDLE_STYLE);
}

// Horizontal gap kept between the path centreline and the content's left edge,
// so the copy (and its bullet dots) curves alongside the line without touching
// it. Large enough to clear the numbered node at the top of each card.
const CONTENT_CLEAR = 48;

// The path is monotonic in y (always descending), so binary-search its length
// for the point at a given y and return that point's x — used to make each
// content row track the curve.
function xAtY(path: SVGPathElement, y: number, len: number) {
  let lo = 0;
  let hi = len;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).y < y) lo = mid;
    else hi = mid;
  }
  return path.getPointAtLength((lo + hi) / 2).x;
}

function ItemCard({ item }: { item: ExperienceItem }) {
  return (
    <div>
      <p data-curve-row className="font-mono text-sm uppercase tracking-[0.14em] text-fg-muted">
        {item.period}
        {item.current && (
          <span className="ml-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[0.6rem] tracking-[0.16em] text-accent">
            NOW
          </span>
        )}
      </p>
      <h3 data-curve-row className="mt-2 text-xl font-bold leading-tight text-fg sm:text-2xl">
        {item.role}
      </h3>
      <p data-curve-row className="mt-1 text-accent">{item.company}</p>
      <p data-curve-row className="mt-3 text-sm text-fg-muted">{item.context}</p>
      <ul className="mt-4 space-y-2.5">
        {item.highlights.map((h, i) => (
          <li key={i} data-curve-row className="flex gap-3 text-sm leading-relaxed text-fg-muted sm:text-[0.9375rem]">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <ul data-curve-row className="mt-5 flex flex-wrap gap-2">
        {item.tech.map((t) => (
          <li
            key={t}
            className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fg-muted"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SerpentineTimeline({ items }: { items: ExperienceItem[] }) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drawRef = useRef<SVGPathElement>(null);
  const lenRef = useRef(0);
  const nodeYRef = useRef<number[]>([]);

  const [pathD, setPathD] = useState("");
  const [box, setBox] = useState({ w: 0, h: 0 });

  // Build the path `d` from the measured node centres (weaving left/right).
  const rebuild = () => {
    const cont = containerRef.current;
    const nodes = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cont || nodes.length < 2) return;
    const cr = cont.getBoundingClientRect();
    const w = cr.width;
    const h = cr.height;
    const pts = nodes.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - cr.left,
        y: r.top + r.height / 2 - cr.top,
      };
    });

    const bulge = Math.min(150, w * 0.15);
    let d = `M ${pts[0].x} ${Math.max(0, pts[0].y - 44)} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // Centred nodes (desktop) alternate the bulge into an S; off-centre nodes
      // (mobile left column) always bulge toward the open side.
      const centred = a.x > w * 0.35 && a.x < w * 0.65;
      const dir = centred ? (i % 2 === 0 ? 1 : -1) : 1;
      // Keep the bulge inside the gutter so the line never crosses the body
      // text: on desktop the ~8% centre gap, on mobile the narrow left rail
      // between the node (~32px centre) and the content (pl-24 = 96px).
      const segBulge = centred ? Math.min(bulge, w * 0.04 + 24) : 34;
      const mx = (a.x + b.x) / 2 + dir * segBulge;
      const dh = b.y - a.y;
      d += ` C ${mx} ${a.y + dh * 0.35}, ${mx} ${a.y + dh * 0.65}, ${b.x} ${b.y}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${Math.min(h, last.y + 44)}`;

    nodeYRef.current = pts.map((p) => p.y / h);
    setBox({ w, h });
    setPathD(d);
  };

  // Offset each content row so its left edge tracks the curve at that height,
  // keeping a constant gap from the line (the copy "curves along the path").
  // Only in the single-column layout — on desktop the content sits in its own
  // alternating columns, so transforms are cleared there.
  const applyCurve = () => {
    const cont = containerRef.current;
    const path = drawRef.current;
    const len = lenRef.current;
    if (!cont || !path || !len) return;
    const rows = cont.querySelectorAll<HTMLElement>("[data-curve-row]");
    if (window.matchMedia("(min-width: 768px)").matches) {
      rows.forEach((r) => (r.style.transform = ""));
      return;
    }
    const cr = cont.getBoundingClientRect();
    rows.forEach((row) => {
      row.style.transform = ""; // reset to read the natural (untransformed) left
      const rr = row.getBoundingClientRect();
      const yMid = rr.top - cr.top + rr.height / 2;
      const naturalLeft = rr.left - cr.left;
      const dx = xAtY(path, yMid, len) + CONTENT_CLEAR - naturalLeft;
      row.style.transform = `translateX(${dx.toFixed(2)}px)`;
    });
  };

  // After the path renders, measure its length and prime the dash, then curve
  // the content to it. On reduced motion, reveal it fully and light every node.
  useLayoutEffect(() => {
    const path = drawRef.current;
    if (!path || !pathD) return;
    const len = path.getTotalLength();
    lenRef.current = len;
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = reduced ? "0" : String(len);
    if (reduced) {
      nodeRefs.current.forEach((el) => el && applyNodeState(el, true));
    }
    applyCurve();
  }, [pathD, reduced]);

  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    let cancelled = false;
    let st: ScrollTrigger | undefined;
    let ro: ResizeObserver | undefined;

    const onUpdate = (self: ScrollTrigger) => {
      const p = self.progress;
      if (drawRef.current && lenRef.current) {
        drawRef.current.style.strokeDashoffset = String(lenRef.current * (1 - p));
      }
      nodeRefs.current.forEach((el, i) => {
        if (el) applyNodeState(el, p >= (nodeYRef.current[i] ?? 1) - 0.02);
      });
    };

    const start = () => {
      if (cancelled) return;
      rebuild();
      if (reduced) return;
      gsap.registerPlugin(ScrollTrigger);
      st = ScrollTrigger.create({
        trigger: cont,
        start: "top 78%",
        end: "bottom 62%",
        scrub: true,
        onUpdate,
        onRefreshInit: rebuild,
      });
      ro = new ResizeObserver(() => {
        rebuild();
        ScrollTrigger.refresh();
      });
      ro.observe(cont);
    };

    const fontsReady = document.fonts?.ready;
    if (fontsReady) fontsReady.then(start);
    else start();

    return () => {
      cancelled = true;
      st?.kill();
      ro?.disconnect();
    };
  }, [reduced]);

  return (
    <div ref={containerRef} className="relative mt-16 md:mt-24">
      {/* The winding line — a faint base path plus the bright self-drawing path,
          both in the measured coordinate space. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${box.w || 1} ${box.h || 1}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={pathD} stroke="var(--color-accent)" strokeOpacity={0.14} strokeWidth={4} />
        <path
          ref={drawRef}
          d={pathD}
          stroke="var(--color-accent-bright)"
          strokeWidth={5}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 9px rgba(215,242,74,0.6))" }}
        />
      </svg>

      <div className="space-y-14 md:space-y-24">
        {items.map((item, i) => {
          const right = i % 2 === 0; // desktop side for this item's content
          return (
            <div key={`${item.company}-${item.period}`} className="relative">
              {/* Numbered node — mobile: left rail; desktop: centred on the line */}
              <div
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                style={IDLE_STYLE}
                className="absolute left-0 top-1 z-10 flex size-16 items-center justify-center rounded-full border-2 font-display text-2xl font-semibold md:left-1/2 md:-translate-x-1/2"
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Content — alternates sides on desktop, right of the rail on mobile */}
              <div
                className={`pl-24 md:w-[46%] md:pl-0 ${
                  right ? "md:ml-[54%] md:pl-10" : "md:mr-[54%] md:pr-10"
                }`}
              >
                <ItemCard item={item} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
