import {
  type ArrowFunctionExpression,
  type BlockStatement,
  CompileError,
  type ExportSpecifier,
  type Expression,
  type FunctionDeclaration,
  type Identifier,
  type ImportSpecifier,
  type JSXAttribute,
  type JSXChild,
  type JSXElement,
  type JSXFragment,
  type JSXName,
  type ObjectPatternProperty,
  type ObjectProperty,
  type Pattern,
  type Program,
  type RestElement,
  type SpreadElement,
  type Statement,
  type StringLiteral,
  type Token,
  type TSPropertySignature,
  type TSType,
  type TSTypeAnnotation,
  type TSTypeParameterDeclaration,
  type VariableDeclaration,
} from "./ast";
import { type ScanMode, Scanner, templateExpressionEnd } from "./scanner";

// A recursive-descent parser: one function per grammar rule, each reading
// tokens and returning a node. It covers the JavaScript, TypeScript and JSX
// that a React component typically uses, and rejects the rest by name.

const BINARY_PRECEDENCE: Record<string, number> = {
  "??": 1, "||": 2, "&&": 3, "|": 4, "^": 5, "&": 6,
  "==": 7, "!=": 7, "===": 7, "!==": 7,
  "<": 8, ">": 8, "<=": 8, ">=": 8, instanceof: 8, in: 8, as: 8, satisfies: 8,
  "<<": 9, ">>": 9, ">>>": 9,
  "+": 10, "-": 10, "*": 11, "/": 11, "%": 11, "**": 12,
};
const LOGICAL = new Set(["??", "||", "&&"]);
const ASSIGNMENT = new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??="]);
const TYPE_KEYWORDS = new Set(["string", "number", "boolean", "any", "unknown", "void", "never", "null", "undefined", "object", "bigint", "symbol"]);

const OUTSIDE_SUBSET: Record<string, string> = {
  enum: "enum is outside this compiler's subset: it needs generated code (see topic 02)",
  namespace: "namespace is outside this compiler's subset (see topic 02)",
  module: "module declarations are outside this compiler's subset",
  declare: "declare is outside this compiler's subset",
  class: "classes are outside this compiler's subset",
  abstract: "classes are outside this compiler's subset",
  function: "function expressions are outside this compiler's subset; use an arrow function",
  switch: "switch is outside this compiler's subset",
  while: "while loops are outside this compiler's subset",
  do: "do-while loops are outside this compiler's subset",
  try: "try/catch is outside this compiler's subset",
};

type State = { pos: number; tok: Token; lastEnd: number };

export class Parser {
  readonly scanner: Scanner;
  private tok: Token;
  /** End offset of the last token consumed, for node `end`s. */
  private lastEnd: number;

  constructor(
    readonly source: string,
    offset = 0,
    scanner?: Scanner,
  ) {
    this.scanner = scanner ?? new Scanner(source);
    this.scanner.pos = offset;
    this.lastEnd = offset;
    this.tok = this.scanner.scan();
  }

  // ---- token helpers

  private next(mode: ScanMode = "normal") {
    this.lastEnd = this.tok.end;
    this.tok = this.scanner.scan(mode);
  }

  private is(text: string) {
    return this.tok.text === text && this.tok.kind !== "string" && this.tok.kind !== "template" && this.tok.kind !== "jsxText";
  }

  /** The current token's kind, read through a call so TypeScript doesn't keep an earlier narrowing. */
  private kind() {
    return this.tok.kind;
  }

  private isIdentifierLike() {
    return this.tok.kind === "identifier" || this.tok.kind === "keyword" || this.tok.kind === "jsxIdentifier";
  }

  private eat(text: string, mode: ScanMode = "normal") {
    if (!this.is(text)) this.fail(`Expected "${text}"`);
    const token = this.tok;
    this.next(mode);
    return token;
  }

  private optional(text: string) {
    if (!this.is(text)) return false;
    this.next();
    return true;
  }

  private fail(message: string, token = this.tok): never {
    const found = token.kind === "eof" ? "the end of the input" : `"${token.text}"`;
    throw new CompileError(`${message}, found ${found}`, token.start);
  }

  private save(): State {
    return { pos: this.scanner.pos, tok: this.tok, lastEnd: this.lastEnd };
  }

  private restore(state: State) {
    this.scanner.rewind(state.pos);
    this.tok = state.tok;
    this.lastEnd = state.lastEnd;
    if (this.tok.kind !== "eof") this.scanner.recorded.set(this.tok.start, this.tok);
  }

  private semicolon() {
    this.optional(";");
  }

  private end() {
    return this.lastEnd;
  }

  private outsideSubset(word: string): never {
    throw new CompileError(OUTSIDE_SUBSET[word] ?? `${word} is outside this compiler's subset`, this.tok.start);
  }

  // ---- program and statements

  parseProgram(): Program {
    const body: Statement[] = [];
    while (this.tok.kind !== "eof") body.push(this.parseStatement());
    return { type: "Program", start: 0, end: this.source.length, body };
  }

