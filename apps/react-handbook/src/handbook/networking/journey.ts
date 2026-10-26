// Simulated: round trips before the first byte of a response arrives.
// One round trip (RTT) per DNS lookup, TCP handshake, TLS 1.3 handshake (two
// for TLS 1.2) and request; QUIC (HTTP/3) does transport and TLS in one.

export type JourneyOptions = { rtt: number; https: boolean; tls13: boolean; http3: boolean; reuse: boolean };

export type StepKind = "dns" | "tcp" | "tls" | "quic" | "request";

export type Step = { kind: StepKind; label: string; roundTrips: number; start: number; end: number; note: string };

export const SERVER_TIME = 50;

export function journey({ rtt, https, tls13, http3, reuse }: JourneyOptions) {
  const plan: Omit<Step, "start" | "end">[] = [];
  if (!reuse) {
    plan.push({ kind: "dns", label: "DNS lookup", roundTrips: 1, note: "Ask a resolver for the server's IP address (often cached)." });
    if (http3) {
      plan.push({ kind: "quic", label: "QUIC + TLS 1.3 handshake", roundTrips: 1, note: "Transport and encryption agreed in one exchange, over UDP." });
    } else {
      plan.push({ kind: "tcp", label: "TCP handshake", roundTrips: 1, note: "SYN → SYN-ACK → ACK; data can follow the ACK." });
      if (https) {
        plan.push({
          kind: "tls",
          label: tls13 ? "TLS 1.3 handshake" : "TLS 1.2 handshake",
          roundTrips: tls13 ? 1 : 2,
          note: tls13 ? "Keys agreed in one round trip." : "Two round trips before any encrypted data.",
        });
      }
    }
  }
  plan.push({ kind: "request", label: "Request → first byte", roundTrips: 1, note: `One round trip plus ${SERVER_TIME} ms of server work.` });

  let t = 0;
  const steps: Step[] = plan.map((step) => {
    const start = t;
    t += step.roundTrips * rtt + (step.kind === "request" ? SERVER_TIME : 0);
    return { ...step, start, end: t };
  });
  return { steps, roundTrips: plan.reduce((sum, s) => sum + s.roundTrips, 0), ttfb: t };
}
