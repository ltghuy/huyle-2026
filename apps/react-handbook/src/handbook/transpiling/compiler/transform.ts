import type { Expression, Identifier, JSXAttribute, JSXChild, JSXElement, JSXFragment, JSXName, ObjectProperty, Pattern, Program, SpreadElement, Statement, StringLiteral } from "./ast";

// The transform walks the TypeScript + JSX tree and returns a plain
// JavaScript tree: type nodes are dropped, `as`/`satisfies`/`!` unwrap to the
// expression inside, and each JSX element becomes a function call. Like
// TypeScript's transpileModule, it also drops imports that are only used as
// types, since nothing would read them at runtime.

export type JsxRuntime = "automatic" | "classic";

export type TransformOptions = { jsx: JsxRuntime };

type RuntimeName = "jsx" | "jsxs" | "Fragment" | "createElement";

class Transformer {
  /** Runtime helpers in order of first use, which is the order TypeScript imports them in. */
  readonly used = new Set<RuntimeName>();
  private sawJsx = false;

  constructor(private readonly options: TransformOptions) {}

  program(program: Program): Program {
    const typeNames = new Set<string>();
    for (const s of program.body) {
      const declaration = s.type === "ExportNamedDeclaration" ? s.declaration : s;
      if (declaration?.type === "TSInterfaceDeclaration" || declaration?.type === "TSTypeAliasDeclaration") typeNames.add(declaration.id.name);
    }
    let body = program.body.flatMap((s) => this.statement(s, typeNames));
    // TypeScript keeps a `React` import in any file with JSX, whichever runtime it compiles to.
    body = elideUnusedImports(body, this.sawJsx ? ["React"] : []);
    const fromReact = [...this.used].filter((name) => name === "createElement");
    const fromRuntime = [...this.used].filter((name) => name !== "createElement");
    if (fromReact.length) body.unshift(runtimeImport(fromReact, "react"));
    if (fromRuntime.length) body.unshift(runtimeImport(fromRuntime, "react/jsx-runtime"));
    // A file that had imports or exports must stay a module even if all of them were removed.
    const isModule = (b: Statement[]) => b.some((s) => s.type.startsWith("Import") || s.type.startsWith("Export"));
    if (isModule(program.body) && !isModule(body)) body.push({ type: "ExportNamedDeclaration", start: -1, end: -1, declaration: null, specifiers: [], source: null, exportKind: "value" });
    return { ...program, body };
  }

  statement(s: Statement, typeNames: Set<string>): Statement[] {
    switch (s.type) {
      case "TSTypeAliasDeclaration":
      case "TSInterfaceDeclaration":
        return [];
      case "ImportDeclaration": {
        if (s.importKind === "type") return [];
        const specifiers = s.specifiers.filter((sp) => sp.type !== "ImportSpecifier" || sp.importKind === "value");
        // `import { type A } from "x"` imports nothing at runtime.
        if (s.specifiers.length > 0 && specifiers.length === 0) return [];
        return [{ ...s, specifiers }];
      }
      case "ExportNamedDeclaration": {
        if (s.exportKind === "type") return [];
        if (s.declaration) {
          const inner = this.statement(s.declaration, typeNames);
          return inner.length ? [{ ...s, declaration: inner[0] }] : [];
        }
        const specifiers = s.specifiers.filter((sp) => sp.exportKind === "value" && (s.source !== null || !typeNames.has(sp.local.name)));
        if (s.specifiers.length > 0 && specifiers.length === 0) return [];
        return [{ ...s, specifiers }];
      }
      case "ExportDefaultDeclaration":
        return [{ ...s, declaration: s.declaration.type === "FunctionDeclaration" ? this.fn(s.declaration) : this.expr(s.declaration) }];
      case "FunctionDeclaration":
        return [this.fn(s)];
      case "VariableDeclaration":
        return [this.variables(s)];
      case "BlockStatement":
        return [{ ...s, body: s.body.flatMap((b) => this.statement(b, typeNames)) }];
      case "ExpressionStatement":
        return [{ ...s, expression: this.expr(s.expression) }];
      case "ReturnStatement":
        return [{ ...s, argument: s.argument ? this.expr(s.argument) : null }];
      case "ThrowStatement":
        return [{ ...s, argument: this.expr(s.argument) }];
      case "IfStatement":
        return [{ ...s, test: this.expr(s.test), consequent: this.single(s.consequent, typeNames), alternate: s.alternate ? this.single(s.alternate, typeNames) : null }];
      case "ForOfStatement":
        return [{ ...s, left: this.variables(s.left), right: this.expr(s.right), body: this.single(s.body, typeNames) }];
      default:
        return [s];
    }
  }

