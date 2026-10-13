import { CompileError, type Token, type TokenKind } from "./ast";

// The scanner turns characters into tokens one at a time, when the parser asks.
// What a token is depends on where the parser is: `<div>Hi there</div>` has
// text between the tags, and `/x/g` is a regex only where an expression starts.
// Like TypeScript's scanner, it always scans `>` alone; the parser joins `>>`
// and `>=` itself, so `Array<Array<T>>` closes two type lists.

export const KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum", "export",
  "extends", "false", "finally", "for", "from", "function", "if", "implements", "import", "in", "instanceof", "interface", "let", "namespace", "new",
  "null", "of", "return", "satisfies", "super", "switch", "this", "throw", "true", "try", "type", "typeof", "var", "void", "while", "with", "yield",
]);

// Longest first, so `===` wins over `==` and `=`.
const PUNCTUATORS = [
  "...", "===", "!==", "**=", "<<=", "&&=", "||=", "??=",
  "=>", "==", "!=", "<=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "++", "--", "<<", "&&", "||", "??", "?.",
  "{", "}", "(", ")", "[", "]", ";", ",", "<", ">", "+", "-", "*", "/", "%", "&", "|", "^", "!", "~", "?", ":", "=", ".", "@", "#",
];

export type ScanMode = "normal" | "jsxTag" | "jsxChild";

const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdPart = (c: string) => /[\w$]/.test(c);

export class Scanner {
  pos = 0;
  /** Tokens by start offset, so a rescan after backtracking replaces rather than duplicates. */
  readonly recorded = new Map<number, Token>();

  constructor(readonly source: string) {}

  private record(kind: TokenKind, start: number, end: number, lineBreakBefore: boolean): Token {
    const token: Token = { kind, text: this.source.slice(start, end), start, end, lineBreakBefore };
    if (kind !== "eof") this.recorded.set(start, token);
    return token;
  }

