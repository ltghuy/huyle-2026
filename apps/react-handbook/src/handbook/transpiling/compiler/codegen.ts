import type { Expression, ImportSpecifier, ObjectProperty, Pattern, Program, SpreadElement, Statement } from "./ast";

// Code generation prints the JavaScript tree back to text. Every time it
// prints a node that came from the source, it notes "output line:column came
// from source offset N": those notes become the source map.

export type RawMapping = { genLine: number; genColumn: number; srcOffset: number; name?: string };

const INDENT = "  ";
const WRAP_AT = 72;

class Writer {
  out = "";
  line = 0;
  column = 0;
  indent = 0;
  readonly mappings: RawMapping[] = [];
  private lastMapped = "";

  constructor(readonly recordMappings: boolean) {}

  write(text: string) {
    for (const c of text) {
      if (c === "\n") {
        this.line++;
        this.column = 0;
      } else this.column++;
    }
    this.out += text;
  }

  newline() {
    this.write("\n" + INDENT.repeat(this.indent));
  }

  map(srcOffset: number, name?: string) {
    if (!this.recordMappings || srcOffset < 0) return;
    const at = `${this.line}:${this.column}`;
    if (at === this.lastMapped) return;
    this.lastMapped = at;
    this.mappings.push({ genLine: this.line, genColumn: this.column, srcOffset, name });
  }
}

class Printer {
  /** `inline` printers never wrap: they only measure how wide a node is on one line. */
  constructor(
    readonly w: Writer,
    private readonly inline = false,
  ) {}

  /** Whether a node is too wide for one line (functions with bodies always wrap). */
  private tooWide(e: Expression): boolean {
    if (this.inline) return false;
    const scratch = new Writer(false);
    new Printer(scratch, true).expr(e);
    return scratch.out.includes("\n") || this.w.column + scratch.out.length > WRAP_AT;
  }

  program(p: Program) {
    p.body.forEach((s, i) => {
      if (i > 0) this.w.newline();
      this.statement(s);
    });
    if (p.body.length) this.w.write("\n");
  }

  private block(body: Statement[]) {
    this.w.write("{");
    if (body.length === 0) {
      this.w.write("}");
      return;
    }
    this.w.indent++;
    for (const s of body) {
      this.w.newline();
      this.statement(s);
    }
    this.w.indent--;
    this.w.newline();
    this.w.write("}");
  }

  statement(s: Statement): void {
    const w = this.w;
    w.map(s.start);
    switch (s.type) {
      case "BlockStatement":
        return this.block(s.body);
      case "EmptyStatement":
        return w.write(";");
      case "ExpressionStatement":
        // A statement can't start with `{`: that would be a block.
        if (s.expression.type === "ObjectExpression") {
          w.write("(");
          this.expr(s.expression);
          w.write(");");
          return;
        }
        this.expr(s.expression);
        return w.write(";");
      case "VariableDeclaration":
        this.variables(s);
        return w.write(";");
      case "FunctionDeclaration":
        if (s.async) w.write("async ");
        w.write("function ");
        if (s.id) this.identifier(s.id);
        this.params(s.params, false);
        w.write(" ");
        return this.block(s.body.body);
      case "ReturnStatement":
        w.write("return");
        if (s.argument) {
          w.write(" ");
          this.expr(s.argument);
        }
        return w.write(";");
      case "ThrowStatement":
        w.write("throw ");
        this.expr(s.argument);
        return w.write(";");
      case "IfStatement":
        w.write("if (");
        this.expr(s.test);
        w.write(") ");
        this.statement(s.consequent);
        if (s.alternate) {
          w.write(" else ");
          this.statement(s.alternate);
        }
        return;
      case "ForOfStatement":
        w.write("for (");
        this.variables(s.left);
        w.write(" of ");
        this.expr(s.right);
        w.write(") ");
        return this.statement(s.body);
      case "ImportDeclaration":
        w.write("import ");
        if (s.specifiers.length) {
          this.importSpecifiers(s.specifiers);
          w.write(" from ");
        }
        this.expr(s.source);
        return w.write(";");
      case "ExportNamedDeclaration":
        w.write("export ");
        if (s.declaration) return this.statement(s.declaration);
        w.write("{");
        s.specifiers.forEach((sp, i) => {
          w.write(i ? ", " : " ");
          this.identifier(sp.local);
          if (sp.exported.name !== sp.local.name) {
            w.write(" as ");
            this.identifier(sp.exported);
          }
        });
        w.write(s.specifiers.length ? " }" : "}");
        if (s.source) {
          w.write(" from ");
          this.expr(s.source);
        }
        return w.write(";");
      case "ExportDefaultDeclaration":
        w.write("export default ");
        if (s.declaration.type === "FunctionDeclaration") return this.statement(s.declaration);
        this.expr(s.declaration);
        return w.write(";");
      case "ExportAllDeclaration":
        w.write("export * from ");
        this.expr(s.source);
        return w.write(";");
      default:
        // Type declarations never reach codegen: the transform removed them.
        return;
    }
  }

