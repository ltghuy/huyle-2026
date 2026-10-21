import {
  CucumberExpression,
  CucumberExpressionGenerator,
  ParameterTypeRegistry,
} from "@cucumber/cucumber-expressions";
import { AstBuilder, compile, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator, type GherkinDocument, type Pickle } from "@cucumber/messages";

// The same Gherkin parser and step-expression matcher the suite runs with
// (playwright-bdd uses these packages), so the page checks a scenario the way
// the runner would.

export type StepDef = {
  keyword: "Given" | "When" | "Then";
  pattern: string;
  file: string;
  line: number;
  /** The step's code, from the recorded step file. */
  source: string;
  /** Page object methods the step calls, e.g. "cartPage.applyCode". */
  calls: string[];
};

export type ParseError = { line: number; column: number; message: string };

export type Parsed = { document: GherkinDocument | null; pickles: readonly Pickle[]; errors: ParseError[] };

export function parseGherkin(text: string, uri = "scenario.feature"): Parsed {
  // Incrementing ids keep the result identical on the server and in the browser.
  const newId = IdGenerator.incrementing();
  const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
  try {
    const document = parser.parse(text);
    return { document, pickles: compile(document, uri, newId), errors: [] };
  } catch (error) {
    const inner = (error as { errors?: unknown[] }).errors ?? [error];
    return {
      document: null,
      pickles: [],
      errors: inner.map((e) => {
        const err = e as { message?: string; location?: { line: number; column?: number } };
        return { line: err.location?.line ?? 0, column: err.location?.column ?? 0, message: explain(err.message ?? String(e)) };
      }),
    };
  }
}

/** The parser's messages ("expected: #EOF, #TableRow, … got 'x'") in plain words. */
function explain(raw: string) {
  const message = raw.replace(/^\(\d+:\d+\):\s*/, "");
  const got = /got '(.*)'$/.exec(message)?.[1];
  if (/got '#EOF'/.test(message)) return "The file ends too early: a Feature needs at least one Scenario.";
  if (got !== undefined && /expected: #EOF|#StepLine/.test(message) && message.includes("#ScenarioLine")) {
    return `"${got.trim()}" isn't a Gherkin line here. Start a step with Given, When, Then, And or But, or a section with Scenario, Scenario Outline, Examples or Rule.`;
  }
  if (got !== undefined && message.includes("#FeatureLine")) return `The file has to start with "Feature:", not "${got.trim()}".`;
  if (/inconsistent cell count/.test(message)) return "A table row has a different number of cells from the header.";
  return message;
}

const registry = new ParameterTypeRegistry();
const generator = new CucumberExpressionGenerator(() => registry.parameterTypes);

export type StepMatch =
  | { status: "matched"; def: StepDef; args: string[] }
  | { status: "ambiguous"; defs: StepDef[] }
  | { status: "undefined"; snippet: string };

/** Matches a step's text against the definitions, like the runner does (keywords don't matter). */
export function matchStep(text: string, defs: readonly StepDef[]): StepMatch {
  const hits: { def: StepDef; args: string[] }[] = [];
  for (const def of defs) {
    const args = new CucumberExpression(def.pattern, registry).match(text);
    if (args) hits.push({ def, args: args.map((a) => String(a.getValue(null))) });
  }
  if (hits.length === 1) return { status: "matched", ...hits[0] };
  if (hits.length > 1) return { status: "ambiguous", defs: hits.map((h) => h.def) };
  return { status: "undefined", snippet: snippetFor(text) };
}

function snippetFor(text: string) {
  const expression = generator.generateExpressions(text)[0];
  const types = expression.parameterTypes.map((t, i) => `arg${i === 0 ? "" : i}: ${t.name === "int" || t.name === "float" ? "number" : "string"}`);
  const params = types.length > 0 ? `, ${types.join(", ")}` : "";
  return `When(${JSON.stringify(expression.source)}, async ({ page }${params}) => {\n  // drive the page through a page object here\n});`;
}

/** How playwright-bdd titles an outline's example: placeholders filled in, or "Example #n". */
export function exampleTitle(outlineName: string, header: readonly string[], row: readonly string[], index: number) {
  if (!/<[^>]+>/.test(outlineName)) return `Example #${index}`;
  return outlineName.replace(/<([^>]+)>/g, (whole, name: string) => {
    const column = header.indexOf(name);
    return column === -1 ? whole : row[column];
  });
}