  private parseStatement(): Statement {
    const t = this.tok;
    const start = t.start;
    if (t.kind === "keyword" || t.kind === "identifier") {
      switch (t.text) {
        case "import": {
          const state = this.save();
          this.next();
          const dynamic = this.is("(");
          this.restore(state);
          if (!dynamic) return this.parseImport();
          break;
        }
        case "export":
          return this.parseExport();
        case "function":
          return this.parseFunction(false, start);
        case "async": {
          const state = this.save();
          this.next();
          if (this.is("function") && !this.tok.lineBreakBefore) {
            this.next();
            return this.parseFunctionRest(true, start);
          }
          this.restore(state);
          break;
        }
        case "const":
        case "let":
        case "var": {
          const state = this.save();
          this.next();
          if (this.is("enum")) this.outsideSubset("enum");
          this.restore(state);
          const declaration = this.parseVariableDeclaration();
          this.semicolon();
          return { ...declaration, end: this.end() };
        }
        case "type":
        case "interface": {
          const state = this.save();
          this.next();
          const declares = this.tok.kind === "identifier" && !this.tok.lineBreakBefore;
          this.restore(state);
          if (declares) return t.text === "type" ? this.parseTypeAlias(start) : this.parseInterface(start);
          break;
        }
        case "return": {
          this.next();
          const argument = this.is(";") || this.is("}") || this.tok.kind === "eof" || this.tok.lineBreakBefore ? null : this.parseExpression();
          this.semicolon();
          return { type: "ReturnStatement", start, end: this.end(), argument };
        }
        case "throw": {
          this.next();
          const argument = this.parseExpression();
          this.semicolon();
          return { type: "ThrowStatement", start, end: this.end(), argument };
        }
        case "if":
          return this.parseIf();
        case "for":
          return this.parseForOf();
        default:
          if (t.text in OUTSIDE_SUBSET && t.kind === "keyword") this.outsideSubset(t.text);
          if (t.text in OUTSIDE_SUBSET && t.kind === "identifier") {
            const state = this.save();
            this.next();
            const declares = this.tok.kind === "identifier" && !this.tok.lineBreakBefore;
            this.restore(state);
            if (declares) this.outsideSubset(t.text);
          }
      }
    }
    if (this.is("{")) return this.parseBlock();
    if (this.is(";")) {
      this.next();
      return { type: "EmptyStatement", start, end: this.end() };
    }
    const expression = this.parseExpression();
    this.semicolon();
    return { type: "ExpressionStatement", start, end: this.end(), expression };
  }

  private parseBlock(): BlockStatement {
    const start = this.eat("{").start;
    const body: Statement[] = [];
    while (!this.is("}")) {
      if (this.tok.kind === "eof") this.fail('Expected "}"');
      body.push(this.parseStatement());
    }
    this.eat("}");
    return { type: "BlockStatement", start, end: this.end(), body };
  }

  private parseIf(): Statement {
    const start = this.eat("if").start;
    this.eat("(");
    const test = this.parseExpression();
    this.eat(")");
    const consequent = this.parseStatement();
    const alternate = this.optional("else") ? this.parseStatement() : null;
    return { type: "IfStatement", start, end: this.end(), test, consequent, alternate };
  }

  private parseForOf(): Statement {
    const start = this.eat("for").start;
    this.eat("(");
    if (!this.is("const") && !this.is("let")) this.fail("Only for (const … of …) loops are in this compiler's subset");
    const kind = this.tok.text as "const" | "let";
    const declStart = this.tok.start;
    this.next();
    const id = this.parseBindingTarget();
    const left: VariableDeclaration = { type: "VariableDeclaration", start: declStart, end: this.end(), kind, declarations: [{ type: "VariableDeclarator", start: id.start, end: id.end, id, init: null }] };
    if (!this.is("of")) this.fail('Only for (const … of …) loops are in this compiler\'s subset; expected "of"');
    this.next();
    const right = this.parseAssignment();
    this.eat(")");
    const body = this.parseStatement();
    return { type: "ForOfStatement", start, end: this.end(), left, right, body };
  }

  private parseVariableDeclaration(): VariableDeclaration {
    const start = this.tok.start;
    const kind = this.tok.text as "const" | "let" | "var";
    this.next();
    const declarations = [];
    do {
      const id = this.parseBindingTarget();
      const init = this.optional("=") ? this.parseAssignment() : null;
      declarations.push({ type: "VariableDeclarator" as const, start: id.start, end: this.end(), id, init });
    } while (this.optional(","));
    return { type: "VariableDeclaration", start, end: this.end(), kind, declarations };
  }

  private parseFunction(isAsync: boolean, start: number): FunctionDeclaration {
    this.eat("function");
    return this.parseFunctionRest(isAsync, start);
  }

  private parseFunctionRest(isAsync: boolean, start: number): FunctionDeclaration {
    if (this.is("*")) this.fail("Generator functions are outside this compiler's subset");
    const id = this.isIdentifierLike() && !this.is("(") ? this.parseIdentifier() : null;
    const typeParameters = this.is("<") ? this.parseTypeParameters() : null;
    const params = this.parseParams();
    const returnType = this.is(":") ? this.parseTypeAnnotation() : null;
    const body = this.parseBlock();
    return { type: "FunctionDeclaration", start, end: this.end(), id, params, body, async: isAsync, returnType, typeParameters };
  }

  private parseParams(): Pattern[] {
    this.eat("(");
    const params: Pattern[] = [];
    while (!this.is(")")) {
      // `this: Window` declares the type of `this` and is erased.
      if (this.is("this")) {
        this.next();
        this.parseTypeAnnotation();
      } else params.push(this.parseBindingElement(true));
      if (!this.is(")")) this.eat(",");
    }
    this.eat(")");
    return params;
  }

  // ---- imports and exports

  private parseImport(): Statement {
    const start = this.eat("import").start;
    let importKind: "value" | "type" = "value";
    if (this.is("type")) {
      const state = this.save();
      this.next();
      if ((this.isIdentifierLike() && !this.is("from")) || this.is("{") || this.is("*")) importKind = "type";
      else this.restore(state);
    }
    const specifiers: ImportSpecifier[] = [];
    if (this.tok.kind === "string") {
      const source = this.parseStringLiteral();
      this.semicolon();
      return { type: "ImportDeclaration", start, end: this.end(), specifiers, source, importKind };
    }
    if (this.isIdentifierLike() && !this.is("{")) {
      const local = this.parseIdentifier();
      specifiers.push({ type: "ImportDefaultSpecifier", start: local.start, end: local.end, local });
      this.optional(",");
    }
    if (this.is("*")) {
      const s = this.tok.start;
      this.next();
      this.eat("as");
      const local = this.parseIdentifier();
      specifiers.push({ type: "ImportNamespaceSpecifier", start: s, end: local.end, local });
    } else if (this.is("{")) {
      this.next();
      while (!this.is("}")) {
        const s = this.tok.start;
        let kind: "value" | "type" = "value";
        if (this.is("type")) {
          const state = this.save();
          this.next();
          if (this.isIdentifierLike() && !this.is("as")) kind = "type";
          else this.restore(state);
        }
        const imported = this.parseIdentifier(true);
        const local = this.optional("as") ? this.parseIdentifier() : imported;
        specifiers.push({ type: "ImportSpecifier", start: s, end: this.end(), imported, local, importKind: kind });
        if (!this.is("}")) this.eat(",");
      }
      this.eat("}");
    }
    if (!this.is("from")) this.fail('Expected "from"');
    this.next();
    const source = this.parseStringLiteral();
    this.semicolon();
    return { type: "ImportDeclaration", start, end: this.end(), specifiers, source, importKind };
  }

