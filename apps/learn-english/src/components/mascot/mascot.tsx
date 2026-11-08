import { cn } from "@/lib/utils";

export type MascotMood = "happy" | "cheer" | "think" | "sleepy";

interface MascotProps {
  mood?: MascotMood;
  /** Width in px (the height follows the drawing's 200:230 ratio), or `hero`: 72 px on phones, 96 px from `md`. */
  size?: number | "hero";
  /** When set, the cat is announced as an image with this text; otherwise it is decoration. */
  label?: string;
  className?: string;
}

// The owner's palette (feature 030, designs/build_tuxedo_cat.py), the same in light and dark.
const C = {
  fur: "#2F2C3A",
  arm: "#3E3A4C",
  /** A lighter rim on the black fur, so the cat stays visible on the dark theme. */
  rim: "#55506A",
  white: "#FAF8FF",
  pink: "#F4A6B8",
  nose: "#F29AB0",
  iris: "#D2DC3C",
  pupil: "#15131B",
  pad: "#F1EDF7",
  cap: "#4A4370",
  band: "#7B58D6",
  gold: "#FFC845",
  book: "#FF8A3D",
  spine: "#E06A25",
  pages: "#FFF3E8",
};
const EYES = [428, 596];
const SPARK = "M0 -7L2 -2L7 0L2 2L0 7L-2 2L-7 0L-2 -2Z";
// Outlines from the build script's front view (1024 px canvas, ground at y = 970).
const HEAD =
  "M512 330C640 330 728 388 744 468L748 520L726 542L746 576L720 602C700 650 620 676 512 676C404 676 324 650 304 602L278 576L298 542L276 520L280 468C296 388 384 330 512 330Z";
const BLAZE = "M512 355C505 400 500 430 488 455C470 500 420 522 402 562C390 604 432 662 512 680C592 662 634 604 622 562C604 522 554 500 536 455C524 420 519 400 512 355Z";
const BIB = "M512 560C600 600 640 700 622 800C604 900 560 945 512 945C464 945 420 900 402 800C384 700 424 600 512 560Z";
const FUR = { fill: C.fur, stroke: C.rim, strokeWidth: 6, strokeLinejoin: "round" as const };

/**
 * The tuxedo cat, Tuxedo English's companion (feature 030): a front view of the owner's 3D model as flat SVG,
 * drawn in the build script's 1024 px front-view space, in four moods. It bobs gently unless motion is reduced.
 */
