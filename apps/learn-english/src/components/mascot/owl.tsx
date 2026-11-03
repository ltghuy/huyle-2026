import { cn } from "@/lib/utils";

export type OwlMood = "happy" | "cheer" | "think" | "sleepy";

interface OwlProps {
  mood?: OwlMood;
  /** Width in px (the height follows the drawing's 20:23 ratio), or `hero`: 72 px on phones, 96 px from `md`. */
  size?: number | "hero";
  /** When set, the owl is announced as an image with this text; otherwise it is decoration. */
  label?: string;
  className?: string;
}

// The owner's palette (feature 021, designs/build_owl.py), the same in light and dark.
const C = {
  body: "#8E6EDF",
  dark: "#7B59D8",
  belly: "#E9DFFD",
  pupil: "#2D2336",
  beak: "#FFA530",
  cheek: "#E79AC6",
  chevron: "#C9B4F5",
  feet: "#FFA22E",
  leg: "#F0901F",
  talon: "#FFF3EA",
  book: "#FF8A3D",
  spine: "#E06A22",
  pages: "#FFF3EA",
  capTop: "#2B2B40",
  capBase: "#3C3A56",
  gold: "#FFC94D",
};
const EYES = [77, 123];
const SPARK = "M0 -7L2 -2L7 0L2 2L0 7L-2 2L-7 0L-2 -2Z";

/**
 * The graduate owl, Streak Daily's companion (feature 021): a front view of the owner's 3D model as flat SVG,
 * mapped from `build_owl.py` at 110 px per model unit, in four moods. It bobs gently unless motion is reduced.
 */
