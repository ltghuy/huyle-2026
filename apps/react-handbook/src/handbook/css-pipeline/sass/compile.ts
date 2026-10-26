// A compiler for a subset of SCSS, producing what Dart Sass prints in its
// default "expanded" style: variables, nesting with `&`, nested @media (which
// bubbles up around the parent selector), @mixin/@include with arguments and
// defaults, and comments. Everything else is rejected by name.

export type SassResult = { ok: true; css: string } | { ok: false; message: string; line: number };

class SassError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

type Item =
  | { kind: "decl"; prop: string; value: string; at: number }
  | { kind: "var"; name: string; value: string; isDefault: boolean; at: number }
  | { kind: "comment"; text: string; at: number }
  | { kind: "rule"; selector: string; body: Item[]; at: number }
  | { kind: "media"; query: string; body: Item[]; at: number }
  | { kind: "mixin"; name: string; params: { name: string; fallback: string | null }[]; body: Item[]; at: number }
  | { kind: "include"; name: string; args: string[]; at: number };

const UNSUPPORTED = ["use", "forward", "import", "extend", "if", "else", "each", "for", "while", "function", "return", "content", "debug", "warn", "error", "at-root", "supports", "keyframes", "font-face"];

class Parser {
  pos = 0;
  constructor(readonly src: string) {}

  private skipSpaceAndLineComments() {
    for (;;) {
      while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
      if (this.src.startsWith("//", this.pos)) {
        while (this.pos < this.src.length && this.src[this.pos] !== "\n") this.pos++;
      } else return;
    }
  }

  /** Text up to the next `{`, `;` or `}` outside strings, parentheses and `#{}`. */
  private prelude(): { text: string; end: string } {
    const start = this.pos;
    let depth = 0;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === '"' || c === "'") {
        const close = this.src.indexOf(c, this.pos + 1);
        if (close === -1) throw new SassError("Unterminated string", this.pos);
        this.pos = close + 1;
        continue;
      }
      if (this.src.startsWith("#{", this.pos)) {
        depth++;
        this.pos += 2;
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "}" && depth > 0) depth--;
      else if (depth === 0 && (c === "{" || c === ";" || c === "}")) return { text: this.src.slice(start, this.pos).trim(), end: c };
      else if (this.src.startsWith("//", this.pos) && depth === 0 && !/:$/.test(this.src.slice(start, this.pos))) {
        // A line comment ends the text (but not `//` inside a URL like https://).
        const text = this.src.slice(start, this.pos).trim();
        while (this.pos < this.src.length && this.src[this.pos] !== "\n") this.pos++;
        const rest = this.prelude();
        return { text: (text + " " + rest.text).trim(), end: rest.end };
      }
      this.pos++;
    }
    return { text: this.src.slice(start).trim(), end: "" };
  }

  block(top: boolean): Item[] {
    const items: Item[] = [];
    for (;;) {
      this.skipSpaceAndLineComments();
      if (this.pos >= this.src.length) {
        if (!top) throw new SassError('Expected "}"', this.pos);
        return items;
      }
      const at = this.pos;
      if (this.src[this.pos] === "}") {
        if (top) throw new SassError('Unexpected "}"', this.pos);
        this.pos++;
        return items;
      }
      if (this.src.startsWith("/*", this.pos)) {
        const close = this.src.indexOf("*/", this.pos + 2);
        if (close === -1) throw new SassError("Unterminated comment", this.pos);
        items.push({ kind: "comment", text: this.src.slice(this.pos, close + 2), at });
        this.pos = close + 2;
        continue;
      }
      const { text, end } = this.prelude();
      if (end === "{") {
        this.pos++;
        items.push(this.blockItem(text, at));
        continue;
      }
      if (end === ";") this.pos++;
      if (!text) continue;
      items.push(this.statement(text, at));
      if (end === "") {
        if (!top) throw new SassError('Expected "}"', this.pos);
        return items;
      }
    }
  }

  private atName(text: string) {
    return /^@([\w-]+)/.exec(text)?.[1] ?? "";
  }

  private blockItem(text: string, at: number): Item {
    if (text.startsWith("@")) {
      const name = this.atName(text);
      if (name === "media") return { kind: "media", query: text.slice(6).trim(), body: this.block(false), at };
      if (name === "mixin") {
        const m = /^@mixin\s+([\w-]+)\s*(?:\(([\s\S]*)\))?$/.exec(text);
        if (!m) throw new SassError("Invalid @mixin", at);
        const params = (m[2] ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            const [pname, ...rest] = p.split(":");
            return { name: pname.trim().replace(/^\$/, ""), fallback: rest.length ? rest.join(":").trim() : null };
          });
        return { kind: "mixin", name: m[1], params, body: this.block(false), at };
      }
      if (name === "include") throw new SassError("@include with a content block is outside this compiler's subset", at);
      throw new SassError(`@${name} is outside this compiler's subset`, at);
    }
    if (text.startsWith("%")) throw new SassError("Placeholder selectors (%name) are outside this compiler's subset", at);
    return { kind: "rule", selector: text, body: this.block(false), at };
  }

  private statement(text: string, at: number): Item {
    if (text.startsWith("@")) {
      const name = this.atName(text);
      if (name === "include") {
        const m = /^@include\s+([\w-]+)\s*(?:\(([\s\S]*)\))?$/.exec(text);
        if (!m) throw new SassError("Invalid @include", at);
        return { kind: "include", name: m[1], args: splitArgs(m[2] ?? ""), at };
      }
      if (UNSUPPORTED.includes(name) || name) throw new SassError(`@${name} is outside this compiler's subset`, at);
    }
    const colon = text.indexOf(":");
    if (colon === -1) throw new SassError(`Expected a declaration ("property: value"), found "${text}"`, at);
    const prop = text.slice(0, colon).trim();
    let value = text.slice(colon + 1).trim();
    if (prop.startsWith("$")) {
      const isDefault = /\s*!default$/.test(value);
      if (isDefault) value = value.replace(/\s*!default$/, "");
      if (/!global$/.test(value)) throw new SassError("!global is outside this compiler's subset", at);
      return { kind: "var", name: prop.slice(1), value, isDefault, at };
    }
    return { kind: "decl", prop, value, at };
  }
}

