// The statistics behind the A/B demos: a two-proportion z-test and the tools
// it needs. Small, standard formulas; every result shown on the page comes
// from these and real random draws.

/** Error function (Abramowitz and Stegun 7.1.26, error below 1.5e-7). */
export function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

export function normalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Inverse of the normal CDF (Acklam's approximation). */
export function normalQuantile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Visitors needed per variant to detect a relative lift with a two-sided test. */
export function sampleSizePerArm(baseline: number, relativeLift: number, alpha: number, power: number) {
  const p1 = baseline;
  const p2 = baseline * (1 + relativeLift);
  if (!(p1 > 0 && p1 < 1 && p2 > 0 && p2 < 1) || p1 === p2) return null;
  const za = normalQuantile(1 - alpha / 2);
  const zb = normalQuantile(power);
  const pBar = (p1 + p2) / 2;
  const n = (za * Math.sqrt(2 * pBar * (1 - pBar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2;
  return Math.ceil(n);
}

export type Arm = { visitors: number; conversions: number };

/** Two-sided z-test for the difference of two conversion rates. */
export function zTest(a: Arm, b: Arm) {
  const pa = a.conversions / a.visitors;
  const pb = b.conversions / b.visitors;
  const pooled = (a.conversions + b.conversions) / (a.visitors + b.visitors);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors));
  const z = se === 0 ? 0 : (pb - pa) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  // Unpooled interval for the difference.
  const seDiff = Math.sqrt((pa * (1 - pa)) / a.visitors + (pb * (1 - pb)) / b.visitors);
  return { pa, pb, diff: pb - pa, low: pb - pa - 1.96 * seDiff, high: pb - pa + 1.96 * seDiff, z, pValue };
}

/** Wilson 95% interval for one rate. */
export function wilson(arm: Arm) {
  const n = arm.visitors;
  if (n === 0) return { low: 0, high: 0 };
  const p = arm.conversions / n;
  const z = 1.96;
  const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** Chi-square goodness of fit of observed counts to intended shares; p-value for 2 arms (df = 1). */
export function sampleRatioTest(observed: readonly number[], shares: readonly number[]) {
  const total = observed.reduce((s, x) => s + x, 0);
  const sumShares = shares.reduce((s, x) => s + x, 0);
  let chi = 0;
  observed.forEach((o, i) => {
    const e = (total * shares[i]) / sumShares;
    chi += (o - e) ** 2 / e;
  });
  // For one degree of freedom, P(X > chi) = erfc(sqrt(chi / 2)).
  return { chi, pValue: 1 - erf(Math.sqrt(chi / 2)) };
}

/** Conversions among n visitors with rate p: exact draws for small n, a normal draw for large n. */
export function drawConversions(n: number, p: number, random: () => number = Math.random) {
  if (n <= 2000 || n * p < 30 || n * (1 - p) < 30) {
    let hits = 0;
    for (let i = 0; i < n; i++) if (random() < p) hits++;
    return hits;
  }
  // Box-Muller normal approximation to the binomial.
  const u = 1 - random();
  const v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(n, Math.max(0, Math.round(n * p + z * Math.sqrt(n * p * (1 - p)))));
}