  private parseExport(): Statement {
    const start = this.eat("export").start;
    if (this.optional("default")) {
      if (this.is("function")) return { type: "ExportDefaultDeclaration", start, end: this.end(), declaration: this.parseFunctionWithEnd(false) };
      if (this.is("async")) {
        const state = this.save();
        this.next();
        if (this.is("function")) {
          const fn = this.parseFunction(true, state.tok.start);
          return { type: "ExportDefaultDeclaration", start, end: this.end(), declaration: fn };
        }
        this.restore(state);
      }
      const declaration = this.parseAssignment();
      this.semicolon();
      return { type: "ExportDefaultDeclaration", start, end: this.end(), declaration };
    }
    if (this.is("*")) {
      this.next();
      if (this.is("as")) this.fail("export * as is outside this compiler's subset");
      if (!this.is("from")) this.fail('Expected "from"');
      this.next();
      const source = this.parseStringLiteral();
      this.semicolon();
      return { type: "ExportAllDeclaration", start, end: this.end(), source };
    }
    let exportKind: "value" | "type" = "value";
    if (this.is("type")) {
      const state = this.save();
      this.next();
      if (this.is("{")) exportKind = "type";
      else this.restore(state);
    }
    if (this.is("{")) {
      this.next();
      const specifiers: ExportSpecifier[] = [];
      while (!this.is("}")) {
        const s = this.tok.start;
        let kind: "value" | "type" = "value";
        if (this.is("type")) {
          const state = this.save();
          this.next();
          if (this.isIdentifierLike() && !this.is("as")) kind = "type";
          else this.restore(state);
        }
        const local = this.parseIdentifier(true);
        const exported = this.optional("as") ? this.parseIdentifier(true) : local;
        specifiers.push({ type: "ExportSpecifier", start: s, end: this.end(), local, exported, exportKind: kind });
        if (!this.is("}")) this.eat(",");
      }
      this.eat("}");
      let source: StringLiteral | null = null;
      if (this.is("from")) {
        this.next();
        source = this.parseStringLiteral();
      }
      this.semicolon();
      return { type: "ExportNamedDeclaration", start, end: this.end(), declaration: null, specifiers, source, exportKind };
    }
    const declaration = this.parseStatement();
    const allowed = ["FunctionDeclaration", "VariableDeclaration", "TSTypeAliasDeclaration", "TSInterfaceDeclaration"];
    if (!allowed.includes(declaration.type)) throw new CompileError("Expected a declaration after export", declaration.start);
    return { type: "ExportNamedDeclaration", start, end: this.end(), declaration, specifiers: [], source: null, exportKind };
  }

  private parseFunctionWithEnd(isAsync: boolean): FunctionDeclaration {
    return this.parseFunction(isAsync, this.tok.start);
  }

  // ---- TypeScript declarations and types

  private parseTypeAlias(start: number): Statement {
    this.next();
    const id = this.parseIdentifier();
    const typeParameters = this.is("<") ? this.parseTypeParameters() : null;
    this.eat("=");
    const typeAnnotation = this.parseType();
    this.semicolon();
    return { type: "TSTypeAliasDeclaration", start, end: this.end(), id, typeParameters, typeAnnotation };
  }

  private parseInterface(start: number): Statement {
    this.next();
    const id = this.parseIdentifier();
    const typeParameters = this.is("<") ? this.parseTypeParameters() : null;
    const heritage: TSType[] = [];
    if (this.optional("extends")) {
      do heritage.push(this.parseTypeReference());
      while (this.optional(","));
    }
    const members = this.parseTypeMembers();
    return { type: "TSInterfaceDeclaration", start, end: this.end(), id, typeParameters, extends: heritage, members };
  }

  private parseTypeParameters(): TSTypeParameterDeclaration {
    const start = this.eat("<").start;
    const params = [];
    while (!this.is(">")) {
      const s = this.tok.start;
      const name = this.parseIdentifier().name;
      const constraint = this.optional("extends") ? this.parseType() : null;
      const def = this.optional("=") ? this.parseType() : null;
      params.push({ type: "TSTypeParameter" as const, start: s, end: this.end(), name, constraint, default: def });
      if (!this.is(">")) this.eat(",");
    }
    this.eat(">");
    return { type: "TSTypeParameterDeclaration", start, end: this.end(), params };
  }

  private parseTypeAnnotation(): TSTypeAnnotation {
    const start = this.eat(":").start;
    const typeAnnotation = this.parseType();
    return { type: "TSTypeAnnotation", start, end: this.end(), typeAnnotation };
  }

  parseType(): TSType {
    const start = this.tok.start;
    this.optional("|");
    const first = this.parseIntersectionType();
    if (!this.is("|")) return first;
    const types = [first];
    while (this.optional("|")) types.push(this.parseIntersectionType());
    return { type: "TSUnionType", start, end: this.end(), types };
  }