  private single(s: Statement, typeNames: Set<string>): Statement {
    return this.statement(s, typeNames)[0] ?? { type: "EmptyStatement", start: s.start, end: s.end };
  }

  private variables<T extends Extract<Statement, { type: "VariableDeclaration" }>>(s: T): T {
    return { ...s, declarations: s.declarations.map((d) => ({ ...d, id: this.pattern(d.id), init: d.init ? this.expr(d.init) : null })) };
  }

  private fn<T extends Extract<Statement, { type: "FunctionDeclaration" }>>(f: T): T {
    return { ...f, params: f.params.map((p) => this.pattern(p)), returnType: null, typeParameters: null, body: this.statement(f.body, new Set())[0] as T["body"] };
  }

  pattern(p: Pattern): Pattern {
    switch (p.type) {
      case "Identifier":
        // Without its `: Type`, the identifier spans just its name.
        return { type: "Identifier", start: p.start, end: p.start + p.name.length, name: p.name };
      case "ObjectPattern":
        return {
          type: "ObjectPattern",
          start: p.start,
          end: p.end,
          properties: p.properties.map((prop) => (prop.type === "RestElement" ? { ...prop, argument: this.pattern(prop.argument), typeAnnotation: null } : { ...prop, value: this.pattern(prop.value) })),
        };
      case "ArrayPattern":
        return { type: "ArrayPattern", start: p.start, end: p.end, elements: p.elements.map((e) => (e ? this.pattern(e) : null)) };
      case "AssignmentPattern":
        return { ...p, left: this.pattern(p.left), right: this.expr(p.right) };
      case "RestElement":
        return { type: "RestElement", start: p.start, end: p.end, argument: this.pattern(p.argument) };
    }
  }

  expr(e: Expression): Expression {
    switch (e.type) {
      case "Identifier":
        return { type: "Identifier", start: e.start, end: e.end, name: e.name };
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
        return this.expr(e.expression);
      case "ParenthesizedExpression": {
        const inner = this.expr(e.expression);
        // `(input as HTMLInputElement).value` → `input.value`: the parentheses only held the assertion.
        const wrappedAssertion = ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(e.expression.type);
        if (wrappedAssertion && isSimple(inner)) return inner;
        return { ...e, expression: inner };
      }
      case "TemplateLiteral":
        return { ...e, expressions: e.expressions.map((x) => this.expr(x)) };
      case "ArrayExpression":
        return { ...e, elements: e.elements.map((x) => (x ? this.spreadOrExpr(x) : null)) };
      case "ObjectExpression":
        return { ...e, properties: e.properties.map((p) => (p.type === "SpreadElement" ? this.spread(p) : { ...p, key: p.computed ? this.expr(p.key) : p.key, value: this.expr(p.value) })) };
      case "ArrowFunctionExpression":
        return {
          ...e,
          params: e.params.map((p) => this.pattern(p)),
          returnType: null,
          typeParameters: null,
          body: e.body.type === "BlockStatement" ? (this.statement(e.body, new Set())[0] as typeof e.body) : this.expr(e.body),
        };
      case "CallExpression":
        return { ...e, callee: this.expr(e.callee), arguments: e.arguments.map((a) => this.spreadOrExpr(a)), typeArguments: null };
      case "NewExpression":
        return { ...e, callee: this.expr(e.callee), arguments: e.arguments.map((a) => this.spreadOrExpr(a)) };
      case "ImportExpression":
        return { ...e, source: this.expr(e.source) };
      case "MemberExpression":
        return { ...e, object: this.expr(e.object), property: e.computed ? this.expr(e.property) : e.property };
      case "UnaryExpression":
      case "AwaitExpression":
      case "UpdateExpression":
        return { ...e, argument: this.expr(e.argument) };
      case "BinaryExpression":
      case "LogicalExpression":
        return { ...e, left: this.expr(e.left), right: this.expr(e.right) };
      case "AssignmentExpression":
        return { ...e, left: isPattern(e.left) ? this.pattern(e.left) : this.expr(e.left as Expression), right: this.expr(e.right) };
      case "ConditionalExpression":
        return { ...e, test: this.expr(e.test), consequent: this.expr(e.consequent), alternate: this.expr(e.alternate) };
      case "JSXElement":
      case "JSXFragment":
        return this.jsx(e);
      default:
        return e;
    }
  }