export function Owl({ mood = "happy", size = 96, label, className }: OwlProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  const cheer = mood === "cheer";
  return (
    <span
      className={cn("mascot-bob inline-block shrink-0", size === "hero" && "h-[83px] w-[72px] md:h-[110px] md:w-[96px]", className)}
      style={size === "hero" ? undefined : { width: size, height: (size * 230) / 200 }}
      data-mood={mood}
    >
      <svg viewBox="0 0 200 230" width="100%" height="100%" {...a11y}>
        {label ? <title>{label}</title> : null}

        {/* Ear tufts sit behind the head. */}
        <path d="M60 76L50 34L84 58Z" fill={C.dark} />
        <path d="M140 76L150 34L116 58Z" fill={C.dark} />

        {/* Legs and feet */}
        {[77, 123].map((x) => (
          <g key={x}>
            <path d={`M${x - 1} 196L${x} 210`} stroke={C.leg} strokeWidth={11} strokeLinecap="round" />
            <ellipse cx={x} cy={213} rx={11} ry={6} fill={C.feet} />
            {[-9, 0, 9].map((dx) => (
              <g key={dx}>
                <ellipse cx={x + dx} cy={218} rx={5} ry={6.5} fill={C.feet} />
                <path d={`M${x + dx - 2.5} 223L${x + dx} 228L${x + dx + 2.5} 223Z`} fill={C.talon} />
              </g>
            ))}
          </g>
        ))}

        {/* Body and belly */}
        <ellipse cx={100} cy={115} rx={68} ry={86} fill={C.body} />
        <ellipse cx={100} cy={133} rx={48} ry={64} fill={C.belly} />
        <g stroke={C.chevron} strokeWidth={2.4} strokeLinecap="round" fill="none">
          {[
            [88, 130],
            [112, 130],
            [91, 140],
            [109, 140],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x - 5} ${y}Q${x} ${y + 4} ${x + 5} ${y}`} />
          ))}
        </g>

        {/* Wings: at the sides, or raised when cheering. */}
        {cheer ? (
          <g fill={C.dark}>
            <ellipse cx={34} cy={96} rx={16} ry={38} transform="rotate(38 34 96)" />
            <ellipse cx={166} cy={96} rx={16} ry={38} transform="rotate(-38 166 96)" />
          </g>
        ) : (
          <g fill={C.dark}>
            <ellipse cx={37} cy={144} rx={17} ry={41} transform="rotate(14 37 144)" />
            <ellipse cx={163} cy={144} rx={17} ry={41} transform="rotate(-14 163 144)" />
          </g>
        )}

        {/* Face */}
        <Eyes mood={mood} />
        <ellipse cx={56} cy={111} rx={9} ry={5} fill={C.cheek} />
        <ellipse cx={144} cy={111} rx={9} ry={5} fill={C.cheek} />
        <path d="M91 97L109 97L100 113Z" fill={C.beak} strokeLinejoin="round" stroke={C.beak} strokeWidth={2} />

        {/* The book, held in both hands */}
        <g>
          <rect x={71} y={146} width={58} height={48} rx={3} fill={C.book} />
          <rect x={71} y={146} width={8} height={48} rx={2} fill={C.spine} />
          <rect x={127} y={149} width={3} height={42} fill={C.pages} />
          <g fill={C.pages} fontWeight={800} textAnchor="middle" fontFamily="inherit">
            <text x={103} y={165} fontSize={8.6} letterSpacing={0.3}>
              ENGLISH
            </text>
            <text x={103} y={183} fontSize={13}>
              A·B·C
            </text>
          </g>
          <circle cx={70} cy={170} r={8.5} fill={C.dark} />
          <circle cx={130} cy={170} r={8.5} fill={C.dark} />
        </g>

        {/* Mortarboard and tassel */}
        <path d="M68 26H132V44Q100 50 68 44Z" fill={C.capBase} />
        <path d="M38 22L100 9L162 22L100 33Z" fill={C.capTop} />
        <ellipse cx={100} cy={20} rx={4} ry={2.4} fill={C.gold} />
        <path d="M100 20L158 22L159 52" stroke={C.gold} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={159} cy={56} r={5.5} fill={C.gold} />

        {cheer ? (
          <g fill={C.gold}>
            <path d={SPARK} transform="translate(22 50)" />
            <path d={SPARK} transform="translate(182 46) scale(0.8)" />
          </g>
        ) : null}
        {mood === "think" ? (
          <text x={172} y={86} fontSize={30} fontWeight={800} fill={C.dark} fontFamily="inherit">
            ?
          </text>
        ) : null}
        {mood === "sleepy" ? (
          <g fill={C.dark} fontWeight={800} fontFamily="inherit">
            <text x={166} y={84} fontSize={18}>
              z
            </text>
            <text x={180} y={66} fontSize={13}>
              z
            </text>
          </g>
        ) : null}
      </svg>
    </span>
  );
}

function Eyes({ mood }: { mood: OwlMood }) {
  const shut = { stroke: C.pupil, strokeWidth: 4.5, strokeLinecap: "round" as const, fill: "none" };
  if (mood === "cheer") {
    // Closed, smiling eyes: "^ ^".
    return (
      <g>
        {EYES.map((x) => (
          <path key={x} d={`M${x - 13} 94Q${x} 78 ${x + 13} 94`} {...shut} />
        ))}
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g>
        {EYES.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={89} rx={23} ry={24} fill="white" />
            <path d={`M${x - 13} 90Q${x} 99 ${x + 13} 90`} {...shut} />
          </g>
        ))}
      </g>
    );
  }
  // Pupils look up and to the side when thinking.
  const [dx, dy] = mood === "think" ? [5, -7] : [0, 2];
  return (
    <g>
      {EYES.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={89} rx={23} ry={24} fill="white" />
          <ellipse cx={x + dx} cy={89 + dy} rx={11.5} ry={12} fill={C.pupil} />
          <circle cx={x + dx + 4} cy={85 + dy} r={4.6} fill="white" />
          <circle cx={x + dx - 5} cy={94 + dy} r={2.2} fill="white" />
        </g>
      ))}
    </g>
  );
}
