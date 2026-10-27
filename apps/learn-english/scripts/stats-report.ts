// Prints the anonymous usage stats for a date range (AC-058): lessons completed
// and distinct devices per day, exercises answered per kind and the 20 words
// answered wrong most often.
//
//   pnpm stats:report --from 2026-10-01 --to 2026-10-31 [--remote]
//
// Reads local D1 unless --remote is passed. Days are the learners' local days
// as the app reported them.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

const DB_NAME = "learn-english";
export const TOP_WORDS = 20;

export interface DailyRow {
  day: string;
  lessons: number;
  placements: number;
}
export interface DeviceRow {
  day: string;
  devices: number;
}
export interface ExerciseRow {
  kind: string;
  answered: number;
}
export interface WordRow {
  word: string;
  wrong: number;
}

export interface Report {
  daily: DailyRow[];
  devices: DeviceRow[];
  exercises: ExerciseRow[];
  words: WordRow[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Checks the range; the days are inlined into SQL, so only strict YYYY-MM-DD strings pass. */
export function parseRange(from: string | undefined, to: string | undefined): { from: string; to: string } {
  if (!from || !to) throw new Error("Pass --from YYYY-MM-DD and --to YYYY-MM-DD");
  for (const day of [from, to]) {
    const time = Date.parse(`${day}T00:00:00Z`);
    if (!DAY.test(day) || Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== day) throw new Error(`Not a date: ${day}`);
  }
  if (from > to) throw new Error("--from must not be after --to");
  return { from, to };
}

/** The four report queries, in `Report` order. */
export function reportQueries({ from, to }: { from: string; to: string }): string[] {
  const range = `day BETWEEN '${from}' AND '${to}'`;
  return [
    `SELECT day, SUM(CASE WHEN metric = 'lesson_completed' THEN count ELSE 0 END) AS lessons, ` +
      `SUM(CASE WHEN metric = 'placement_done' THEN count ELSE 0 END) AS placements ` +
      `FROM stats_daily WHERE metric IN ('lesson_completed', 'placement_done') AND ${range} GROUP BY day ORDER BY day`,
    `SELECT day, COUNT(*) AS devices FROM stats_devices WHERE ${range} GROUP BY day ORDER BY day`,
    `SELECT key AS kind, SUM(count) AS answered FROM stats_daily WHERE metric = 'exercise' AND ${range} ` +
      `GROUP BY key ORDER BY answered DESC, kind`,
    `SELECT key AS word, SUM(count) AS wrong FROM stats_daily WHERE metric = 'word_wrong' AND ${range} ` +
      `GROUP BY key ORDER BY wrong DESC, word LIMIT ${TOP_WORDS}`,
  ];
}

/** Every day of the range with its lessons, placement tests and devices (zeros for quiet days). */
export function dailyTable(report: Report, { from, to }: { from: string; to: string }) {
  const lessons = new Map(report.daily.map((row) => [row.day, row]));
  const devices = new Map(report.devices.map((row) => [row.day, row.devices]));
  const rows: { day: string; devices: number; lessons: number; placements: number }[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    rows.push({ day, devices: devices.get(day) ?? 0, lessons: lessons.get(day)?.lessons ?? 0, placements: lessons.get(day)?.placements ?? 0 });
  }
  return rows;
}

export function totals(report: Report) {
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  return {
    lessons: sum(report.daily.map((row) => row.lessons)),
    placements: sum(report.daily.map((row) => row.placements)),
    deviceDays: sum(report.devices.map((row) => row.devices)),
    exercises: sum(report.exercises.map((row) => row.answered)),
  };
}

// ---- I/O ----

function query<T>(target: string, sql: string): T[] {
  const bin = path.join(process.cwd(), "node_modules/.bin/wrangler");
  const output = execFileSync(bin, ["d1", "execute", DB_NAME, target, "--json", "--command", sql], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return (JSON.parse(output) as { results: T[] }[])[0]?.results ?? [];
}

async function main() {
  const { values } = parseArgs({
    options: { from: { type: "string" }, to: { type: "string" }, remote: { type: "boolean", default: false } },
  });
  const range = parseRange(values.from, values.to);
  const target = values.remote ? "--remote" : "--local";
  const [daily, devices, exercises, words] = reportQueries(range).map((sql) => query(target, sql));
  const report = { daily, devices, exercises, words } as Report;

  console.log(`Usage stats ${range.from} to ${range.to} (${values.remote ? "remote" : "local"} D1)\n`);
  console.log("Per day: distinct devices, lessons completed, placement tests finished");
  console.table(dailyTable(report, range));
  console.log("Totals");
  console.table([totals(report)]);
  console.log("Exercises answered per kind");
  console.table(report.exercises.length ? report.exercises : [{ kind: "(none)", answered: 0 }]);
  console.log(`Top ${TOP_WORDS} words answered wrong`);
  console.table(report.words.length ? report.words : [{ word: "(none)", wrong: 0 }]);
}

if (process.argv[1]?.endsWith("stats-report.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