  private spread(s: SpreadElement): SpreadElement {
    return { ...s, argument: this.expr(s.argument) };
  }

  private spreadOrExpr(x: Expression | SpreadElement): Expression | SpreadElement {
    return x.type === "SpreadElement" ? this.spread(x) : this.expr(x);
  }

  // ---- JSX

  private jsx(node: JSXElement | JSXFragment): Expression {
    this.sawJsx = true;
    const at = node.start;
    const children = this.children(node.children);
    const type = node.type === "JSXFragment" ? this.fragmentType(at) : elementType(node.name);
    const attributes = node.type === "JSXElement" ? node.attributes : [];

    if (this.options.jsx === "classic") {
      const props = attributes.length ? obj(attributes.map((a) => this.prop(a)), at) : ({ type: "NullLiteral", start: at, end: at } as Expression);
      return call(member(id("React", at), "createElement", at), [type, props, ...children], at);
    }

    // A key after a spread can't be pulled out safely, so the automatic runtime falls back to createElement.
    const spreadIndex = attributes.findIndex((a) => a.type === "JSXSpreadAttribute");
    const keyIndex = attributes.findIndex((a) => a.type === "JSXAttribute" && a.name === "key");
    if (spreadIndex !== -1 && keyIndex > spreadIndex) {
      this.used.add("createElement");
      return call(id(runtimeLocal("createElement"), at), [type, obj(attributes.map((a) => this.prop(a)), at), ...children], at);
    }

    // Automatic runtime: the key moves out of props; children go into props.
    let key: Expression | null = null;
    const props: (ObjectProperty | SpreadElement)[] = [];
    for (const a of attributes) {
      if (a.type === "JSXAttribute" && a.name === "key") key = this.attrValue(a);
      else props.push(this.prop(a));
    }
    const isStatic = children.length > 1;
    if (children.length === 1) props.push(property("children", children[0], at));
    else if (children.length > 1) props.push(property("children", { type: "ArrayExpression", start: at, end: at, elements: children }, at));
    const fn: RuntimeName = isStatic ? "jsxs" : "jsx";
    this.used.add(fn);
    return call(id(runtimeLocal(fn), at), key ? [type, obj(props, at), key] : [type, obj(props, at)], at);
  }

  private fragmentType(at: number): Expression {
    if (this.options.jsx === "classic") return member(id("React", at), "Fragment", at);
    this.used.add("Fragment");
    return id(runtimeLocal("Fragment"), at);
  }

  private attrValue(a: Extract<JSXAttribute, { type: "JSXAttribute" }>): Expression {
    if (a.value === null) return { type: "BooleanLiteral", start: a.start, end: a.end, value: true };
    if (a.value.type === "StringLiteral") {
      // Kept as written, quotes included, unless it has an entity to decode.
      if (!a.value.raw.includes("&")) return { ...a.value };
      return str(decodeEntities(a.value.value), a.value.start);
    }
    if (a.value.type === "JSXExpressionContainer") return a.value.expression ? this.expr(a.value.expression) : { type: "BooleanLiteral", start: a.start, end: a.end, value: true };
    return this.jsx(a.value);
  }

  private prop(a: JSXAttribute): ObjectProperty | SpreadElement {
    if (a.type === "JSXSpreadAttribute") return { type: "SpreadElement", start: a.start, end: a.end, argument: this.expr(a.argument) };
    const key: Expression = /^[A-Za-z_$][\w$]*$/.test(a.name) ? id(a.name, a.start) : str(a.name, a.start);
    return { type: "ObjectProperty", start: a.start, end: a.end, key, value: this.attrValue(a), shorthand: false, computed: false };
  }

  private children(children: JSXChild[]): Expression[] {
    const out: Expression[] = [];
    for (const child of children) {
      if (child.type === "JSXText") {
        const text = cleanJsxText(child.raw);
        if (text) out.push(jsxTextLiteral(decodeEntities(text), child.start));
      } else if (child.type === "JSXExpressionContainer") {
        if (child.expression) out.push(this.expr(child.expression));
      } else out.push(this.jsx(child));
    }
    return out;
  }
}

function runtimeLocal(name: RuntimeName) {
  return `_${name}`;
}

function runtimeImport(names: RuntimeName[], source: string): Statement {
  const specifiers = names.map((name) => ({ type: "ImportSpecifier" as const, start: -1, end: -1, imported: id(name), local: id(runtimeLocal(name)), importKind: "value" as const }));
  return { type: "ImportDeclaration", start: -1, end: -1, specifiers, source: str(source), importKind: "value" };
}

