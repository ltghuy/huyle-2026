/**
 * The "Evan" wordmark as ONE continuous monoline stroke (a single open path,
 * never lifting the pen): E → v → a → n are joined — the E's bottom arm sweeps
 * up into the v, the v flows into the a's bowl+stem, and the a connects across
 * the top into the n's arch, which finishes on a curling tail. Drawn as a
 * stroked path (fill: none), so a dash reveal reads as a single pen stroke.
 *
 * Shared by the first-visit intro (IntroOverlay) and the hero (HeroWordmark) so
 * both render the exact same artwork.
 */
export const EVAN_MARK = {
  viewBox: "0 0 1340 380",
  strokeWidth: 46,
  ink: "#d7f24a",
  path: "M 436 150 C 434 132 414 132 402 148 C 348 162 240 152 180 156 C 156 178 158 206 182 224 C 240 210 356 210 356 230 C 356 250 250 252 216 238 C 200 232 176 238 178 256 C 180 274 190 286 214 292 C 268 310 372 308 432 286 C 452 276 466 252 470 230 C 480 200 490 176 500 152 C 516 200 536 258 548 288 C 562 258 580 198 598 152 C 624 150 690 150 762 152 C 762 200 762 250 762 290 C 764 308 788 312 800 292 C 776 300 720 300 686 296 C 640 292 610 266 610 226 C 610 188 628 152 690 150 C 724 150 748 150 762 152 C 794 150 828 150 848 154 C 848 200 848 250 848 300 C 848 250 848 200 848 156 C 854 150 942 150 962 210 C 972 246 972 276 970 300 C 970 318 996 320 1008 296",
} as const;
