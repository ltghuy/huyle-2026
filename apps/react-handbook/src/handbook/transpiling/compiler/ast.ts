// Node types of the teaching compiler: an ESTree-style subset of JavaScript,
// plus the TypeScript and JSX nodes it can parse. `start`/`end` are offsets
// into the source; nodes created by the transform carry the offset of the
// source node they replace, or -1 when they have no source (an added import).

export type TokenKind = "keyword" | "identifier" | "punctuator" | "number" | "string" | "template" | "regex" | "jsxText" | "jsxIdentifier" | "eof";

export type Token = { kind: TokenKind; text: string; start: number; end: number; lineBreakBefore: boolean };

type Base = { start: number; end: number };

// ---- Types (TypeScript only; removed by the transform)

export type TSType =
  | (Base & { type: "TSKeywordType"; keyword: string })
  | (Base & { type: "TSTypeReference"; typeName: string; typeArguments: TSType[] })
  | (Base & { type: "TSLiteralType"; raw: string })
  | (Base & { type: "TSUnionType"; types: TSType[] })
  | (Base & { type: "TSIntersectionType"; types: TSType[] })
  | (Base & { type: "TSArrayType"; elementType: TSType })
  | (Base & { type: "TSTupleType"; elementTypes: TSType[] })
  | (Base & { type: "TSTypeLiteral"; members: TSPropertySignature[] })
  | (Base & { type: "TSFunctionType"; params: Pattern[]; returnType: TSType })
  | (Base & { type: "TSTypeOperator"; operator: string; typeAnnotation: TSType })
  | (Base & { type: "TSIndexedAccessType"; objectType: TSType; indexType: TSType })
  | (Base & { type: "TSTypeQuery"; exprName: string })
  | (Base & { type: "TSParenthesizedType"; typeAnnotation: TSType });

export type TSPropertySignature = Base & { type: "TSPropertySignature"; key: string; optional: boolean; readonly: boolean; typeAnnotation: TSTypeAnnotation | null };

export type TSTypeAnnotation = Base & { type: "TSTypeAnnotation"; typeAnnotation: TSType };

export type TSTypeParameter = Base & { type: "TSTypeParameter"; name: string; constraint: TSType | null; default: TSType | null };

export type TSTypeParameterDeclaration = Base & { type: "TSTypeParameterDeclaration"; params: TSTypeParameter[] };

// ---- Patterns

export type Identifier = Base & { type: "Identifier"; name: string; typeAnnotation?: TSTypeAnnotation | null; optional?: boolean };

export type ObjectPatternProperty = Base & { type: "ObjectProperty"; key: Identifier | StringLiteral; value: Pattern; shorthand: boolean };

export type Pattern =
  | Identifier
  | (Base & { type: "ObjectPattern"; properties: (ObjectPatternProperty | RestElement)[]; typeAnnotation?: TSTypeAnnotation | null })
  | (Base & { type: "ArrayPattern"; elements: (Pattern | null)[]; typeAnnotation?: TSTypeAnnotation | null })
  | (Base & { type: "AssignmentPattern"; left: Pattern; right: Expression })
  | RestElement;

export type RestElement = Base & { type: "RestElement"; argument: Pattern; typeAnnotation?: TSTypeAnnotation | null };

// ---- Expressions

export type StringLiteral = Base & { type: "StringLiteral"; value: string; raw: string };

export type SpreadElement = Base & { type: "SpreadElement"; argument: Expression };

export type ObjectProperty = Base & { type: "ObjectProperty"; key: Expression; value: Expression; shorthand: boolean; computed: boolean };

export type ArrowFunctionExpression = Base & {
  type: "ArrowFunctionExpression";
  params: Pattern[];
  body: BlockStatement | Expression;
  async: boolean;
  returnType: TSTypeAnnotation | null;
  typeParameters: TSTypeParameterDeclaration | null;
  /** `x => x`, written without parentheses. */
  bareParam?: boolean;
};

