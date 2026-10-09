// Simulated: TCP slow start. The sender may have `cwnd` segments in flight per
// round trip, starting at 10 (about 14 KB), doubling every round trip. A lost
// segment halves the window (and it is sent again); after that the window
// grows by one segment per round trip (congestion avoidance).

export const MSS = 1460;
export const INITIAL_WINDOW = 10;

export type Loss = "none" | "once" | "often";

export type Round = { round: number; cwnd: number; sent: number; lost: boolean };

/** Segments between losses: one loss after 150 segments, or one in every 150 (about 0.7%). */
const LOSS_EVERY: Record<Loss, number> = { none: Infinity, once: 150, often: 150 };

export function slowStart({ sizeKB, rtt, loss }: { sizeKB: number; rtt: number; loss: Loss }) {
  const total = Math.ceil((sizeKB * 1024) / MSS);
  let remaining = total;
  let cwnd = INITIAL_WINDOW;
  let slowStartPhase = true;
  const rounds: Round[] = [];
  let sentSoFar = 0;
  let nextLoss = LOSS_EVERY[loss];
  for (let round = 1; remaining > 0 && round < 500; round++) {
    const sent = Math.min(cwnd, remaining);
    sentSoFar += sent;
    const lost = sentSoFar >= nextLoss && sent > 1;
    if (lost) nextLoss = loss === "once" ? Infinity : nextLoss + LOSS_EVERY[loss];
    rounds.push({ round, cwnd, sent, lost });
    remaining -= lost ? sent - 1 : sent;
    if (lost) {
      cwnd = Math.max(2, Math.floor(cwnd / 2));
      slowStartPhase = false;
    } else {
      cwnd = slowStartPhase ? cwnd * 2 : cwnd + 1;
    }
  }
  // One extra round trip for the TCP handshake before any data.
  return { segments: total, rounds, roundTrips: rounds.length + 1, time: (rounds.length + 1) * rtt };
}