  private parseIntersectionType(): TSType {
    const start = this.tok.start;
    this.optional("&");
    const first = this.parsePostfixType();
    if (!this.is("&")) return first;
    const types = [first];
    while (this.optional("&")) types.push(this.parsePostfixType());
    return { type: "TSIntersectionType", start, end: this.end(), types };
  }

  private parsePostfixType(): TSType {
    const start = this.tok.start;
    let type = this.parsePrimaryType();
    while (this.is("[") && !this.tok.lineBreakBefore) {
      this.next();
      if (this.optional("]")) type = { type: "TSArrayType", start, end: this.end(), elementType: type };
      else {
        const indexType = this.parseType();
        this.eat("]");
        type = { type: "TSIndexedAccessType", start, end: this.end(), objectType: type, indexType };
      }
    }
    return type;
  }

  private parsePrimaryType(): TSType {
    const t = this.tok;
    const start = t.start;
    if (this.is("keyof") || this.is("readonly") || this.is("unique")) {
      this.next();
      return { type: "TSTypeOperator", start, end: this.end(), operator: t.text, typeAnnotation: this.parsePostfixType() };
    }
    if (this.is("typeof")) {
      this.next();
      let name = this.parseIdentifier(true).name;
      while (this.optional(".")) name += "." + this.parseIdentifier(true).name;
      return { type: "TSTypeQuery", start, end: this.end(), exprName: name };
    }
    if (this.is("{")) return { type: "TSTypeLiteral", start, end: this.end(), members: this.parseTypeMembers() };
    if (this.is("[")) {
      this.next();
      const elementTypes: TSType[] = [];
      while (!this.is("]")) {
        elementTypes.push(this.parseType());
        if (!this.is("]")) this.eat(",");
      }
      this.eat("]");
      return { type: "TSTupleType", start, end: this.end(), elementTypes };
    }
    if (this.is("(")) {
      const fn = this.tryParse(() => this.parseFunctionType());
      if (fn) return fn;
      this.next();
      const typeAnnotation = this.parseType();
      this.eat(")");
      return { type: "TSParenthesizedType", start, end: this.end(), typeAnnotation };
    }
    if (t.kind === "string" || t.kind === "number" || this.is("true") || this.is("false") || this.is("-")) {
      if (this.is("-")) this.next();
      this.next();
      return { type: "TSLiteralType", start, end: this.end(), raw: this.source.slice(start, this.end()) };
    }
    if (t.kind === "template") {
      this.next();
      return { type: "TSLiteralType", start, end: this.end(), raw: t.text };
    }
    if (this.is("this")) {
      this.next();
      return { type: "TSTypeReference", start, end: this.end(), typeName: "this", typeArguments: [] };
    }
    if ((t.kind === "identifier" || t.kind === "keyword") && TYPE_KEYWORDS.has(t.text)) {
      this.next();
      return { type: "TSKeywordType", start, end: this.end(), keyword: t.text };
    }
    if (t.kind === "identifier" || t.kind === "keyword") return this.parseTypeReference();
    this.fail("Expected a type");
  }

  private parseTypeReference(): TSType {
    const start = this.tok.start;
    let typeName = this.parseIdentifier(true).name;
    while (this.optional(".")) typeName += "." + this.parseIdentifier(true).name;
    const typeArguments = this.is("<") && !this.tok.lineBreakBefore ? this.parseTypeArguments() : [];
    return { type: "TSTypeReference", start, end: this.end(), typeName, typeArguments };
  }

  private parseTypeArguments(): TSType[] {
    this.eat("<");
    const args: TSType[] = [];
    while (!this.is(">")) {
      args.push(this.parseType());
      if (!this.is(">")) this.eat(",");
    }
    this.eat(">");
    return args;
  }

  private parseFunctionType(): TSType {
    const start = this.tok.start;
    const params = this.parseParams();
    this.eat("=>");
    const returnType = this.parseType();
    return { type: "TSFunctionType", start, end: this.end(), params, returnType };
  }

  private parseTypeMembers(): TSPropertySignature[] {
    this.eat("{");
    const members: TSPropertySignature[] = [];
    while (!this.is("}")) {
      const start = this.tok.start;
      const readonly = this.is("readonly") && this.peekIsIdentifierLike();
      if (readonly) this.next();
      if (this.is("[")) this.fail("Index signatures are outside this compiler's subset");
      const key = this.tok.kind === "string" ? this.parseStringLiteral().raw : this.parseIdentifier(true).name;
      const optional = this.optional("?");
      let typeAnnotation: TSTypeAnnotation | null = null;
      if (this.is("(")) {
        // A method signature: store it as a property with a function type.
        const fnStart = this.tok.start;
        const params = this.parseParams();
        const annotation = this.parseTypeAnnotation();
        const fnType: TSType = { type: "TSFunctionType", start: fnStart, end: this.end(), params, returnType: annotation.typeAnnotation };
        typeAnnotation = { type: "TSTypeAnnotation", start: fnStart, end: this.end(), typeAnnotation: fnType };
      } else if (this.is(":")) typeAnnotation = this.parseTypeAnnotation();
      members.push({ type: "TSPropertySignature", start, end: this.end(), key, optional, readonly, typeAnnotation });
      if (!this.optional(";")) this.optional(",");
    }
    this.eat("}");
    return members;
  }

  private peekIsIdentifierLike() {
    const state = this.save();
    this.next();
    const result = this.isIdentifierLike() || this.tok.kind === "string";
    this.restore(state);
    return result;
  }

  private tryParse<T>(fn: () => T): T | null {
    const state = this.save();
    try {
      return fn();
    } catch (error) {
      if (!(error instanceof CompileError)) throw error;
      this.restore(state);
      return null;
    }
  }

  // ---- patterns

