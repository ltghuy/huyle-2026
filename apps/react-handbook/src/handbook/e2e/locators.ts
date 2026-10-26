// A simplified version of Playwright's locator rules, run against the sample
// form in the page. It follows the documented behaviour for the cases the
// sample has (implicit roles, accessible names from aria-label, labels and
// text, case-insensitive substring matching unless exact) and nothing more.

export type LocatorKind = "role" | "label" | "text" | "testid" | "css";

export type Locator = {
  id: string;
  kind: LocatorKind;
  value: string;
  role?: string;
  exact?: boolean;
};

export const ROLES = [
  "button",
  "link",
  "textbox",
  "checkbox",
  "heading",
] as const;

export const KIND_LABEL: Record<LocatorKind, string> = {
  role: "Role and name",
  label: "Label",
  text: "Text",
  testid: "Test id",
  css: "CSS",
};

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function implicitRole(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "input") {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (type === "checkbox") return "checkbox";
    if (["text", "email", "search", "tel", "url"].includes(type))
      return "textbox";
    // A password field has no ARIA role, so getByRole("textbox") skips it.
    return null;
  }
  if (tag === "textarea") return "textbox";
  return null;
}

function labelText(el: Element, root: ParentNode): string {
  const id = el.getAttribute("id");
  const parts: string[] = [];
  if (id)
    root
      .querySelectorAll(`label[for="${CSS.escape(id)}"]`)
      .forEach((label) => parts.push(label.textContent ?? ""));
  const wrapping = el.closest("label");
  if (wrapping) parts.push(wrapping.textContent ?? "");
  return normalize(parts.join(" "));
}

function accessibleName(el: Element, root: ParentNode): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return normalize(aria);
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    return normalize(
      labelledBy
        .split(/\s+/)
        .map(
          (id) => root.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "",
        )
        .join(" "),
    );
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select")
    return labelText(el, root);
  return normalize(el.textContent ?? "");
}

function matchesText(actual: string, wanted: string, exact: boolean) {
  return exact
    ? actual === wanted
    : actual.toLowerCase().includes(wanted.toLowerCase());
}

export type MatchResult = { elements: Element[]; error?: string };

/** Elements inside `root` the locator matches, in document order. */
export function match(root: Element, locator: Locator): MatchResult {
  const all = [...root.querySelectorAll("*")];
  const wanted = normalize(locator.value);
  const exact = locator.exact ?? false;
  switch (locator.kind) {
    case "role":
      return {
        elements: all.filter(
          (el) =>
            implicitRole(el) === locator.role &&
            (wanted === "" ||
              matchesText(accessibleName(el, root), wanted, exact)),
        ),
      };
    case "label":
      if (!wanted)
        return { elements: [], error: "Enter the label text to look for" };
      return {
        elements: all.filter(
          (el) =>
            ["input", "textarea", "select"].includes(
              el.tagName.toLowerCase(),
            ) && matchesText(labelText(el, root), wanted, exact),
        ),
      };
    case "text": {
      if (!wanted) return { elements: [], error: "Enter the text to look for" };
      // The smallest elements whose text contains the value, as Playwright does.
      const hits = all.filter((el) =>
        matchesText(normalize(el.textContent ?? ""), wanted, exact),
      );
      return {
        elements: hits.filter(
          (el) => !hits.some((other) => other !== el && el.contains(other)),
        ),
      };
    }
    case "testid":
      return {
        elements: all.filter(
          (el) => el.getAttribute("data-testid") === locator.value,
        ),
      };
    case "css":
      if (!wanted) return { elements: [], error: "Enter a CSS selector" };
      try {
        return { elements: [...root.querySelectorAll(locator.value)] };
      } catch {
        return {
          elements: [],
          error: `"${locator.value}" is not a valid CSS selector`,
        };
      }
  }
}

/** How the locator reads in a Playwright test. */
export function describe(locator: Locator): string {
  const v = JSON.stringify(locator.value);
  const exact = locator.exact ? ", exact: true" : "";
  switch (locator.kind) {
    case "role":
      return locator.value
        ? `getByRole("${locator.role}", { name: ${v}${exact} })`
        : `getByRole("${locator.role}")`;
    case "label":
      return `getByLabel(${v}${locator.exact ? ", { exact: true }" : ""})`;
    case "text":
      return `getByText(${v}${locator.exact ? ", { exact: true }" : ""})`;
    case "testid":
      return `getByTestId(${v})`;
    case "css":
      return `locator(${v})`;
  }
}
