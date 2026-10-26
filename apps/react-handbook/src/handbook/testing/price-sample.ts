import { expect, spyOn, type TestCase } from "./harness";

// The "why test" sample: a price formatter and the cart total that uses it.
// Each change is a real implementation plus the source text shown for it;
// keep the two in step when editing.

export type Line = { cents: number; qty: number };

export type PriceModule = {
  formatPrice: (cents: number, currency: string) => string;
  cartTotal: (lines: Line[], discountPct: number, currency: string) => string;
  // The helper the implementation-detail tests spy on (renamed in one refactor).
  [helper: string]: unknown;
};

export type Change = {
  id: string;
  label: string;
  kind: "original" | "refactor" | "bug";
  /** What the change does, in one line. */
  note: string;
  source: string;
  make: () => PriceModule;
};

function format(units: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(units);
}

const ORIGINAL_SOURCE = `const price = {
  toMajor(cents) {
    return cents / 100;
  },
  formatPrice(cents, currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency })
      .format(price.toMajor(cents));
  },
  cartTotal(lines, discountPct, currency) {
    const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
    const total = Math.round(subtotal * (1 - discountPct / 100));
    return price.formatPrice(Math.max(total, 0), currency);
  },
};`;

export const CHANGES: readonly Change[] = [
  {
    id: "original",
    label: "Original code",
    kind: "original",
    note: "The code as it is today.",
    source: ORIGINAL_SOURCE,
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents, currency) => format((price.toMajor as (c: number) => number)(cents), currency),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
          const total = Math.round(subtotal * (1 - discountPct / 100));
          return price.formatPrice(Math.max(total, 0), currency);
        },
      };
      return price;
    },
  },
  {
    id: "inline",
    label: "Refactor: inline the cents conversion",
    kind: "refactor",
    note: "formatPrice divides by 100 itself; toMajor is gone. Same output for every input.",
    source: `const price = {
  formatPrice(cents, currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency })
      .format(cents / 100);
  },
  cartTotal(lines, discountPct, currency) {
    const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
    const total = Math.round(subtotal * (1 - discountPct / 100));
    return price.formatPrice(Math.max(total, 0), currency);
  },
};`,
    make() {
      const price: PriceModule = {
        formatPrice: (cents, currency) => format(cents / 100, currency),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
          const total = Math.round(subtotal * (1 - discountPct / 100));
          return price.formatPrice(Math.max(total, 0), currency);
        },
      };
      return price;
    },
  },
  {
    id: "loop",
    label: "Refactor: add with a loop and format in place",
    kind: "refactor",
    note: "Adds the lines in a for loop and calls formatPrice through a local variable. Same output for every input.",
    source: `const price = {
  toMajor(cents) {
    return cents / 100;
  },
  formatPrice(cents, currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency })
      .format(price.toMajor(cents));
  },
  cartTotal(lines, discountPct, currency) {
    let subtotal = 0;
    for (const line of lines) subtotal += line.cents * line.qty;
    const discounted = subtotal - subtotal * (discountPct / 100);
    const total = Math.max(Math.round(discounted), 0);
    const toMajor = price.toMajor;
    return new Intl.NumberFormat("en-US", { style: "currency", currency })
      .format(toMajor(total));
  },
};`,
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents, currency) => format((price.toMajor as (c: number) => number)(cents), currency),
        cartTotal: (lines, discountPct, currency) => {
          let subtotal = 0;
          for (const line of lines) subtotal += line.cents * line.qty;
          const discounted = subtotal - subtotal * (discountPct / 100);
          const total = Math.max(Math.round(discounted), 0);
          const toMajor = price.toMajor as (c: number) => number;
          return format(toMajor(total), currency);
        },
      };
      return price;
    },
  },
  {
    id: "floor",
    label: "Bug: round the discount down",
    kind: "bug",
    note: "Math.floor instead of Math.round, so half a cent is always dropped.",
    source: ORIGINAL_SOURCE.replace("Math.round(", "Math.floor("),
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents, currency) => format((price.toMajor as (c: number) => number)(cents), currency),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
          const total = Math.floor(subtotal * (1 - discountPct / 100));
          return price.formatPrice(Math.max(total, 0), currency);
        },
      };
      return price;
    },
  },
  {
    id: "qty",
    label: "Bug: forget the quantity",
    kind: "bug",
    note: "Adds each line's price once, whatever the quantity.",
    source: ORIGINAL_SOURCE.replace("sum + l.cents * l.qty", "sum + l.cents"),
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents, currency) => format((price.toMajor as (c: number) => number)(cents), currency),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents, 0);
          const total = Math.round(subtotal * (1 - discountPct / 100));
          return price.formatPrice(Math.max(total, 0), currency);
        },
      };
      return price;
    },
  },
  {
    id: "negative",
    label: "Bug: drop the zero floor",
    kind: "bug",
    note: "A discount over 100% now gives a negative total.",
    source: ORIGINAL_SOURCE.replace("price.formatPrice(Math.max(total, 0), currency)", "price.formatPrice(total, currency)"),
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents, currency) => format((price.toMajor as (c: number) => number)(cents), currency),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
          const total = Math.round(subtotal * (1 - discountPct / 100));
          return price.formatPrice(total, currency);
        },
      };
      return price;
    },
  },
  {
    id: "dollar",
    label: "Bug: hard-code the dollar sign",
    kind: "bug",
    note: "formatPrice builds the text by hand, so every currency shows $.",
    source: ORIGINAL_SOURCE.replace(
      `return new Intl.NumberFormat("en-US", { style: "currency", currency })
      .format(price.toMajor(cents));`,
      "return \"$\" + price.toMajor(cents).toFixed(2);",
    ),
    make() {
      const price: PriceModule = {
        toMajor: (cents: number) => cents / 100,
        formatPrice: (cents) => "$" + (price.toMajor as (c: number) => number)(cents).toFixed(2),
        cartTotal: (lines, discountPct, currency) => {
          const subtotal = lines.reduce((sum, l) => sum + l.cents * l.qty, 0);
          const total = Math.round(subtotal * (1 - discountPct / 100));
          return price.formatPrice(Math.max(total, 0), currency);
        },
      };
      return price;
    },
  },
];