  private parseBindingTarget(): Pattern {
    const start = this.tok.start;
    if (this.is("{") || this.is("[")) {
      const pattern = this.is("{") ? this.parseObjectPattern() : this.parseArrayPattern();
      if (this.is(":")) return { ...pattern, typeAnnotation: this.parseTypeAnnotation(), end: this.end() } as Pattern;
      return pattern;
    }
    const id = this.parseIdentifier();
    if (this.is(":")) return { ...id, typeAnnotation: this.parseTypeAnnotation(), start, end: this.end() };
    return id;
  }

  /** A parameter or destructured element: target, `?`, type, default. */
  private parseBindingElement(param: boolean): Pattern {
    const start = this.tok.start;
    if (this.is("...")) {
      this.next();
      const argument = this.parseBindingTarget();
      return { type: "RestElement", start, end: this.end(), argument } satisfies RestElement;
    }
    let target: Pattern;
    if (this.is("{") || this.is("[")) target = this.is("{") ? this.parseObjectPattern() : this.parseArrayPattern();
    else target = this.parseIdentifier();
    if (param && this.is("?") && target.type === "Identifier") {
      this.next();
      target = { ...target, optional: true };
    }
    if (this.is(":")) target = { ...target, typeAnnotation: this.parseTypeAnnotation(), end: this.end() } as Pattern;
    if (this.optional("=")) return { type: "AssignmentPattern", start, end: this.end(), left: target, right: this.parseAssignment() };
    return target;
  }

  private parseObjectPattern(): Pattern {
    const start = this.eat("{").start;
    const properties: (ObjectPatternProperty | RestElement)[] = [];
    while (!this.is("}")) {
      const s = this.tok.start;
      if (this.is("...")) {
        this.next();
        properties.push({ type: "RestElement", start: s, end: this.end(), argument: this.parseIdentifier() });
      } else {
        const key = this.tok.kind === "string" ? this.parseStringLiteral() : this.parseIdentifier(true);
        let value: Pattern;
        let shorthand = false;
        if (this.optional(":")) value = this.parseBindingElement(false);
        else {
          if (key.type !== "Identifier") this.fail('Expected ":"');
          shorthand = true;
          value = this.optional("=") ? { type: "AssignmentPattern", start: s, end: this.end(), left: key, right: this.parseAssignment() } : key;
        }
        properties.push({ type: "ObjectProperty", start: s, end: this.end(), key, value, shorthand });
      }
      if (!this.is("}")) this.eat(",");
    }
    this.eat("}");
    return { type: "ObjectPattern", start, end: this.end(), properties };
  }

  private parseArrayPattern(): Pattern {
    const start = this.eat("[").start;
    const elements: (Pattern | null)[] = [];
    while (!this.is("]")) {
      if (this.is(",")) {
        this.next();
        elements.push(null);
        continue;
      }
      elements.push(this.parseBindingElement(false));
      if (!this.is("]")) this.eat(",");
    }
    this.eat("]");
    return { type: "ArrayPattern", start, end: this.end(), elements };
  }

  // ---- expressions

  parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const arrow = this.tryParseArrow();
    if (arrow) return arrow;
    const start = this.tok.start;
    const left = this.parseConditional();
    if (this.is(">")) this.tok = this.scanner.rescanGreater(this.tok);
    if (this.tok.kind === "punctuator" && ASSIGNMENT.has(this.tok.text)) {
      const operator = this.tok.text;
      this.next();
      const right = this.parseAssignment();
      return { type: "AssignmentExpression", start, end: this.end(), operator, left, right };
    }
    return left;
  }

  private tryParseArrow(): ArrowFunctionExpression | null {
    const start = this.tok.start;
    let isAsync = false;
    const state = this.save();
    if (this.is("async")) {
      this.next();
      if ((this.is("(") || this.tok.kind === "identifier") && !this.tok.lineBreakBefore) isAsync = true;
      else {
        this.restore(state);
        return null;
      }
    }
    if (this.is("<")) {
      // `<T,>(x: T) => x`: generic arrows are rare in .tsx files.
      this.restore(state);
      return null;
    }
    let params: Pattern[];
    let returnType: TSTypeAnnotation | null = null;
    let bareParam = false;
    if (this.tok.kind === "identifier" || (this.tok.kind === "keyword" && !["this", "true", "false", "null", "new", "typeof", "void", "await", "function", "import"].includes(this.tok.text))) {
      const id = this.parseIdentifier();
      if (!this.is("=>") || this.tok.lineBreakBefore) {
        this.restore(state);
        return null;
      }
      params = [id];
      bareParam = true;
    } else if (this.is("(")) {
      const head = this.tryParse(() => {
        const ps = this.parseParams();
        const rt = this.is(":") ? this.parseTypeAnnotation() : null;
        if (!this.is("=>")) this.fail('Expected "=>"');
        return { ps, rt };
      });
      if (!head) {
        this.restore(state);
        return null;
      }
      params = head.ps;
      returnType = head.rt;
    } else {
      this.restore(state);
      return null;
    }
    this.eat("=>");
    const body = this.is("{") ? this.parseBlock() : this.parseAssignment();
    return { type: "ArrowFunctionExpression", start, end: this.end(), params, body, async: isAsync, returnType, typeParameters: null, bareParam };
  }

  private parseConditional(): Expression {
    const start = this.tok.start;
    const test = this.parseBinary(0);
    if (!this.is("?")) return test;
    this.next();
    const consequent = this.parseAssignment();
    this.eat(":");
    const alternate = this.parseAssignment();
    return { type: "ConditionalExpression", start, end: this.end(), test, consequent, alternate };
  }

  private binaryOperator(): string | null {
    if (this.is(">")) this.tok = this.scanner.rescanGreater(this.tok);
    const t = this.tok;
    if (t.kind === "punctuator" && t.text in BINARY_PRECEDENCE) return t.text;
    if ((t.kind === "keyword" || t.kind === "identifier") && ["instanceof", "in", "as", "satisfies"].includes(t.text)) {
      if ((t.text === "as" || t.text === "satisfies") && t.lineBreakBefore) return null;
      return t.text;
    }
    return null;
  }

  private parseBinary(minPrecedence: number): Expression {
    const start = this.tok.start;
    let left = this.parseUnary();
    for (;;) {
      const operator = this.binaryOperator();
      if (!operator) return left;
      const precedence = BINARY_PRECEDENCE[operator];
      if (precedence <= minPrecedence) return left;
      this.next();
      if (operator === "as" || operator === "satisfies") {
        if (operator === "as" && this.is("const")) {
          const s = this.tok.start;
          this.next();
          left = { type: "TSAsExpression", start, end: this.end(), expression: left, typeAnnotation: { type: "TSTypeReference", start: s, end: this.end(), typeName: "const", typeArguments: [] } };
        } else {
          const typeAnnotation = this.parseType();
          left = operator === "as" ? { type: "TSAsExpression", start, end: this.end(), expression: left, typeAnnotation } : { type: "TSSatisfiesExpression", start, end: this.end(), expression: left, typeAnnotation };
        }
        continue;
      }
      // `**` is right-associative.
      const right = this.parseBinary(operator === "**" ? precedence - 1 : precedence);
      left = LOGICAL.has(operator) ? { type: "LogicalExpression", start, end: this.end(), operator, left, right } : { type: "BinaryExpression", start, end: this.end(), operator, left, right };
    }
  }

  private parseUnary(): Expression {
    const t = this.tok;
    const start = t.start;
    if (t.kind === "punctuator" && ["!", "~", "+", "-"].includes(t.text)) {
      this.next();
      return { type: "UnaryExpression", start, end: this.end(), operator: t.text, argument: this.parseUnary() };
    }
    if (t.kind === "keyword" && ["typeof", "void", "delete"].includes(t.text)) {
      this.next();
      return { type: "UnaryExpression", start, end: this.end(), operator: t.text, argument: this.parseUnary() };
    }
    if (this.is("await")) {
      this.next();
      return { type: "AwaitExpression", start, end: this.end(), argument: this.parseUnary() };
    }
    if (this.is("++") || this.is("--")) {
      this.next();
      return { type: "UpdateExpression", start, end: this.end(), operator: t.text, prefix: true, argument: this.parseUnary() };
    }
    const expression = this.parseLeftHandSide();
    if ((this.is("++") || this.is("--")) && !this.tok.lineBreakBefore) {
      const operator = this.tok.text;
      this.next();
      return { type: "UpdateExpression", start, end: this.end(), operator, prefix: false, argument: expression };
    }
    return expression;
  }

  private parseArguments(): (Expression | SpreadElement)[] {
    this.eat("(");
    const args: (Expression | SpreadElement)[] = [];
    while (!this.is(")")) {
      args.push(this.parseSpreadOrExpression());
      if (!this.is(")")) this.eat(",");
    }
    this.eat(")");
    return args;
  }

  private parseSpreadOrExpression(): Expression | SpreadElement {
    if (!this.is("...")) return this.parseAssignment();
    const start = this.tok.start;
    this.next();
    return { type: "SpreadElement", start, end: this.end(), argument: this.parseAssignment() };
  }

  private parseLeftHandSide(): Expression {
    const start = this.tok.start;
    let expression: Expression;
    if (this.is("new")) {
      this.next();
      let callee = this.parsePrimary();
      while (this.is(".")) {
        this.next();
        const property = this.parseIdentifier(true);
        callee = { type: "MemberExpression", start, end: this.end(), object: callee, property, computed: false, optional: false };
      }
      // `new Map<string, number>()`: type arguments, erased like any other type.
      if (this.is("<")) this.tryParse(() => this.parseTypeArguments());
      const args = this.is("(") ? this.parseArguments() : [];
      expression = { type: "NewExpression", start, end: this.end(), callee, arguments: args };
    } else expression = this.parsePrimary();

    for (;;) {
      if (this.is(".")) {
        this.next();
        if (this.is("#")) this.fail("Private names are outside this compiler's subset");
        const property = this.parseIdentifier(true);
        expression = { type: "MemberExpression", start, end: this.end(), object: expression, property, computed: false, optional: false };
      } else if (this.is("?.")) {
        this.next();
        if (this.is("(")) expression = { type: "CallExpression", start, end: this.end(), callee: expression, arguments: this.parseArguments(), optional: true, typeArguments: null };
        else if (this.is("[")) {
          this.next();
          const property = this.parseExpression();
          this.eat("]");
          expression = { type: "MemberExpression", start, end: this.end(), object: expression, property, computed: true, optional: true };
        } else {
          const property = this.parseIdentifier(true);
          expression = { type: "MemberExpression", start, end: this.end(), object: expression, property, computed: false, optional: true };
        }
      } else if (this.is("[") ) {
        this.next();
        const property = this.parseExpression();
        this.eat("]");
        expression = { type: "MemberExpression", start, end: this.end(), object: expression, property, computed: true, optional: false };
      } else if (this.is("(")) {
        expression = { type: "CallExpression", start, end: this.end(), callee: expression, arguments: this.parseArguments(), optional: false, typeArguments: null };
        expression.end = this.end();
      } else if (this.is("!") && !this.tok.lineBreakBefore) {
        this.next();
        expression = { type: "TSNonNullExpression", start, end: this.end(), expression };
      } else if (this.is("<") && !this.tok.lineBreakBefore) {
        // `useState<number>(0)`: type arguments, if a call follows; otherwise `<` is less-than.
        const typeArguments = this.tryParse(() => {
          const args = this.parseTypeArguments();
          if (!this.is("(")) this.fail('Expected "("');
          return args;
        });
        if (!typeArguments) return expression;
        expression = { type: "CallExpression", start, end: this.end(), callee: expression, arguments: this.parseArguments(), optional: false, typeArguments };
        expression.end = this.end();
      } else if (this.tok.kind === "template" && !this.tok.lineBreakBefore) {
        this.fail("Tagged templates are outside this compiler's subset");
      } else return expression;
    }
  }

  private parsePrimary(): Expression {
    const t = this.tok;
    const start = t.start;
    switch (t.kind) {
      case "number":
        this.next();
        return { type: "NumericLiteral", start, end: this.end(), raw: t.text };
      case "string":
        return this.parseStringLiteral();
      case "template":
        return this.parseTemplate();
      case "identifier":
        return this.parseIdentifier();
      case "keyword":
        switch (t.text) {
          case "true":
          case "false":
            this.next();
            return { type: "BooleanLiteral", start, end: this.end(), value: t.text === "true" };
          case "null":
            this.next();
            return { type: "NullLiteral", start, end: this.end() };
          case "this":
            this.next();
            return { type: "ThisExpression", start, end: this.end() };
          case "import": {
            this.next();
            const args = this.parseArguments();
            if (args.length !== 1 || args[0].type === "SpreadElement") throw new CompileError("import() takes one argument", start);
            return { type: "ImportExpression", start, end: this.end(), source: args[0] };
          }
          default:
            if (t.text in OUTSIDE_SUBSET) this.outsideSubset(t.text);
            // Contextual keywords (type, as, of, from, async…) are ordinary names here.
            if (!["in", "instanceof", "else", "return", "const", "let", "var", "export", "extends", "case", "default"].includes(t.text)) return this.parseIdentifier();
        }
        break;
      case "punctuator":
        if (t.text === "(") {
          this.next();
          const expression = this.parseExpression();
          this.eat(")");
          return { type: "ParenthesizedExpression", start, end: this.end(), expression };
        }
        if (t.text === "[") return this.parseArray();
        if (t.text === "{") return this.parseObject();
        if (t.text === "<") return this.parseJsx();
        if (t.text === "/" || t.text === "/=") {
          const regex = this.scanner.rescanRegex(t);
          this.next();
          return { type: "RegExpLiteral", start, end: this.end(), raw: regex.text };
        }
    }
    this.fail("Expected an expression");
  }

  private parseIdentifier(allowKeywords = false): Identifier {
    const t = this.tok;
    if (t.kind !== "identifier" && !(t.kind === "keyword" || t.kind === "jsxIdentifier")) this.fail("Expected a name");
    if (t.kind === "keyword" && !allowKeywords && ["if", "else", "return", "const", "let", "var", "function", "export", "import", "new", "true", "false", "null", "this"].includes(t.text)) this.fail("Expected a name");
    this.next();
    return { type: "Identifier", start: t.start, end: t.end, name: t.text };
  }

  private parseStringLiteral(): StringLiteral {
    const t = this.tok;
    if (t.kind !== "string") this.fail("Expected a string");
    this.next();
    return { type: "StringLiteral", start: t.start, end: t.end, raw: t.text, value: unquote(t.text) };
  }

  private parseTemplate(): Expression {
    const t = this.tok;
    const quasis: string[] = [];
    const expressions: Expression[] = [];
    const s = this.source;
    let i = t.start + 1;
    let chunk = i;
    while (i < t.end - 1) {
      if (s[i] === "\\") i += 2;
      else if (s.startsWith("${", i)) {
        quasis.push(s.slice(chunk, i));
        const close = templateExpressionEnd(s, i + 2);
        const inner = new Parser(s.slice(0, close), i + 2, new Scanner(s.slice(0, close)));
        const expression = inner.parseExpression();
        if (inner.tok.kind !== "eof") inner.fail('Expected "}"');
        for (const [k, token] of inner.scanner.recorded) this.scanner.recorded.set(k, token);
        expressions.push(expression);
        i = close + 1;
        chunk = i;
      } else i++;
    }
    quasis.push(s.slice(chunk, t.end - 1));
    // The template's own token stays as one entry; its expressions' tokens were merged in.
    this.scanner.recorded.set(t.start, t);
    this.next();
    return { type: "TemplateLiteral", start: t.start, end: t.end, quasis, expressions };
  }

  private parseArray(): Expression {
    const start = this.eat("[").start;
    const elements: (Expression | SpreadElement | null)[] = [];
    while (!this.is("]")) {
      if (this.is(",")) {
        this.next();
        elements.push(null);
        continue;
      }
      elements.push(this.parseSpreadOrExpression());
      if (!this.is("]")) this.eat(",");
    }
    this.eat("]");
    return { type: "ArrayExpression", start, end: this.end(), elements };
  }

  private parseObject(): Expression {
    const start = this.eat("{").start;
    const properties: (ObjectProperty | SpreadElement)[] = [];
    while (!this.is("}")) {
      const s = this.tok.start;
      if (this.is("...")) {
        this.next();
        properties.push({ type: "SpreadElement", start: s, end: this.end(), argument: this.parseAssignment() });
      } else {
        let key: Expression;
        let computed = false;
        if (this.is("[")) {
          this.next();
          key = this.parseAssignment();
          this.eat("]");
          computed = true;
        } else if (this.tok.kind === "string") key = this.parseStringLiteral();
        else if (this.tok.kind === "number") {
          const n = this.tok;
          this.next();
          key = { type: "NumericLiteral", start: n.start, end: n.end, raw: n.text };
        } else key = this.parseIdentifier(true);
        if (this.is("(")) this.fail("Object methods are outside this compiler's subset; use an arrow function");
        if (this.optional(":")) properties.push({ type: "ObjectProperty", start: s, end: this.end(), key, value: this.parseAssignment(), shorthand: false, computed });
        else {
          if (key.type !== "Identifier" || computed) this.fail('Expected ":"');
          properties.push({ type: "ObjectProperty", start: s, end: this.end(), key, value: key, shorthand: true, computed: false });
        }
      }
      if (!this.is("}")) this.eat(",");
    }
    this.eat("}");
    return { type: "ObjectExpression", start, end: this.end(), properties };
  }

  // ---- JSX

  /** Current token is `<`. Parses an element or fragment; afterwards the next token is scanned normally. */
  private parseJsx(): JSXElement | JSXFragment {
    const node = this.parseJsxElementAt();
    this.next();
    return node;
  }

  /** Like parseJsx, but leaves the scanner right after the closing `>` (for children). */
  private parseJsxElementAt(): JSXElement | JSXFragment {
    const start = this.tok.start;
    this.next("jsxTag");
    if (this.is(">")) {
      const children = this.parseJsxChildren();
      this.next("jsxTag");
      this.expectJsx(">", "Expected </> to close the fragment");
      return { type: "JSXFragment", start, end: this.tok.end, children };
    }
    const name = this.parseJsxName();
    const attributes: JSXAttribute[] = [];
    while (!this.is(">") && !this.is("/")) {
      if (this.tok.kind === "eof") this.fail('Expected ">"');
      const s = this.tok.start;
      if (this.is("{")) {
        this.next();
        this.eat("...");
        const argument = this.parseAssignment();
        this.expectJsx("}", 'Expected "}"');
        this.next("jsxTag");
        attributes.push({ type: "JSXSpreadAttribute", start: s, end: this.end(), argument });
        continue;
      }
      if (this.tok.kind !== "jsxIdentifier") this.fail("Expected an attribute name");
      let attrName = this.tok.text;
      this.next("jsxTag");
      if (this.is(":")) {
        this.next("jsxTag");
        attrName += ":" + this.tok.text;
        this.next("jsxTag");
      }
      let value: Extract<JSXAttribute, { type: "JSXAttribute" }>["value"] = null;
      if (this.is("=")) {
        this.next("jsxTag");
        if (this.kind() === "string") {
          const t = this.tok;
          value = { type: "StringLiteral", start: t.start, end: t.end, raw: t.text, value: t.text.slice(1, -1) };
          this.next("jsxTag");
        } else if (this.is("{")) {
          const cs = this.tok.start;
          this.next();
          const expression = this.parseAssignment();
          this.expectJsx("}", 'Expected "}"');
          value = { type: "JSXExpressionContainer", start: cs, end: this.tok.end, expression };
          this.next("jsxTag");
        } else if (this.is("<")) {
          value = this.parseJsxElementAt() as JSXElement;
          this.next("jsxTag");
        } else this.fail("Expected an attribute value");
      }
      attributes.push({ type: "JSXAttribute", start: s, end: this.end(), name: attrName, value });
    }
    if (this.is("/")) {
      this.next("jsxTag");
      this.expectJsx(">", 'Expected ">"');
      return { type: "JSXElement", start, end: this.tok.end, name, attributes, selfClosing: true, children: [] };
    }
    const children = this.parseJsxChildren();
    // At `</`: read the closing name and check it matches.
    this.next("jsxTag");
    const closing = this.parseJsxName();
    if (jsxNameText(closing) !== jsxNameText(name)) throw new CompileError(`Expected </${jsxNameText(name)}> but found </${jsxNameText(closing)}>`, closing.start);
    this.expectJsx(">", 'Expected ">"');
    return { type: "JSXElement", start, end: this.tok.end, name, attributes, selfClosing: false, children };
  }

  private expectJsx(text: string, message: string) {
    if (!this.is(text)) this.fail(message);
  }

  /** Called with the current token being the `>` of an opening tag; stops at `</` (current token `/`). */
  private parseJsxChildren(): JSXChild[] {
    const children: JSXChild[] = [];
    for (;;) {
      this.next("jsxChild");
      const t = this.tok;
      if (t.kind === "eof") throw new CompileError("Unclosed JSX element", t.start);
      if (t.kind === "jsxText") {
        children.push({ type: "JSXText", start: t.start, end: t.end, raw: t.text });
        // Put the scanner back on the `{` or `<` that ended the text.
        this.scanner.pos = t.end;
        continue;
      }
      if (t.text === "{") {
        this.next();
        if (this.is("}")) {
          children.push({ type: "JSXExpressionContainer", start: t.start, end: this.tok.end, expression: null });
          continue;
        }
        const expression = this.is("...") ? this.fail("Spread children are outside this compiler's subset") : this.parseExpression();
        this.expectJsx("}", 'Expected "}"');
        children.push({ type: "JSXExpressionContainer", start: t.start, end: this.tok.end, expression });
        continue;
      }
      // `<`: a closing tag or a child element.
      const after = this.scanner.pos;
      const peek = this.scanner.scan("jsxTag");
      if (peek.text === "/") {
        this.tok = peek;
        return children;
      }
      this.scanner.rewind(after);
      this.tok = t;
      children.push(this.parseJsxElementAt());
    }
  }

  private parseJsxName(): JSXName {
    const t = this.tok;
    if (t.kind !== "jsxIdentifier") this.fail("Expected a tag name");
    this.next("jsxTag");
    let name: JSXName = { type: "JSXIdentifier", start: t.start, end: t.end, name: t.text };
    while (this.is(".")) {
      this.next("jsxTag");
      const p = this.tok;
      if (p.kind !== "jsxIdentifier") this.fail("Expected a name");
      this.next("jsxTag");
      name = { type: "JSXMemberExpression", start: t.start, end: p.end, object: name, property: p.text };
    }
    return name;
  }

  /** Current token, for callers that need to check the parser consumed everything. */
  get current() {
    return this.tok;
  }
}

export function jsxNameText(name: JSXName): string {
  return name.type === "JSXIdentifier" ? name.name : `${jsxNameText(name.object)}.${name.property}`;
}

function unquote(raw: string) {
  const body = raw.slice(1, -1);
  return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e: string) => {
    if (e[0] === "u") return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ""), 16));
    if (e[0] === "x") return String.fromCharCode(parseInt(e.slice(1), 16));
    return ({ n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" } as Record<string, string>)[e] ?? e;
  });
}
