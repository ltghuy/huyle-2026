import { CompileError, type Program, type Token } from "./ast";
import { generate } from "./codegen";
import { Parser } from "./parser";
import { decodeMappings, encodeMappings, type Mapping, type SourceMap } from "./sourcemap";
import { type JsxRuntime, transform } from "./transform";

export type { JsxRuntime } from "./transform";
export type { Mapping, SourceMap } from "./sourcemap";

export type CompileOk = {
  ok: true;
  tokens: Token[];
  ast: Program;
  output: Program;
  code: string;
  map: SourceMap;
  /** The map's segments, decoded back from its `mappings` string. */
  mappings: Mapping[];
};

export type CompileFailure = { ok: false; tokens: Token[]; error: { message: string; offset: number; line: number; column: number } };

export type CompileResult = CompileOk | CompileFailure;

export function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  return starts;
}

/** 0-based line and column of an offset. */
export function position(starts: number[], offset: number): { line: number; column: number } {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo, column: offset - starts[lo] };
}

/** Compiles TypeScript + JSX to JavaScript. Never throws: errors come back as values. */
export function compile(source: string, options: { jsx: JsxRuntime; fileName?: string }): CompileResult {
  const starts = lineStarts(source);
  let parser: Parser | null = null;
  try {
    parser = new Parser(source);
    const ast = parser.parseProgram();
    const output = transform(ast, { jsx: options.jsx });
    const generated = generate(output);
    const raw = generated.mappings.map((m) => {
      const { line, column } = position(starts, m.srcOffset);
      return { genLine: m.genLine, genColumn: m.genColumn, srcLine: line, srcColumn: column, name: m.name };
    });
    const { mappings, names } = encodeMappings(raw);
    const fileName = options.fileName ?? "App.tsx";
    const map: SourceMap = { version: 3, file: fileName.replace(/\.tsx?$/, ".js"), sources: [fileName], sourcesContent: [source], names, mappings };
    return { ok: true, tokens: parser.scanner.tokens(), ast, output, code: generated.code, map, mappings: decodeMappings(mappings, names) };
  } catch (error) {
    const tokens = parser?.scanner.tokens() ?? [];
    if (error instanceof CompileError) {
      const { line, column } = position(starts, Math.min(error.pos, source.length));
      return { ok: false, tokens, error: { message: error.message, offset: error.pos, line, column } };
    }
    // A bug in the teaching compiler, not in the reader's code.
    return { ok: false, tokens, error: { message: `Internal compiler error: ${error instanceof Error ? error.message : String(error)}`, offset: 0, line: 0, column: 0 } };
  }
}