/** JSX text as a string literal: double quotes, non-ASCII escaped as \uXXXX, as TypeScript prints it. */
function jsxTextLiteral(value: string, at: number): StringLiteral {
  const raw = JSON.stringify(value).replace(/[\u0080-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"));
  return { type: "StringLiteral", start: at, end: at, value, raw };
}

function id(name: string, at = -1): Identifier {
  return { type: "Identifier", start: at, end: at, name };
}

function str(value: string, at = -1): StringLiteral {
  return { type: "StringLiteral", start: at, end: at, value, raw: JSON.stringify(value) };
}

function member(object: Expression, name: string, at: number): Expression {
  return { type: "MemberExpression", start: at, end: at, object, property: id(name, at), computed: false, optional: false };
}

function call(callee: Expression, args: Expression[], at: number): Expression {
  return { type: "CallExpression", start: at, end: at, callee, arguments: args, optional: false, typeArguments: null };
}

function obj(properties: (ObjectProperty | SpreadElement)[], at: number): Expression {
  return { type: "ObjectExpression", start: at, end: at, properties };
}

function property(name: string, value: Expression, at: number): ObjectProperty {
  return { type: "ObjectProperty", start: -1, end: at, key: id(name), value, shorthand: false, computed: false };
}

/** Lowercase names are HTML elements (strings); capitalized or dotted names are components (variables). */
function elementType(name: JSXName): Expression {
  if (name.type === "JSXMemberExpression") return member(elementType(name.object), name.property, name.start);
  if (/^[a-z]/.test(name.name) || name.name.includes("-")) return str(name.name, name.start);
  return id(name.name, name.start);
}

function isSimple(e: Expression) {
  return ["Identifier", "MemberExpression", "CallExpression", "ThisExpression", "StringLiteral", "NumericLiteral", "ParenthesizedExpression", "ArrayExpression", "TemplateLiteral"].includes(e.type);
}

function isPattern(x: Expression | Pattern): x is Pattern {
  return x.type === "ObjectPattern" || x.type === "ArrayPattern" || x.type === "AssignmentPattern" || x.type === "RestElement";
}

/** React's whitespace rule: trim each line, drop empty lines, join the rest with single spaces. */
export function cleanJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((line, i) => {
    if (/[^ \t]/.test(line)) lastNonEmpty = i;
  });
  let out = "";
  lines.forEach((line, i) => {
    let trimmed = line.replace(/\t/g, " ");
    if (i !== 0) trimmed = trimmed.replace(/^[ ]+/, "");
    if (i !== lines.length - 1) trimmed = trimmed.replace(/[ ]+$/, "");
    if (trimmed) {
      if (i !== lastNonEmpty) trimmed += " ";
      out += trimmed;
    }
  });
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", hellip: "…", mdash: "—", ndash: "–" };

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

// ---- import elision

/** Names read as values anywhere in the (already type-free) program. */
function valueReferences(body: Statement[]): Set<string> {
  const names = new Set<string>();
  const visit = (node: unknown, parentKey?: string, parent?: { type: string; computed?: boolean; shorthand?: boolean }) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((n) => visit(n, parentKey, parent));
      return;
    }
    const n = node as { type?: string; name?: string } & Record<string, unknown>;
    if (n.type === "ImportDeclaration") return;
    if (n.type === "Identifier" && n.name) {
      const isPropertyName = (parent?.type === "MemberExpression" && parentKey === "property" && !parent.computed) || (parent?.type === "ObjectProperty" && parentKey === "key" && !parent.computed && !parent.shorthand);
      if (!isPropertyName) names.add(n.name);
      return;
    }
    for (const [k, v] of Object.entries(n)) if (k !== "start" && k !== "end" && k !== "type") visit(v, k, n as { type: string });
  };
  visit(body);
  return names;
}

function elideUnusedImports(body: Statement[], keep: string[]): Statement[] {
  const used = valueReferences(body);
  for (const name of keep) used.add(name);
  return body.flatMap((s) => {
    if (s.type !== "ImportDeclaration" || s.specifiers.length === 0) return [s];
    const specifiers = s.specifiers.filter((sp) => used.has(sp.local.name));
    return specifiers.length ? [{ ...s, specifiers }] : [];
  });
}

export function transform(program: Program, options: TransformOptions): Program {
  return new Transformer(options).program(program);
}