  private importSpecifiers(specifiers: ImportSpecifier[]) {
    const w = this.w;
    const named = specifiers.filter((s) => s.type === "ImportSpecifier");
    let first = true;
    for (const s of specifiers) {
      if (s.type === "ImportDefaultSpecifier") {
        this.identifier(s.local);
        first = false;
      } else if (s.type === "ImportNamespaceSpecifier") {
        if (!first) w.write(", ");
        w.write("* as ");
        this.identifier(s.local);
        first = false;
      }
    }
    if (named.length) {
      if (!first) w.write(", ");
      w.write("{ ");
      named.forEach((s, i) => {
        if (i) w.write(", ");
        this.identifier(s.imported);
        if (s.local.name !== s.imported.name) {
          w.write(" as ");
          this.identifier(s.local);
        }
      });
      w.write(" }");
    }
  }

  private variables(s: Extract<Statement, { type: "VariableDeclaration" }>) {
    this.w.write(s.kind + " ");
    s.declarations.forEach((d, i) => {
      if (i) this.w.write(", ");
      this.pattern(d.id);
      if (d.init) {
        this.w.write(" = ");
        this.expr(d.init);
      }
    });
  }

  /** Maps the name too, but only for identifiers that appear as written in the source (not ones the transform added). */
  private identifier(node: { name: string; start: number; end: number }) {
    this.w.map(node.start, node.end - node.start === node.name.length ? node.name : undefined);
    this.w.write(node.name);
  }

  private params(params: Pattern[], bare: boolean) {
    if (bare && params.length === 1 && params[0].type === "Identifier") return this.pattern(params[0]);
    this.w.write("(");
    params.forEach((p, i) => {
      if (i) this.w.write(", ");
      this.pattern(p);
    });
    this.w.write(")");
  }

  pattern(p: Pattern): void {
    const w = this.w;
    switch (p.type) {
      case "Identifier":
        return this.identifier(p);
      case "AssignmentPattern":
        this.pattern(p.left);
        w.write(" = ");
        return this.expr(p.right);
      case "RestElement":
        w.map(p.start);
        w.write("...");
        return this.pattern(p.argument);
      case "ArrayPattern":
        w.map(p.start);
        w.write("[");
        p.elements.forEach((e, i) => {
          if (i) w.write(", ");
          if (e) this.pattern(e);
        });
        return w.write("]");
      case "ObjectPattern":
        w.map(p.start);
        if (p.properties.length === 0) return w.write("{}");
        w.write("{ ");
        p.properties.forEach((prop, i) => {
          if (i) w.write(", ");
          if (prop.type === "RestElement") return this.pattern(prop);
          if (prop.shorthand) return this.pattern(prop.value);
          this.expr(prop.key);
          w.write(": ");
          this.pattern(prop.value);
        });
        return w.write(" }");
    }
  }

  private args(args: (Expression | SpreadElement | null)[]) {
    args.forEach((a, i) => {
      if (i) this.w.write(", ");
      if (a) this.spreadOrExpr(a);
    });
  }

  private spreadOrExpr(a: Expression | SpreadElement) {
    if (a.type === "SpreadElement") {
      this.w.map(a.start);
      this.w.write("...");
      return this.expr(a.argument);
    }
    this.expr(a);
  }

  private objectProperty(p: ObjectProperty | SpreadElement) {
    if (p.type === "SpreadElement") return this.spreadOrExpr(p);
    if (p.shorthand) return this.expr(p.value);
    if (p.computed) {
      this.w.write("[");
      this.expr(p.key);
      this.w.write("]");
    } else this.expr(p.key);
    this.w.write(": ");
    this.expr(p.value);
  }