export const DETAIL_TESTS_SOURCE = `test("formatPrice converts with toMajor", () => {
  const spy = vi.spyOn(price, "toMajor");
  price.formatPrice(1999, "USD");
  expect(spy).toHaveBeenCalledTimes(1);
});

test("cartTotal formats through formatPrice once", () => {
  const spy = vi.spyOn(price, "formatPrice");
  price.cartTotal([{ cents: 500, qty: 2 }], 0, "USD");
  expect(spy).toHaveBeenCalledTimes(1);
});`;

export const BEHAVIOUR_TESTS_SOURCE = `test("formats dollars", () => {
  expect(price.formatPrice(1999, "USD")).toBe("$19.99");
});

test("formats euros", () => {
  expect(price.formatPrice(1999, "EUR")).toBe("€19.99");
});

test("totals quantities, then applies the discount", () => {
  const lines = [{ cents: 2995, qty: 1 }, { cents: 500, qty: 2 }];
  expect(price.cartTotal(lines, 10, "USD")).toBe("$35.96");
});

test("never goes below zero", () => {
  expect(price.cartTotal([{ cents: 500, qty: 1 }], 120, "USD")).toBe("$0.00");
});`;

/** Tests written against how the code works inside. */
export function detailTests(make: () => PriceModule): TestCase[] {
  return [
    {
      name: "formatPrice converts with toMajor",
      run() {
        const price = make();
        const spy = spyOn(price, "toMajor");
        price.formatPrice(1999, "USD");
        spy.toHaveBeenCalledTimes(1);
      },
    },
    {
      name: "cartTotal formats through formatPrice once",
      run() {
        const price = make();
        const spy = spyOn(price, "formatPrice");
        price.cartTotal([{ cents: 500, qty: 2 }], 0, "USD");
        spy.toHaveBeenCalledTimes(1);
      },
    },
  ];
}

/** Tests written against what callers see. */
export function behaviourTests(make: () => PriceModule): TestCase[] {
  return [
    { name: "formats dollars", run: () => expect(make().formatPrice(1999, "USD")).toBe("$19.99") },
    { name: "formats euros", run: () => expect(make().formatPrice(1999, "EUR")).toBe("€19.99") },
    {
      name: "totals quantities, then applies the discount",
      run: () => expect(make().cartTotal([{ cents: 2995, qty: 1 }, { cents: 500, qty: 2 }], 10, "USD")).toBe("$35.96"),
    },
    { name: "never goes below zero", run: () => expect(make().cartTotal([{ cents: 500, qty: 1 }], 120, "USD")).toBe("$0.00") },
  ];
}
