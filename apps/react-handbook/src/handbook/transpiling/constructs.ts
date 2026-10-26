// Generated from TypeScript 5.9.3 (transpileModule, isolatedModules, target ESNext) and
// Babel @babel/plugin-transform-typescript 7.29.9. Diagnostics come from a
// TypeScript program with erasableSyntaxOnly and isolatedModules on.
// Regenerate rather than edit by hand.

export type Construct = {
  id: string;
  label: string;
  source: string;
  tsOutput: string;
  babelOutput: string;
  erasable: boolean;
  diagnostics: readonly string[];
  notes: string;
};

export const CONSTRUCTS: readonly Construct[] = [
  {
    "id": "annotation",
    "label": "Type annotations",
    "source": "function total(price: number, qty: number = 1): number {\n  return price * qty;\n}\n",
    "tsOutput": "function total(price, qty = 1) {\n    return price * qty;\n}\n",
    "babelOutput": "function total(price, qty = 1) {\n  return price * qty;\n}\n",
    "erasable": true,
    "diagnostics": [],
    "notes": "Every tool deletes them: parameter types, return types and variable types carry no runtime meaning."
  },
  {
    "id": "interface",
    "label": "interface / type",
    "source": "interface User {\n  id: string;\n  name: string;\n}\nconst admin: User = { id: \"1\", name: \"Ada\" };\n",
    "tsOutput": "const admin = { id: \"1\", name: \"Ada\" };\n",
    "babelOutput": "const admin = {\n  id: \"1\",\n  name: \"Ada\"\n};\n",
    "erasable": true,
    "diagnostics": [],
    "notes": "Declarations that only describe shapes vanish entirely."
  },
  {
    "id": "typeImport",
    "label": "import type",
    "source": "import type { User } from \"./user\";\nexport function greet(user: User) {\n  return \"Hi \" + user.name;\n}\n",
    "tsOutput": "export function greet(user) {\n    return \"Hi \" + user.name;\n}\n",
    "babelOutput": "export function greet(user) {\n  return \"Hi \" + user.name;\n}\n",
    "erasable": true,
    "diagnostics": [],
    "notes": "Marked type-only, so a per-file tool knows it can drop the whole import without looking at ./user."
  },
  {
    "id": "satisfies",
    "label": "satisfies, as, !",
    "source": "const theme = { primary: \"#639\" } satisfies Record<string, string>;\nconst el = document.getElementById(\"app\")!;\nconst n = (input as HTMLInputElement).value;\n",
    "tsOutput": "const theme = { primary: \"#639\" };\nconst el = document.getElementById(\"app\");\nconst n = input.value;\n",
    "babelOutput": "const theme = {\n  primary: \"#639\"\n};\nconst el = document.getElementById(\"app\");\nconst n = input.value;\n",
    "erasable": true,
    "diagnostics": [],
    "notes": "Assertions and checks for the type checker only; the expression underneath is kept as written."
  },
  {
    "id": "reexport",
    "label": "Re-exporting a type",
    "source": "export { User } from \"./types\";\n",
    "tsOutput": "export { User } from \"./types\";\n",
    "babelOutput": "export { User } from \"./types\";\n",
    "erasable": false,
    "diagnostics": [
      "TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'."
    ],
    "notes": "A per-file tool can't open ./types to learn that User is only a type, so it keeps the export, and the browser fails with \"does not provide an export named 'User'\". Write export type { User } instead."
  },
  {
    "id": "enum",
    "label": "enum",
    "source": "enum Status {\n  Active,\n  Disabled,\n}\nconsole.log(Status.Active);\n",
    "tsOutput": "var Status;\n(function (Status) {\n    Status[Status[\"Active\"] = 0] = \"Active\";\n    Status[Status[\"Disabled\"] = 1] = \"Disabled\";\n})(Status || (Status = {}));\nconsole.log(Status.Active);\n",
    "babelOutput": "var Status = /*#__PURE__*/function (Status) {\n  Status[Status[\"Active\"] = 0] = \"Active\";\n  Status[Status[\"Disabled\"] = 1] = \"Disabled\";\n  return Status;\n}(Status || {});\nconsole.log(Status.Active);\n",
    "erasable": false,
    "diagnostics": [
      "TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
    ],
    "notes": "An enum is a runtime object, so it needs generated code. TypeScript, Babel, SWC and Oxc generate it; Node's built-in type stripping refuses it unless you pass --experimental-transform-types."
  },
  {
    "id": "constEnum",
    "label": "const enum",
    "source": "const enum Size {\n  Small = 1,\n  Large = 2,\n}\nconsole.log(Size.Large);\n",
    "tsOutput": "var Size;\n(function (Size) {\n    Size[Size[\"Small\"] = 1] = \"Small\";\n    Size[Size[\"Large\"] = 2] = \"Large\";\n})(Size || (Size = {}));\nconsole.log(Size.Large);\n",
    "babelOutput": "var Size = /*#__PURE__*/function (Size) {\n  Size[Size[\"Small\"] = 1] = \"Small\";\n  Size[Size[\"Large\"] = 2] = \"Large\";\n  return Size;\n}(Size || {});\nconsole.log(Size.Large);\n",
    "erasable": false,
    "diagnostics": [
      "TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
    ],
    "notes": "tsc with full type information inlines Size.Large as 2. A per-file transpile can't see other files' enums, so TypeScript's own transpileModule and Babel fall back to a normal enum object."
  },
  {
    "id": "namespace",
    "label": "namespace (with values)",
    "source": "namespace Geometry {\n  export const PI = 3.14;\n}\nconsole.log(Geometry.PI);\n",
    "tsOutput": "var Geometry;\n(function (Geometry) {\n    Geometry.PI = 3.14;\n})(Geometry || (Geometry = {}));\nconsole.log(Geometry.PI);\n",
    "babelOutput": "let Geometry;\n(function (_Geometry) {\n  const PI = _Geometry.PI = 3.14;\n})(Geometry || (Geometry = {}));\nconsole.log(Geometry.PI);\n",
    "erasable": false,
    "diagnostics": [
      "TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
    ],
    "notes": "A namespace with values compiles to an object built by a function. Namespaces that only hold types are erasable."
  },
  {
    "id": "paramProp",
    "label": "Parameter properties",
    "source": "class Point {\n  constructor(public x: number, private y: number) {}\n}\n",
    "tsOutput": "class Point {\n    x;\n    y;\n    constructor(x, y) {\n        this.x = x;\n        this.y = y;\n    }\n}\n",
    "babelOutput": "class Point {\n  constructor(x, y) {\n    this.x = x;\n    this.y = y;\n  }\n}\n",
    "erasable": false,
    "diagnostics": [
      "TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled."
    ],
    "notes": "public x in a constructor also means this.x = x, so code has to be added, not just removed."
  }
];

export const TYPE_ERROR = {
  "source": "function shout(name: string) {\n  return name.toUpperCase() + \"!\";\n}\nconsole.log(shout(42));\n",
  "output": "function shout(name) {\n    return name.toUpperCase() + \"!\";\n}\nconsole.log(shout(42));\n",
  "diagnostics": [
    "TS2345: Argument of type 'number' is not assignable to parameter of type 'string'."
  ]
} as const;

export const TYPESCRIPT_VERSION = "5.9.3";