  /** Skips whitespace and comments; reports whether a line break was crossed. */
  private skipTrivia(): boolean {
    const s = this.source;
    let lineBreak = false;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (c === "\n") {
        lineBreak = true;
        this.pos++;
      } else if (c === " " || c === "\t" || c === "\r") {
        this.pos++;
      } else if (c === "/" && s[this.pos + 1] === "/") {
        while (this.pos < s.length && s[this.pos] !== "\n") this.pos++;
      } else if (c === "/" && s[this.pos + 1] === "*") {
        const close = s.indexOf("*/", this.pos + 2);
        if (close === -1) throw new CompileError("Unterminated comment", this.pos);
        if (s.slice(this.pos, close).includes("\n")) lineBreak = true;
        this.pos = close + 2;
      } else break;
    }
    return lineBreak;
  }

  scan(mode: ScanMode = "normal"): Token {
    if (mode === "jsxChild") return this.scanJsxChild();
    const lineBreak = this.skipTrivia();
    const s = this.source;
    const start = this.pos;
    if (start >= s.length) return this.record("eof", start, start, lineBreak);
    const c = s[start];

    if (isIdStart(c)) {
      this.pos++;
      while (this.pos < s.length && (isIdPart(s[this.pos]) || (mode === "jsxTag" && s[this.pos] === "-"))) this.pos++;
      const text = s.slice(start, this.pos);
      const kind: TokenKind = mode === "jsxTag" ? "jsxIdentifier" : KEYWORDS.has(text) ? "keyword" : "identifier";
      return this.record(kind, start, this.pos, lineBreak);
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[start + 1] ?? ""))) return this.scanNumber(start, lineBreak);
    if (c === '"' || c === "'") return this.scanString(start, lineBreak, mode === "jsxTag");
    if (c === "`") return this.scanTemplate(start, lineBreak);
    if (c === ">") {
      this.pos++;
      return this.record("punctuator", start, this.pos, lineBreak);
    }
    for (const p of PUNCTUATORS) {
      if (s.startsWith(p, start)) {
        // `a?.5:b` is a conditional, not optional chaining.
        if (p === "?." && /[0-9]/.test(s[start + 2] ?? "")) continue;
        this.pos += p.length;
        return this.record("punctuator", start, this.pos, lineBreak);
      }
    }
    throw new CompileError(`Unexpected character "${c}"`, start);
  }

  private scanNumber(start: number, lineBreak: boolean): Token {
    const s = this.source;
    if (s[start] === "0" && /[xob]/i.test(s[start + 1] ?? "")) {
      this.pos += 2;
      while (/[0-9a-f_]/i.test(s[this.pos] ?? "")) this.pos++;
    } else {
      while (/[0-9_]/.test(s[this.pos] ?? "")) this.pos++;
      if (s[this.pos] === ".") {
        this.pos++;
        while (/[0-9_]/.test(s[this.pos] ?? "")) this.pos++;
      }
      if (/[eE]/.test(s[this.pos] ?? "")) {
        this.pos++;
        if (/[+-]/.test(s[this.pos] ?? "")) this.pos++;
        while (/[0-9]/.test(s[this.pos] ?? "")) this.pos++;
      }
    }
    if (s[this.pos] === "n") this.pos++;
    return this.record("number", start, this.pos, lineBreak);
  }

  /** JSX attribute strings have no escapes and may span lines. */
  private scanString(start: number, lineBreak: boolean, jsx: boolean): Token {
    const s = this.source;
    const quote = s[start];
    this.pos++;
    while (this.pos < s.length && s[this.pos] !== quote) {
      if (!jsx && s[this.pos] === "\\") this.pos++;
      else if (!jsx && s[this.pos] === "\n") break;
      this.pos++;
    }
    if (s[this.pos] !== quote) throw new CompileError("Unterminated string", start);
    this.pos++;
    return this.record("string", start, this.pos, lineBreak);
  }

  /** The whole template is one token; the parser parses each `${…}` itself. */
  private scanTemplate(start: number, lineBreak: boolean): Token {
    const s = this.source;
    this.pos++;
    while (this.pos < s.length && s[this.pos] !== "`") {
      if (s[this.pos] === "\\") this.pos += 2;
      else if (s.startsWith("${", this.pos)) this.pos = templateExpressionEnd(s, this.pos + 2) + 1;
      else this.pos++;
    }
    if (s[this.pos] !== "`") throw new CompileError("Unterminated template literal", start);
    this.pos++;
    return this.record("template", start, this.pos, lineBreak);
  }

  /** Called by the parser where an expression starts and it sees `/` or `/=`. */
  rescanRegex(token: Token): Token {
    const s = this.source;
    this.pos = token.start + 1;
    let inClass = false;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (c === "\n") break;
      if (c === "\\") this.pos++;
      else if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      else if (c === "/" && !inClass) break;
      this.pos++;
    }
    if (s[this.pos] !== "/") throw new CompileError("Unterminated regular expression", token.start);
    this.pos++;
    while (isIdPart(s[this.pos] ?? "")) this.pos++;
    return this.record("regex", token.start, this.pos, token.lineBreakBefore);
  }

  /** Called by the parser when it sees `>` and wants `>>`, `>=`, `>>>` or `>>=`. */
  rescanGreater(token: Token): Token {
    const s = this.source;
    for (const op of [">>>=", ">>>", ">>=", ">=", ">>"]) {
      if (s.startsWith(op, token.start)) {
        this.pos = token.start + op.length;
        return this.record("punctuator", token.start, this.pos, token.lineBreakBefore);
      }
    }
    return token;
  }

  /** Between JSX tags: text up to the next `{` or `<`, or one of those. */
  private scanJsxChild(): Token {
    const s = this.source;
    const start = this.pos;
    if (start >= s.length) return this.record("eof", start, start, false);
    if (s[start] === "{" || s[start] === "<") {
      this.pos++;
      return this.record("punctuator", start, this.pos, false);
    }
    while (this.pos < s.length && s[this.pos] !== "{" && s[this.pos] !== "<") this.pos++;
    return this.record("jsxText", start, this.pos, false);
  }

  /** Forget tokens scanned during a failed attempt, so the token list shows only what was kept. */
  rewind(pos: number) {
    this.pos = pos;
    for (const start of this.recorded.keys()) if (start >= pos) this.recorded.delete(start);
  }

  tokens(): Token[] {
    return [...this.recorded.values()].sort((a, b) => a.start - b.start);
  }
}

/** Offset of the `}` that closes a `${` whose body starts at `from`. */
export function templateExpressionEnd(s: string, from: number): number {
  let depth = 1;
  let i = from;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) i += s[i] === "\\" ? 2 : 1;
    } else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
    i++;
  }
  throw new CompileError("Unterminated ${ in template literal", from - 2);
}
