import { PIECES, type PieceId } from "./store";

// How a Module Federation runtime decides which copy of a shared library each
// piece gets. Rules from webpack 5.112's ConsumeSharedRuntimeModule (MF 2.0's
// runtime behaves the same for these cases); see .artifacts/research/micro-frontends.md.

export type LibraryId = "react" | "dates";

export type Library = {
  id: LibraryId;
  name: string;
  /** Holds state at module level (React's hooks dispatcher, context), so two copies can't cooperate. */
  stateful: boolean;
  /** Assumed size of one copy, kB gzip. */
  kb: number;
  versions: readonly string[];
  ranges: readonly string[];
  defaults: Record<PieceId, Consumer>;
};

export type Consumer = { provides: string; accepts: string };

export type Strategy = "version-first" | "loaded-first";
export type Options = { singleton: boolean; strictVersion: boolean; strategy: Strategy };

export type Status = "ok" | "own-copy" | "warning" | "error";
export type Resolution = { piece: PieceId; uses: string | null; status: Status; message: string };
export type ShareResult = { resolutions: Resolution[]; copies: string[]; extraKb: number; broken: boolean };

export const LIBRARIES: Record<LibraryId, Library> = {
  react: {
    id: "react",
    name: "react + react-dom",
    stateful: true,
    kb: 50,
    versions: ["18.3.1", "19.0.0", "19.1.1", "19.2.0"],
    ranges: ["^18.2.0", "^19.0.0", "^19.2.0", "~19.1.0", "19.2.0"],
    defaults: {
      shell: { provides: "19.2.0", accepts: "^19.0.0" },
      catalog: { provides: "19.2.0", accepts: "^19.2.0" },
      checkout: { provides: "19.1.1", accepts: "^19.0.0" },
      account: { provides: "18.3.1", accepts: "^18.2.0" },
    },
  },
  dates: {
    id: "dates",
    name: "date-fns",
    stateful: false,
    kb: 15,
    versions: ["3.6.0", "4.0.0", "4.1.0"],
    ranges: ["^3.6.0", "^4.0.0", "^4.1.0", "4.1.0"],
    defaults: {
      shell: { provides: "4.1.0", accepts: "^4.0.0" },
      catalog: { provides: "4.1.0", accepts: "^4.1.0" },
      checkout: { provides: "4.0.0", accepts: "^4.0.0" },
      account: { provides: "3.6.0", accepts: "^3.6.0" },
    },
  },
};

type Version = [number, number, number];

function parse(v: string): Version {
  const [a = 0, b = 0, c = 0] = v.split(".").map(Number);
  return [a, b, c];
}

export function compare(a: string, b: string): number {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** The subset of semver ranges the demo offers: ^x.y.z, ~x.y.z and exact. */
export function satisfies(version: string, range: string): boolean {
  const op = range[0] === "^" || range[0] === "~" ? range[0] : "";
  const base = op ? range.slice(1) : range;
  const [M, m, p] = parse(base);
  const [vM, vm, vp] = parse(version);
  if (!op) return compare(version, base) === 0;
  if (compare(version, base) < 0) return false;
  if (op === "~") return vM === M && vm === m;
  // Caret: the left-most non-zero part must match.
  if (M > 0) return vM === M;
  if (m > 0) return vM === 0 && vm === m;
  return vM === 0 && vm === 0 && vp === p;
}

const highest = (versions: string[]) => versions.reduce((best, v) => (compare(v, best) > 0 ? v : best));

/**
 * The shell is the host, so its copy is the one already loaded when the others
 * register under "loaded-first". Under "version-first" every piece registers before
 * anything loads, so the highest version wins.
 */
export function negotiate(library: Library, consumers: Record<PieceId, Consumer>, options: Options): ShareResult {
  const scope = [...new Set(PIECES.map((p) => consumers[p.id].provides))];
  const top = highest(scope);
  const singletonVersion = options.strategy === "loaded-first" ? consumers.shell.provides : top;

  const resolutions = PIECES.map(({ id }): Resolution => {
    const { provides, accepts } = consumers[id];
    if (options.singleton) {
      if (satisfies(singletonVersion, accepts)) return { piece: id, uses: singletonVersion, status: "ok", message: `Uses the single shared ${singletonVersion}.` };
      const text = `Unsatisfied version ${singletonVersion} of shared singleton module ${library.name.split(" ")[0]} (required ${accepts})`;
      if (options.strictVersion) return { piece: id, uses: null, status: "error", message: `Throws: ${text}. The piece fails to load.` };
      return { piece: id, uses: singletonVersion, status: "warning", message: `Console warning: ${text}. Runs on ${singletonVersion} anyway and may break.` };
    }
    const fits = scope.filter((v) => satisfies(v, accepts));
    if (fits.length > 0) {
      const v = highest(fits);
      return { piece: id, uses: v, status: "ok", message: v === provides ? `Uses ${v}, its own version and the highest that fits.` : `Uses ${v} from the scope, the highest that fits ${accepts}.` };
    }
    if (options.strictVersion) return { piece: id, uses: provides, status: "own-copy", message: `Nothing in the scope fits ${accepts}, so it loads its own bundled ${provides}.` };
    return { piece: id, uses: top, status: "warning", message: `Console warning: nothing fits ${accepts}. Uses the highest version, ${top}, anyway.` };
  });

  const copies = [...new Set(resolutions.flatMap((r) => (r.uses ? [r.uses] : [])))].sort(compare);
  return { resolutions, copies, extraKb: Math.max(0, copies.length - 1) * library.kb, broken: library.stateful && copies.length > 1 };
}