export type Expression =
  | Identifier
  | StringLiteral
  | (Base & { type: "NumericLiteral"; raw: string })
  | (Base & { type: "BooleanLiteral"; value: boolean })
  | (Base & { type: "NullLiteral" })
  | (Base & { type: "RegExpLiteral"; raw: string })
  | (Base & { type: "TemplateLiteral"; quasis: string[]; expressions: Expression[] })
  | (Base & { type: "ThisExpression" })
  | (Base & { type: "ArrayExpression"; elements: (Expression | SpreadElement | null)[] })
  | (Base & { type: "ObjectExpression"; properties: (ObjectProperty | SpreadElement)[] })
  | ArrowFunctionExpression
  | (Base & { type: "CallExpression"; callee: Expression; arguments: (Expression | SpreadElement)[]; optional: boolean; typeArguments: TSType[] | null })
  | (Base & { type: "NewExpression"; callee: Expression; arguments: (Expression | SpreadElement)[] })
  | (Base & { type: "ImportExpression"; source: Expression })
  | (Base & { type: "MemberExpression"; object: Expression; property: Expression; computed: boolean; optional: boolean })
  | (Base & { type: "UnaryExpression"; operator: string; argument: Expression })
  | (Base & { type: "AwaitExpression"; argument: Expression })
  | (Base & { type: "UpdateExpression"; operator: string; prefix: boolean; argument: Expression })
  | (Base & { type: "BinaryExpression"; operator: string; left: Expression; right: Expression })
  | (Base & { type: "LogicalExpression"; operator: string; left: Expression; right: Expression })
  | (Base & { type: "AssignmentExpression"; operator: string; left: Expression | Pattern; right: Expression })
  | (Base & { type: "ConditionalExpression"; test: Expression; consequent: Expression; alternate: Expression })
  | (Base & { type: "ParenthesizedExpression"; expression: Expression })
  | (Base & { type: "TSAsExpression"; expression: Expression; typeAnnotation: TSType })
  | (Base & { type: "TSSatisfiesExpression"; expression: Expression; typeAnnotation: TSType })
  | (Base & { type: "TSNonNullExpression"; expression: Expression })
  | JSXElement
  | JSXFragment;

// ---- JSX

export type JSXName = (Base & { type: "JSXIdentifier"; name: string }) | (Base & { type: "JSXMemberExpression"; object: JSXName; property: string });

export type JSXAttribute =
  | (Base & { type: "JSXAttribute"; name: string; value: StringLiteral | JSXExpressionContainer | JSXElement | null })
  | (Base & { type: "JSXSpreadAttribute"; argument: Expression });

export type JSXExpressionContainer = Base & { type: "JSXExpressionContainer"; expression: Expression | null };

export type JSXText = Base & { type: "JSXText"; raw: string };

export type JSXChild = JSXText | JSXExpressionContainer | JSXElement | JSXFragment;

export type JSXElement = Base & { type: "JSXElement"; name: JSXName; attributes: JSXAttribute[]; selfClosing: boolean; children: JSXChild[] };

export type JSXFragment = Base & { type: "JSXFragment"; children: JSXChild[] };

// ---- Statements

export type BlockStatement = Base & { type: "BlockStatement"; body: Statement[] };

export type ImportSpecifier =
  | (Base & { type: "ImportDefaultSpecifier"; local: Identifier })
  | (Base & { type: "ImportNamespaceSpecifier"; local: Identifier })
  | (Base & { type: "ImportSpecifier"; imported: Identifier; local: Identifier; importKind: "value" | "type" });

export type ExportSpecifier = Base & { type: "ExportSpecifier"; local: Identifier; exported: Identifier; exportKind: "value" | "type" };

export type FunctionDeclaration = Base & {
  type: "FunctionDeclaration";
  id: Identifier | null;
  params: Pattern[];
  body: BlockStatement;
  async: boolean;
  returnType: TSTypeAnnotation | null;
  typeParameters: TSTypeParameterDeclaration | null;
};

export type VariableDeclaration = Base & { type: "VariableDeclaration"; kind: "const" | "let" | "var"; declarations: VariableDeclarator[] };

export type VariableDeclarator = Base & { type: "VariableDeclarator"; id: Pattern; init: Expression | null };

export type Statement =
  | BlockStatement
  | FunctionDeclaration
  | VariableDeclaration
  | (Base & { type: "ImportDeclaration"; specifiers: ImportSpecifier[]; source: StringLiteral; importKind: "value" | "type" })
  | (Base & { type: "ExportNamedDeclaration"; declaration: Statement | null; specifiers: ExportSpecifier[]; source: StringLiteral | null; exportKind: "value" | "type" })
  | (Base & { type: "ExportDefaultDeclaration"; declaration: FunctionDeclaration | Expression })
  | (Base & { type: "ExportAllDeclaration"; source: StringLiteral })
  | (Base & { type: "ExpressionStatement"; expression: Expression })
  | (Base & { type: "ReturnStatement"; argument: Expression | null })
  | (Base & { type: "ThrowStatement"; argument: Expression })
  | (Base & { type: "IfStatement"; test: Expression; consequent: Statement; alternate: Statement | null })
  | (Base & { type: "ForOfStatement"; left: VariableDeclaration; right: Expression; body: Statement })
  | (Base & { type: "EmptyStatement" })
  | (Base & { type: "TSTypeAliasDeclaration"; id: Identifier; typeParameters: TSTypeParameterDeclaration | null; typeAnnotation: TSType })
  | (Base & { type: "TSInterfaceDeclaration"; id: Identifier; typeParameters: TSTypeParameterDeclaration | null; extends: TSType[]; members: TSPropertySignature[] });

export type Program = Base & { type: "Program"; body: Statement[] };

/** Any node, for generic walks (the tree view). */
export type AnyNode = { type: string; start: number; end: number };

export class CompileError extends Error {
  constructor(
    message: string,
    readonly pos: number,
  ) {
    super(message);
  }
}
