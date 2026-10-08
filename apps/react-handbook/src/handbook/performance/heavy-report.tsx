// Loaded on demand by the code-splitting demo: this module, and everything it
// imports, ships in its own chunk that the page doesn't download up front.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Seeded, so the report is the same every time. */
function monthlySales() {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return MONTHS.map((month, i) => ({ month, value: Math.round(40 + i * 4 + random() * 30) }));
}

const DATA = monthlySales();
const MAX = Math.max(...DATA.map((d) => d.value));
const TOTAL = DATA.reduce((sum, d) => sum + d.value, 0);

export function SalesReport() {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">
        Sales by month <span className="font-normal text-muted-foreground">· {TOTAL.toLocaleString("en-US")} k total</span>
      </figcaption>
      <svg viewBox="0 0 360 140" className="h-auto w-full" role="img" aria-label={`Bar chart of monthly sales, from ${DATA[0].value} k in January to ${DATA[11].value} k in December`}>
        {DATA.map((d, i) => {
          const height = (d.value / MAX) * 110;
          return (
            <g key={d.month}>
              <rect x={i * 30 + 4} y={120 - height} width={22} height={height} rx={3} className="fill-primary/70" />
              <text x={i * 30 + 15} y={134} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