  expr(e: Expression): void {
    const w = this.w;
    if (e.type !== "Identifier") w.map(e.start);
    switch (e.type) {
      case "Identifier":
        return this.identifier(e);
      case "StringLiteral":
        return w.write(e.raw);
      case "NumericLiteral":
      case "RegExpLiteral":
        return w.write(e.raw);
      case "BooleanLiteral":
        return w.write(String(e.value));
      case "NullLiteral":
        return w.write("null");
      case "ThisExpression":
        return w.write("this");
      case "TemplateLiteral":
        w.write("`");
        e.quasis.forEach((q, i) => {
          w.write(q);
          if (i < e.expressions.length) {
            w.write("${");
            this.expr(e.expressions[i]);
            w.write("}");
          }
        });
        return w.write("`");
      case "ParenthesizedExpression":
        w.write("(");
        this.expr(e.expression);
        return w.write(")");
      case "ArrayExpression": {
        if (e.elements.length === 0) return w.write("[]");
        const wrap = this.tooWide(e);
        w.write("[");
        if (!wrap) {
          this.args(e.elements);
          return w.write("]");
        }
        w.indent++;
        e.elements.forEach((el, i) => {
          w.newline();
          if (el) this.spreadOrExpr(el);
          if (i < e.elements.length - 1) w.write(",");
        });
        w.indent--;
        w.newline();
        return w.write("]");
      }
      case "ObjectExpression": {
        if (e.properties.length === 0) return w.write("{}");
        const wrap = this.tooWide(e);
        if (!wrap) {
          w.write("{ ");
          e.properties.forEach((p, i) => {
            if (i) w.write(", ");
            this.objectProperty(p);
          });
          return w.write(" }");
        }
        w.write("{");
        w.indent++;
        e.properties.forEach((p, i) => {
          w.newline();
          this.objectProperty(p);
          if (i < e.properties.length - 1) w.write(",");
        });
        w.indent--;
        w.newline();
        return w.write("}");
      }
      case "ArrowFunctionExpression":
        if (e.async) w.write("async ");
        this.params(e.params, e.bareParam ?? false);
        w.write(" => ");
        if (e.body.type === "BlockStatement") return this.block(e.body.body);
        if (e.body.type === "ObjectExpression") {
          w.write("(");
          this.expr(e.body);
          return w.write(")");
        }
        return this.expr(e.body);
      case "CallExpression":
        this.expr(e.callee);
        w.write(e.optional ? "?.(" : "(");
        this.args(e.arguments);
        return w.write(")");
      case "NewExpression":
        w.write("new ");
        this.expr(e.callee);
        w.write("(");
        this.args(e.arguments);
        return w.write(")");
      case "ImportExpression":
        w.write("import(");
        this.expr(e.source);
        return w.write(")");
      case "MemberExpression":
        this.expr(e.object);
        if (e.computed) {
          w.write(e.optional ? "?.[" : "[");
          this.expr(e.property);
          return w.write("]");
        }
        w.write(e.optional ? "?." : ".");
        return this.expr(e.property);
      case "UnaryExpression":
        w.write(e.operator);
        if (/^[a-z]/.test(e.operator)) w.write(" ");
        return this.expr(e.argument);
      case "AwaitExpression":
        w.write("await ");
        return this.expr(e.argument);
      case "UpdateExpression":
        if (e.prefix) {
          w.write(e.operator);
          return this.expr(e.argument);
        }
        this.expr(e.argument);
        return w.write(e.operator);
      case "BinaryExpression":
      case "LogicalExpression":
        this.expr(e.left);
        w.write(` ${e.operator} `);
        return this.expr(e.right);
      case "AssignmentExpression":
        if (["ObjectPattern", "ArrayPattern", "AssignmentPattern", "RestElement"].includes(e.left.type)) this.pattern(e.left as Pattern);
        else this.expr(e.left as Expression);
        w.write(` ${e.operator} `);
        return this.expr(e.right);
      case "ConditionalExpression":
        this.expr(e.test);
        w.write(" ? ");
        this.expr(e.consequent);
        w.write(" : ");
        return this.expr(e.alternate);
      default:
        // TypeScript and JSX nodes never reach codegen: the transform replaced them.
        throw new Error(`Internal compiler error: cannot print ${e.type}`);
    }
  }
}

export function generate(program: Program): { code: string; mappings: RawMapping[] } {
  const writer = new Writer(true);
  new Printer(writer).program(program);
  return { code: writer.out, mappings: writer.mappings };
}
