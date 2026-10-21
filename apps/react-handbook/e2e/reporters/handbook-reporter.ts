import fs from "node:fs";
import path from "node:path";

import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";

// Records each run for the handbook page: a summary of every test, and a copy
// of the suite's own files, so the page quotes exactly the code that ran.

const OUT_DIR = path.join(__dirname, "../../src/handbook/e2e");
const SUITE_FILES = ["playwright.config.ts", "e2e"];

type Recorded = {
  file: string;
  line: number;
  title: string;
  describe: string;
  outcome: "expected" | "unexpected" | "flaky" | "skipped";
  durationMs: number;
  retries: number;
  error?: string;
};

function stripAnsi(text: string) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function listFiles(root: string, entry: string): string[] {
  const full = path.join(root, entry);
  if (fs.statSync(full).isFile()) return [entry];
  return fs
    .readdirSync(full)
    .flatMap((name) => listFiles(root, path.join(entry, name)))
    .filter((file) => file.endsWith(".ts"));
}

class HandbookReporter implements Reporter {
  private rootDir = "";
  private project = "";
  private tests = new Map<string, Recorded>();

  onBegin(config: FullConfig, suite: Suite) {
    this.rootDir = path.dirname(config.configFile ?? config.rootDir);
    this.project = config.projects.map((p) => p.name).join(", ");
    for (const test of suite.allTests()) this.tests.set(test.id, this.record(test));
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const recorded = this.tests.get(test.id) ?? this.record(test);
    recorded.durationMs += result.duration;
    recorded.retries = result.retry;
    recorded.outcome = test.outcome();
    recorded.error = result.error?.message ? stripAnsi(result.error.message).split("\n")[0] : undefined;
    this.tests.set(test.id, recorded);
  }

  onEnd(result: FullResult) {
    const tests = [...this.tests.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    const summary = {
      ranAt: result.startTime.toISOString(),
      durationMs: Math.round(result.duration),
      status: result.status,
      project: this.project,
      playwright: (JSON.parse(fs.readFileSync(require.resolve("@playwright/test/package.json"), "utf8")) as { version: string }).version,
      totals: {
        passed: tests.filter((t) => t.outcome === "expected").length,
        failed: tests.filter((t) => t.outcome === "unexpected").length,
        flaky: tests.filter((t) => t.outcome === "flaky").length,
        skipped: tests.filter((t) => t.outcome === "skipped").length,
      },
      tests: tests.map((t) => ({ ...t, durationMs: Math.round(t.durationMs) })),
    };
    const files = Object.fromEntries(
      SUITE_FILES.flatMap((entry) => listFiles(this.rootDir, entry))
        .sort()
        .map((file) => [file.split(path.sep).join("/"), fs.readFileSync(path.join(this.rootDir, file), "utf8")]),
    );
    fs.writeFileSync(path.join(OUT_DIR, "last-run.json"), `${JSON.stringify(summary, null, 2)}\n`);
    fs.writeFileSync(path.join(OUT_DIR, "suite-files.json"), `${JSON.stringify(files, null, 2)}\n`);
  }

  printsToStdio() {
    return false;
  }

  private record(test: TestCase): Recorded {
    const [, , file, ...rest] = test.titlePath();
    return {
      file: path.relative(this.rootDir, test.location.file).split(path.sep).join("/"),
      line: test.location.line,
      title: test.title,
      describe: rest.slice(0, -1).join(" › ") || file,
      outcome: "skipped",
      durationMs: 0,
      retries: 0,
    };
  }
}

export default HandbookReporter;
