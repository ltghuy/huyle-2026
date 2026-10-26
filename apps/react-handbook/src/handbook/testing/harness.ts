// A tiny test runner for the demos: real assertions, run in the page.
// Each test's error is caught and reported, so a failing test never breaks the demo.

export type TestCase = { name: string; run: () => void | Promise<void> };
export type TestResult = { name: string; pass: boolean; message?: string };

class AssertionError extends Error {}

function show(value: unknown) {
  return typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value) ?? String(value);
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) throw new AssertionError(`Expected ${show(expected)}, got ${show(actual)}`);
    },
    toEqual(expected: unknown) {
      if (show(actual) !== show(expected)) throw new AssertionError(`Expected ${show(expected)}, got ${show(actual)}`);
    },
  };
}

/** Replace `obj[key]` with a wrapper that counts calls and keeps their arguments, like `vi.spyOn`. */
export function spyOn<T extends object>(obj: T, key: string) {
  const original = (obj as Record<string, unknown>)[key];
  if (typeof original !== "function") throw new AssertionError(`Cannot spy on "${key}": there is no such function`);
  const calls: unknown[][] = [];
  (obj as Record<string, unknown>)[key] = (...args: unknown[]) => {
    calls.push(args);
    return original.apply(obj, args);
  };
  return {
    calls,
    toHaveBeenCalledTimes(times: number) {
      if (calls.length !== times) throw new AssertionError(`Expected "${key}" to be called ${times} time(s), it was called ${calls.length}`);
    },
  };
}

function failure(name: string, error: unknown): TestResult {
  return { name, pass: false, message: error instanceof Error ? error.message : String(error) };
}

/** Runs tests that finish synchronously; a test returning a promise is reported as an error. */
export function runTestsSync(tests: readonly TestCase[]): TestResult[] {
  return tests.map((test) => {
    try {
      if (test.run() instanceof Promise) throw new Error("This runner only runs synchronous tests");
      return { name: test.name, pass: true };
    } catch (error) {
      return failure(test.name, error);
    }
  });
}

export async function runTests(tests: readonly TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const test of tests) {
    try {
      await test.run();
      results.push({ name: test.name, pass: true });
    } catch (error) {
      results.push(failure(test.name, error));
    }
  }
  return results;
}
