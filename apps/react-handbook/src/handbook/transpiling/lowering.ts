// Generated from TypeScript 5.9.3 transpileModule (module ESNext, inlined helpers)
// for each target. Regenerate rather than edit by hand.

export const TARGETS = ["ES2015", "ES2017", "ES2020", "ESNext"] as const;

export type Target = (typeof TARGETS)[number];

export type LoweringSample = {
  id: string;
  label: string;
  since: string;
  builtin: boolean;
  source: string;
  outputs: Record<Target, string>;
};

export const SAMPLES: readonly LoweringSample[] = [
  {
    "id": "optional",
    "label": "Optional chaining and ??",
    "since": "ES2020",
    "builtin": false,
    "source": "const city = user?.address?.city ?? \"unknown\";\n",
    "outputs": {
      "ES2015": "var _a, _b;\nconst city = (_b = (_a = user === null || user === void 0 ? void 0 : user.address) === null || _a === void 0 ? void 0 : _a.city) !== null && _b !== void 0 ? _b : \"unknown\";\n",
      "ES2017": "var _a, _b;\nconst city = (_b = (_a = user === null || user === void 0 ? void 0 : user.address) === null || _a === void 0 ? void 0 : _a.city) !== null && _b !== void 0 ? _b : \"unknown\";\n",
      "ES2020": "const city = user?.address?.city ?? \"unknown\";\n",
      "ESNext": "const city = user?.address?.city ?? \"unknown\";\n"
    }
  },
  {
    "id": "spread",
    "label": "Object spread",
    "since": "ES2018",
    "builtin": false,
    "source": "const next = { ...state, done: true };\n",
    "outputs": {
      "ES2015": "const next = Object.assign(Object.assign({}, state), { done: true });\n",
      "ES2017": "const next = Object.assign(Object.assign({}, state), { done: true });\n",
      "ES2020": "const next = { ...state, done: true };\n",
      "ESNext": "const next = { ...state, done: true };\n"
    }
  },
  {
    "id": "async",
    "label": "async / await",
    "since": "ES2017",
    "builtin": false,
    "source": "async function load() {\n  const res = await fetch(\"/api/items\");\n  return res.json();\n}\n",
    "outputs": {
      "ES2015": "var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nfunction load() {\n    return __awaiter(this, void 0, void 0, function* () {\n        const res = yield fetch(\"/api/items\");\n        return res.json();\n    });\n}\n",
      "ES2017": "async function load() {\n    const res = await fetch(\"/api/items\");\n    return res.json();\n}\n",
      "ES2020": "async function load() {\n    const res = await fetch(\"/api/items\");\n    return res.json();\n}\n",
      "ESNext": "async function load() {\n    const res = await fetch(\"/api/items\");\n    return res.json();\n}\n"
    }
  },
  {
    "id": "logical",
    "label": "Logical assignment (??=)",
    "since": "ES2021",
    "builtin": false,
    "source": "options.retries ??= 3;\n",
    "outputs": {
      "ES2015": "var _a;\n(_a = options.retries) !== null && _a !== void 0 ? _a : (options.retries = 3);\n",
      "ES2017": "var _a;\n(_a = options.retries) !== null && _a !== void 0 ? _a : (options.retries = 3);\n",
      "ES2020": "options.retries ?? (options.retries = 3);\n",
      "ESNext": "options.retries ??= 3;\n"
    }
  },
  {
    "id": "classFields",
    "label": "Class fields and #private",
    "since": "ES2022",
    "builtin": false,
    "source": "class Counter {\n  count = 0;\n  #step = 1;\n  inc() {\n    this.count += this.#step;\n  }\n}\n",
    "outputs": {
      "ES2015": "var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {\n    if (kind === \"a\" && !f) throw new TypeError(\"Private accessor was defined without a getter\");\n    if (typeof state === \"function\" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError(\"Cannot read private member from an object whose class did not declare it\");\n    return kind === \"m\" ? f : kind === \"a\" ? f.call(receiver) : f ? f.value : state.get(receiver);\n};\nvar _Counter_step;\nclass Counter {\n    constructor() {\n        this.count = 0;\n        _Counter_step.set(this, 1);\n    }\n    inc() {\n        this.count += __classPrivateFieldGet(this, _Counter_step, \"f\");\n    }\n}\n_Counter_step = new WeakMap();\n",
      "ES2017": "var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {\n    if (kind === \"a\" && !f) throw new TypeError(\"Private accessor was defined without a getter\");\n    if (typeof state === \"function\" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError(\"Cannot read private member from an object whose class did not declare it\");\n    return kind === \"m\" ? f : kind === \"a\" ? f.call(receiver) : f ? f.value : state.get(receiver);\n};\nvar _Counter_step;\nclass Counter {\n    constructor() {\n        this.count = 0;\n        _Counter_step.set(this, 1);\n    }\n    inc() {\n        this.count += __classPrivateFieldGet(this, _Counter_step, \"f\");\n    }\n}\n_Counter_step = new WeakMap();\n",
      "ES2020": "var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {\n    if (kind === \"a\" && !f) throw new TypeError(\"Private accessor was defined without a getter\");\n    if (typeof state === \"function\" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError(\"Cannot read private member from an object whose class did not declare it\");\n    return kind === \"m\" ? f : kind === \"a\" ? f.call(receiver) : f ? f.value : state.get(receiver);\n};\nvar _Counter_step;\nclass Counter {\n    constructor() {\n        this.count = 0;\n        _Counter_step.set(this, 1);\n    }\n    inc() {\n        this.count += __classPrivateFieldGet(this, _Counter_step, \"f\");\n    }\n}\n_Counter_step = new WeakMap();\n",
      "ESNext": "class Counter {\n    count = 0;\n    #step = 1;\n    inc() {\n        this.count += this.#step;\n    }\n}\n"
    }
  },
  {
    "id": "builtins",
    "label": "New built-ins: at(), structuredClone()",
    "since": "ES2022 / HTML",
    "builtin": true,
    "source": "const last = items.at(-1);\nconst copy = structuredClone(state);\n",
    "outputs": {
      "ES2015": "const last = items.at(-1);\nconst copy = structuredClone(state);\n",
      "ES2017": "const last = items.at(-1);\nconst copy = structuredClone(state);\n",
      "ES2020": "const last = items.at(-1);\nconst copy = structuredClone(state);\n",
      "ESNext": "const last = items.at(-1);\nconst copy = structuredClone(state);\n"
    }
  }
];
