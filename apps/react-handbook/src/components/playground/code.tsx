import { SugarHigh, tokenize } from "sugar-high/core";
import * as css from "sugar-high/lang/css";
import { tokenize as tokenizeHtml } from "sugar-high/lang/html";
import * as json from "sugar-high/lang/json";
import { tokenize as tokenizeTs } from "sugar-high/lang/typescript";
import * as yaml from "sugar-high/lang/yaml";

// Editor-style colours for quoted code. sugar-high tokenizes; the colours are
// theme tokens (--code-*) in globals.css, so they follow light and dark mode.
// Pure and synchronous, so server and browser render the same spans.

export type CodeLang = "ts" | "html" | "css" | "json" | "yaml" | "text";

type Kind = "keyword" | "string" | "function" | "type" | "tag" | "property" | "comment" | "sign" | "text" | "plain";

export type Token = { kind: Kind; text: string };

const KIND: Record<string, Kind> = {
  keyword: "keyword",
  string: "string",
  class: "type",
  entity: "tag",
  property: "property",
  comment: "comment",
  sign: "sign",
  jsxliterals: "text",
};

/** The language to colour a file as, from its name or a panel's title. */
export function langFor(path: string): CodeLang {
  // A transform's output ("styles.css → JS") is in the language after the arrow.
  if (/→\s*JS\b/.test(path)) return "ts";
  if (/\.(ya?ml)\b/.test(path)) return "yaml";
  if (/\.html?\b|innerHTML/.test(path)) return "html";
  if (/\.(s?css|sass|less)\b|\bCSS\b|stylesheet/.test(path)) return "css";
  if (/\.(json|map)\b/.test(path)) return "json";
  if (/\.(feature|txt|md)$/.test(path)) return "text";
  return "ts";
}

function raw(code: string, lang: CodeLang): [string, string][] {
  if (lang === "text") return [["plain", code]];
  const tokens =
    lang === "html"
      ? tokenizeHtml(code, {})
      : lang === "css"
        ? css.tokenize(code, css)
        : lang === "json"
          ? tokenize(code, json)
          : lang === "yaml"
            ? tokenize(code, yaml)
            : tokenizeTs(code, {});
  return tokens.map(([type, value]) => [SugarHigh.TokenTypes[type], value]);
}

function nextSolid(tokens: [string, string][], from: number) {
  for (let i = from; i < tokens.length; i++) if (tokens[i][0] !== "space") return tokens[i];
  return null;
}

function prevSolid(tokens: [string, string][], from: number) {
  for (let i = from; i >= 0; i--) if (tokens[i][0] !== "space") return tokens[i];
  return null;
}

/** The code as lines of coloured tokens. */
export function highlightLines(code: string, lang: CodeLang = "ts"): Token[][] {
  const tokens = raw(code.replace(/\n$/, ""), lang);
  const lines: Token[][] = [[]];
  tokens.forEach(([type, value], i) => {
    if (type === "break") {
      lines.push([]);
      return;
    }
    let kind: Kind = KIND[type] ?? "plain";
    const next = nextSolid(tokens, i + 1);
    // Editors colour calls: a name followed by "(" (sugar-high leaves it a plain identifier).
    const calls = next?.[0] === "sign" && next[1].startsWith("(") && lang !== "yaml";
    if (calls && (type === "identifier" || type === "property")) kind = "function";
    // A capitalised call is a function too (Given(...), Page()), unless it follows `new`.
    if (calls && type === "class" && prevSolid(tokens, i - 1)?.[1] !== "new") kind = "function";
    // CSS: a name after "." in a selector is a class selector; a name after "@" is an at-rule.
    if (lang === "css" && type === "property" && prevSolid(tokens, i - 1)?.[1] === "." && next?.[1] !== ":") kind = "tag";
    if (lang === "css" && type === "identifier" && prevSolid(tokens, i - 1)?.[1] === "@") kind = "keyword";
    // YAML keys are names followed by ":".
    if (lang === "yaml" && type === "identifier" && next?.[0] === "sign" && next[1] === ":") kind = "property";
    // A comment token can carry the newline (and more lines); split it so every line keeps its colour.
    value.split("\n").forEach((part, j) => {
      if (j > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ kind, text: part });
    });
  });
  return lines;
}

const COLOR: Partial<Record<Kind, string>> = {
  keyword: "var(--code-keyword)",
  string: "var(--code-string)",
  function: "var(--code-function)",
  type: "var(--code-type)",
  tag: "var(--code-tag)",
  property: "var(--code-property)",
  comment: "var(--code-comment)",
  sign: "var(--code-sign)",
};

/** The code as one run of tokens, line breaks included, for views that mark a range of characters. */
export function highlightFlat(code: string, lang: CodeLang = "ts"): Token[] {
  return highlightLines(code, lang).flatMap((line, i) => (i === 0 ? line : [{ kind: "plain" as const, text: "\n" }, ...line]));
}

/** Splits tokens at character offsets, so a range can be wrapped without losing colours. */
export function sliceTokens(tokens: readonly Token[], start: number, end: number): Token[] {
  const out: Token[] = [];
  let at = 0;
  for (const t of tokens) {
    const from = Math.max(start, at);
    const to = Math.min(end, at + t.text.length);
    if (from < to) out.push({ kind: t.kind, text: t.text.slice(from - at, to - at) });
    at += t.text.length;
  }
  return out;
}

/** One line of coloured tokens (a space when empty, so the line keeps its height). */
export function CodeLine({ tokens }: { tokens: readonly Token[] }) {
  if (tokens.length === 0) return " ";
  return <CodeTokens tokens={tokens} />;
}

/** Coloured tokens as they are, newlines included. */
export function CodeTokens({ tokens }: { tokens: readonly Token[] }) {
  return tokens.map((t, i) =>
    COLOR[t.kind] ? (
      <span key={i} style={{ color: COLOR[t.kind] }} className={t.kind === "comment" ? "italic" : undefined}>
        {t.text}
      </span>
    ) : (
      t.text
    ),
  );
}

/** Coloured code for a <pre>, without line numbers. */
export function Code({ code, lang = "ts" }: { code: string; lang?: CodeLang }) {
  return highlightLines(code, lang).map((line, i) => (
    <span key={i} className="block">
      <CodeLine tokens={line} />
    </span>
  ));
}