function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const c of text) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += c;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Splits a selector list on top-level commas. */
function selectorList(selector: string): string[] {
  return splitArgs(selector).map((s) => s.replace(/\s+/g, " "));
}

/** Child selectors resolved against the parent's: `&` is replaced, otherwise the parent comes first, as a descendant. */
function resolveSelectors(parents: string[], selector: string): string[] {
  const children = selectorList(selector);
  if (parents.length === 0) {
    if (children.some((c) => c.includes("&"))) throw new SassError('Top-level selectors may not contain the parent selector "&"', 0);
    return children;
  }
  return parents.flatMap((p) => children.map((c) => (c.includes("&") ? c.replaceAll("&", p) : `${p} ${c}`)));
}

type Scope = Map<string, string>[];

function lookup(scope: Scope, name: string): string | undefined {
  for (let i = scope.length - 1; i >= 0; i--) if (scope[i].has(name)) return scope[i].get(name);
  return undefined;
}

function evaluate(value: string, scope: Scope, at: number): string {
  let out = value.replace(/#\{\s*\$([\w-]+)\s*\}/g, (_, name: string) => {
    const v = lookup(scope, name);
    if (v === undefined) throw new SassError(`Undefined variable: $${name}`, at);
    return v.replace(/^["']|["']$/g, "");
  });
  out = out.replace(/\$([\w-]+)/g, (_, name: string) => {
    const v = lookup(scope, name);
    if (v === undefined) throw new SassError(`Undefined variable: $${name}`, at);
    return v;
  });
  if (/\d[\w%]*\s*[*]\s*-?[\d.]/.test(out) || /\d[\w%]*\s+[+]\s+-?[\d.]/.test(out)) throw new SassError("Arithmetic is outside this compiler's subset", at);
  return out.replace(/\s+/g, " ").trim();
}

type Context = { selectors: string[]; media: string[] };

class Emitter {
  readonly out: string[] = [];
  private readonly mixins = new Map<string, Extract<Item, { kind: "mixin" }>>();

  private open(ctx: Context, lines: string[]) {
    if (lines.length === 0) return;
    const indent = ctx.media.length ? "  " : "";
    const rule = [`${indent}${ctx.selectors.join(", ")} {`, ...lines.map((l) => `${indent}  ${l}`), `${indent}}`];
    if (ctx.media.length) this.out.push(`@media ${ctx.media.join(" and ")} {`, ...rule, "}");
    else this.out.push(...rule);
  }

  run(items: Item[], ctx: Context, scope: Scope) {
    let pending: string[] = [];
    const flush = () => {
      if (ctx.selectors.length === 0 && pending.length) throw new SassError("Declarations may only be used within style rules", 0);
      this.open(ctx, pending);
      pending = [];
    };
    for (const item of items) {
      switch (item.kind) {
        case "var": {
          const existing = lookup(scope, item.name);
          if (item.isDefault && existing !== undefined) break;
          scope[scope.length - 1].set(item.name, evaluate(item.value, scope, item.at));
          break;
        }
        case "decl":
          pending.push(`${evaluate(item.prop, scope, item.at)}: ${evaluate(item.value, scope, item.at)};`);
          break;
        case "comment":
          if (ctx.selectors.length) pending.push(item.text);
          else this.out.push(item.text);
          break;
        case "mixin":
          this.mixins.set(item.name, item);
          break;
        case "include": {
          const mixin = this.mixins.get(item.name);
          if (!mixin) throw new SassError(`Undefined mixin: ${item.name}`, item.at);
          const local = new Map<string, string>();
          const positional = item.args.filter((a) => !/^\$[\w-]+\s*:/.test(a));
          const named = new Map(item.args.filter((a) => /^\$[\w-]+\s*:/.test(a)).map((a) => [a.slice(1, a.indexOf(":")).trim(), a.slice(a.indexOf(":") + 1).trim()]));
          mixin.params.forEach((p, i) => {
            const raw = named.get(p.name) ?? positional[i] ?? p.fallback;
            if (raw === null || raw === undefined) throw new SassError(`Missing argument $${p.name} for ${item.name}`, item.at);
            local.set(p.name, evaluate(raw, scope, item.at));
          });
          // The mixin's declarations join the current rule; its nested rules follow it.
          const inner = new Emitter();
          inner.mixins.clear();
          for (const [k, v] of this.mixins) inner.mixins.set(k, v);
          const decls = mixin.body.filter((b) => b.kind === "decl" || b.kind === "comment");
          const mixinScope = [...scope, local];
          for (const d of decls) {
            if (d.kind === "decl") pending.push(`${evaluate(d.prop, mixinScope, d.at)}: ${evaluate(d.value, mixinScope, d.at)};`);
            else pending.push(d.text);
          }
          const rest = mixin.body.filter((b) => b.kind !== "decl" && b.kind !== "comment");
          if (rest.length) {
            flush();
            this.run(rest, ctx, mixinScope);
          }
          break;
        }
        case "rule":
          flush();
          this.run(item.body, { ...ctx, selectors: resolveSelectors(ctx.selectors, evaluate(item.selector, scope, item.at)) }, [...scope, new Map()]);
          break;
        case "media":
          flush();
          this.run(item.body, { ...ctx, media: [...ctx.media, evaluate(item.query, scope, item.at)] }, [...scope, new Map()]);
          break;
      }
    }
    flush();
  }
}

function lineOf(src: string, offset: number) {
  return src.slice(0, offset).split("\n").length;
}

export function compileSass(source: string): SassResult {
  try {
    const items = new Parser(source).block(true);
    const emitter = new Emitter();
    emitter.run(items, { selectors: [], media: [] }, [new Map()]);
    return { ok: true, css: emitter.out.length ? emitter.out.join("\n") + "\n" : "" };
  } catch (error) {
    if (error instanceof SassError) return { ok: false, message: error.message, line: lineOf(source, error.offset) };
    return { ok: false, message: `Internal error: ${error instanceof Error ? error.message : String(error)}`, line: 1 };
  }
}