export function Mascot({ mood = "happy", size = 96, label, className }: MascotProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const cheer = mood === "cheer";
  return (
    <span
      className={cn("mascot-bob inline-block shrink-0", size === "hero" && "h-[83px] w-[72px] md:h-[110px] md:w-[96px]", className)}
      style={size === "hero" ? undefined : { width: size, height: (size * 230) / 200 }}
      data-mood={mood}
    >
      <svg viewBox="145 150 740 851" width="100%" height="100%" {...a11y}>
        {label ? <title>{label}</title> : null}

        {/* Tail, curling up on the right behind the body */}
        <path d="M680 912C790 910 846 866 840 788C834 712 796 660 772 610" fill="none" stroke={C.rim} strokeWidth={52} strokeLinecap="round" />
        <path d="M680 912C790 910 846 866 840 788C834 712 796 660 772 610" fill="none" stroke={C.fur} strokeWidth={42} strokeLinecap="round" />

        {/* Ears sit behind the head. */}
        <path d="M262 166L300 446L424 322Z" {...FUR} />
        <path d="M762 166L724 446L600 322Z" {...FUR} />
        <path d="M292 222L316 388L398 308Z" fill={C.pink} />
        <path d="M732 222L708 388L626 308Z" fill={C.pink} />

        {/* Body with the white bib, feet */}
        <ellipse cx={512} cy={752} rx={214} ry={206} {...FUR} />
        <path d={BIB} fill={C.white} />
        {[436, 588].map((x) => (
          <ellipse key={x} cx={x} cy={954} rx={50} ry={24} fill={C.white} />
        ))}

        {/* Arms: at the sides holding the book, or raised when cheering. */}
        {cheer ? (
          <g>
            <ellipse cx={262} cy={566} rx={52} ry={116} transform="rotate(-44 262 566)" fill={C.arm} stroke={C.rim} strokeWidth={6} />
            <ellipse cx={762} cy={566} rx={52} ry={116} transform="rotate(44 762 566)" fill={C.arm} stroke={C.rim} strokeWidth={6} />
            <circle cx={186} cy={486} r={36} fill={C.white} stroke={C.rim} strokeWidth={4} />
            <circle cx={838} cy={486} r={36} fill={C.white} stroke={C.rim} strokeWidth={4} />
          </g>
        ) : (
          <g>
            <ellipse cx={300} cy={770} rx={60} ry={116} transform="rotate(-16 300 770)" fill={C.arm} stroke={C.rim} strokeWidth={6} />
            <ellipse cx={724} cy={770} rx={60} ry={116} transform="rotate(16 724 770)" fill={C.arm} stroke={C.rim} strokeWidth={6} />
          </g>
        )}

        {/* Head with the white blaze and muzzle */}
        <path d={HEAD} {...FUR} />
        <path d={BLAZE} fill={C.white} />
        {[490, 534].map((x) => (
          <ellipse key={x} cx={x} cy={590} rx={34} ry={24} fill={C.pad} />
        ))}
        <path d="M486 538Q512 528 538 538L512 566Z" fill={C.nose} stroke={C.nose} strokeWidth={6} strokeLinejoin="round" />
        <path d="M512 566V582M512 582Q496 596 482 588M512 582Q528 596 542 588" fill="none" stroke={C.pupil} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
        <g stroke={C.white} strokeWidth={4} strokeLinecap="round">
          {[
            [548, 262],
            [574, 262],
            [600, 266],
            [626, 270],
          ].map(([y2, x2], i) => (
            <g key={y2}>
              <path d={`M${456} ${574 + i * 9}L${x2} ${y2}`} />
              <path d={`M${568} ${574 + i * 9}L${1024 - x2} ${y2}`} />
            </g>
          ))}
        </g>
        <Eyes mood={mood} />

        {/* The book, held in both paws */}
        <g>
          <rect x={388} y={736} width={248} height={196} rx={12} fill={C.book} />
          <rect x={388} y={736} width={30} height={196} rx={10} fill={C.spine} />
          <rect x={618} y={748} width={10} height={172} rx={4} fill={C.pages} />
          <g fill={C.pages} fontWeight={800} textAnchor="middle" fontFamily="inherit">
            <text x={516} y={826} fontSize={38} letterSpacing={1}>
              ENGLISH
            </text>
            <text x={516} y={888} fontSize={56}>
              A·B·C
            </text>
          </g>
          {cheer ? null : (
            <g fill={C.white}>
              <circle cx={390} cy={842} r={34} />
              <circle cx={634} cy={842} r={34} />
            </g>
          )}
        </g>

        {/* Mortarboard and tassel */}
        <path d="M412 282H612V340Q512 372 412 340Z" fill={C.band} />
        <path d="M512 186L712 252L512 316L312 252Z" fill={C.cap} />
        <circle cx={512} cy={252} r={11} fill={C.gold} />
        <path d="M512 252L680 270L680 362" stroke={C.gold} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={680} cy={376} r={17} fill={C.gold} />

        {cheer ? (
          <g fill={C.gold}>
            <path d={SPARK} transform="translate(232 384) scale(4)" />
            <path d={SPARK} transform="translate(806 372) scale(3.2)" />
          </g>
        ) : null}
        {mood === "think" ? (
          <text x={790} y={420} fontSize={120} fontWeight={800} fill={C.band} fontFamily="inherit">
            ?
          </text>
        ) : null}
        {mood === "sleepy" ? (
          <g fill={C.band} fontWeight={800} fontFamily="inherit">
            <text x={770} y={410} fontSize={72}>
              z
            </text>
            <text x={826} y={340} fontSize={52}>
              z
            </text>
          </g>
        ) : null}
      </svg>
    </span>
  );
}

function Eyes({ mood }: { mood: MascotMood }) {
  const shut = { stroke: C.white, strokeWidth: 10, strokeLinecap: "round" as const, fill: "none" };
  if (mood === "cheer") {
    // Closed, smiling eyes: "^ ^".
    return (
      <g>
        {EYES.map((x) => (
          <path key={x} d={`M${x - 42} 484Q${x} 436 ${x + 42} 484`} {...shut} />
        ))}
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g>
        {EYES.map((x) => (
          <path key={x} d={`M${x - 42} 470Q${x} 500 ${x + 42} 470`} {...shut} />
        ))}
      </g>
    );
  }
  // Pupils look up and to the side when thinking.
  const [dx, dy] = mood === "think" ? [14, -10] : [0, 0];
  return (
    <g>
      {EYES.map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={468} rx={54} ry={38} fill={C.iris} stroke={C.pupil} strokeWidth={6} transform={`rotate(${i === 0 ? 4 : -4} ${x} 468)`} />
          <ellipse cx={x + dx} cy={468 + dy} rx={19} ry={31} fill={C.pupil} />
          <circle cx={x + dx + 12} cy={454 + dy} r={10} fill={C.white} />
          <circle cx={x + dx - 8} cy={484 + dy} r={5} fill={C.white} />
        </g>
      ))}
    </g>
  );
}
