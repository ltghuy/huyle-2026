// A simple model of fetching one HTML document, for the HTML-delivery demo.
// Not a real network: round numbers for a visitor far from the server.
// Assumptions: 200 ms round trip (RTT) to the origin, 20 ms to a CDN edge
// near the visitor, 100 ms from the edge to the origin; DNS 50 ms; a new
// connection costs 2 round trips (TCP + TLS 1.3); a redirect costs a round
// trip plus a new connection to the new address; the server needs 200 ms to
// build the page; 120 KB of HTML (18 KB with Brotli) at 625 KB/s (5 Mbps).

export type DeliveryOptions = {
  cdn: boolean;
  edgeCache: boolean;
  brotli: boolean;
  noRedirect: boolean;
};

export const SLOW_DELIVERY: DeliveryOptions = { cdn: false, edgeCache: false, brotli: false, noRedirect: false };
export const FAST_DELIVERY: DeliveryOptions = { cdn: true, edgeCache: true, brotli: true, noRedirect: true };

export type PhaseId = "dns" | "connect" | "redirect" | "server" | "download";
export type Phase = { id: PhaseId; label: string; ms: number; note: string };
export type Delivery = { phases: Phase[]; ttfb: number; done: number };

const ORIGIN_RTT = 200;
const EDGE_RTT = 20;
const EDGE_TO_ORIGIN = 100;
const DNS = 50;
const SERVER_TIME = 200;
const EDGE_HIT_TIME = 5;
const HTML_KB = 120;
const BROTLI_KB = 18;
const KB_PER_MS = 0.625;

export function deliver(o: DeliveryOptions): Delivery {
  const viaEdge = o.cdn;
  const cached = o.cdn && o.edgeCache;
  const rtt = viaEdge ? EDGE_RTT : ORIGIN_RTT;
  const server = cached ? EDGE_HIT_TIME : viaEdge ? EDGE_TO_ORIGIN + SERVER_TIME : SERVER_TIME;
  const kb = o.brotli ? BROTLI_KB : HTML_KB;

  const phases: Phase[] = [
    { id: "dns", label: "DNS lookup", ms: DNS, note: "Find the server's address." },
    {
      id: "connect",
      label: "Connect (TCP + TLS)",
      ms: 2 * rtt,
      note: viaEdge ? "Two round trips to a nearby CDN edge." : "Two round trips to a far-away server.",
    },
    {
      id: "redirect",
      label: "Redirect",
      ms: o.noRedirect ? 0 : 3 * rtt,
      note: o.noRedirect ? "Links point at the final address." : "http → https://www: one more request plus a new connection.",
    },
    {
      id: "server",
      label: "Request + server time",
      ms: rtt + server,
      note: cached
        ? "The edge already has the page and answers at once."
        : viaEdge
          ? "The edge asks the origin, which builds the page."
          : "The origin builds the page for every visitor.",
    },
    {
      id: "download",
      label: "Download HTML",
      ms: Math.round(kb / KB_PER_MS),
      note: `${kb} KB${o.brotli ? " compressed with Brotli" : " uncompressed"}.`,
    },
  ];
  const ttfb = phases.filter((p) => p.id !== "download").reduce((sum, p) => sum + p.ms, 0);
  return { phases, ttfb, done: ttfb + phases[4].ms };
}
