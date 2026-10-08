// A simplified reader: what assistive technology gets from an element (role,
// accessible name, states, description), read from the live DOM. It covers a
// subset of the HTML-AAM role mapping and the accessible-name algorithm,
// enough for the handbook's demo markup. Real screen readers differ in
// wording and detail, and the demos say so.

export type NameSource = "labelledby" | "label" | "aria-label" | "alt" | "legend" | "caption" | "content" | "title" | "placeholder" | "none";

export type Reading = {
  role: string | null;
  name: string;
  nameFrom: NameSource;
  description: string;
  states: string[];
  focusable: boolean;
};

export const LANDMARK_ROLES = new Set(["banner", "navigation", "main", "contentinfo", "complementary", "region", "form", "search"]);

/** Roles whose name comes from their text when nothing else names them. */
const NAME_FROM_CONTENT = new Set(["button", "link", "heading", "checkbox", "radio", "switch", "tab", "menuitem", "option", "cell", "columnheader"]);

const SECTIONING = "article, aside, main, nav, section";

const ROLE_WORDS: Record<string, string> = {
  banner: "banner landmark",
  navigation: "navigation landmark",
  main: "main landmark",
  contentinfo: "content info landmark",
  complementary: "complementary landmark",
  region: "region landmark",
  form: "form landmark",
  search: "search landmark",
  textbox: "edit text",
  radio: "radio button",
  combobox: "combo box",
  img: "image",
  list: "list",
  listitem: "list item",
  group: "group",
};

function implicitRole(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "button":
      return "button";
    case "a":
      return el.hasAttribute("href") ? "link" : null;
    case "input": {
      const type = (el as HTMLInputElement).type;
      if (type === "checkbox" || type === "radio") return type;
      if (type === "button" || type === "submit" || type === "reset") return "button";
      if (type === "hidden") return null;
      return "textbox";
    }
    case "textarea":
      return "textbox";
    case "select":
      return "combobox";
    case "img":
      return el.getAttribute("alt") === "" ? "presentation" : "img";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "nav":
      return "navigation";
    case "main":
      return "main";
    case "aside":
      return "complementary";
    case "header":
      return el.parentElement?.closest(SECTIONING) ? null : "banner";
    case "footer":
      return el.parentElement?.closest(SECTIONING) ? null : "contentinfo";
    case "section":
      return hasOwnName(el) ? "region" : null;
    case "form":
      return hasOwnName(el) ? "form" : null;
    case "search":
      return "search";
    case "ul":
    case "ol":
      return "list";
    case "li":
      return "listitem";
    case "fieldset":
      return "group";
    case "article":
      return "article";
    default:
      return null;
  }
}

function hasOwnName(el: Element) {
  return Boolean(el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby")?.trim());
}

export function roleOf(el: Element): string | null {
  const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0];
  return explicit || implicitRole(el);
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Visible-to-AT text of a subtree: skips aria-hidden parts, uses alt for images. */
export function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  // Checked by node type, not instanceof: samples may live in an iframe (another realm).
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden")) return "";
  if (el.tagName === "IMG") return ` ${el.getAttribute("alt") ?? ""} `;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return ` ${(el as HTMLInputElement).value} `;
  let text = "";
  for (const child of el.childNodes) text += textOf(child);
  return /^(DIV|P|LI|H\d|SECTION|ARTICLE)$/.test(el.tagName) ? ` ${text} ` : text;
}

function idsText(el: Element, attribute: string) {
  const ids = el.getAttribute(attribute)?.trim();
  if (!ids) return "";
  const doc = el.ownerDocument;
  return clean(
    ids
      .split(/\s+/)
      .map((id) => {
        const target = doc.getElementById(id);
        return target ? textOf(target) : "";
      })
      .join(" "),
  );
}

export function accessibleName(el: Element): { name: string; from: NameSource } {
  const labelledBy = idsText(el, "aria-labelledby");
  if (labelledBy) return { name: labelledBy, from: "labelledby" };
  const ariaLabel = clean(el.getAttribute("aria-label") ?? "");
  if (ariaLabel) return { name: ariaLabel, from: "aria-label" };

  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
    const field = el as HTMLInputElement;
    const labels = field.labels ? clean([...field.labels].map((label) => textOf(label).replace(textOf(field), "")).join(" ")) : "";
    if (labels) return { name: labels, from: "label" };
  }
  if (el.tagName === "IMG" && el.hasAttribute("alt")) return { name: clean(el.getAttribute("alt") ?? ""), from: "alt" };
  if (el.tagName === "FIELDSET") {
    const legend = el.querySelector(":scope > legend");
    if (legend) return { name: clean(textOf(legend)), from: "legend" };
  }
  if (el.tagName === "TABLE") {
    const caption = el.querySelector(":scope > caption");
    if (caption) return { name: clean(textOf(caption)), from: "caption" };
  }
  const role = roleOf(el);
  if (role && NAME_FROM_CONTENT.has(role)) {
    const content = clean(textOf(el));
    if (content) return { name: content, from: "content" };
  }
  const title = clean(el.getAttribute("title") ?? "");
  if (title) return { name: title, from: "title" };
  const placeholder = clean(el.getAttribute("placeholder") ?? "");
  if (placeholder) return { name: placeholder, from: "placeholder" };
  return { name: "", from: "none" };
}

function statesOf(el: Element): string[] {
  const states: string[] = [];
  const role = roleOf(el);
  const aria = (name: string) => el.getAttribute(`aria-${name}`);

  if (role === "checkbox" || role === "radio" || role === "switch") {
    const checked = el.tagName === "INPUT" ? (el as HTMLInputElement).checked : aria("checked") === "true";
    states.push(checked ? "checked" : "not checked");
  }
  if (aria("pressed")) states.push(aria("pressed") === "true" ? "pressed" : "not pressed");
  if (aria("expanded")) states.push(aria("expanded") === "true" ? "expanded" : "collapsed");
  if (el.hasAttribute("required") || aria("required") === "true") states.push("required");
  if (aria("invalid") && aria("invalid") !== "false") states.push("invalid entry");
  if ((el as HTMLButtonElement).disabled || aria("disabled") === "true") states.push("dimmed");
  return states;
}

export function read(el: Element): Reading {
  const { name, from } = accessibleName(el);
  const html = el as HTMLElement;
  return {
    role: roleOf(el),
    name,
    nameFrom: from,
    description: idsText(el, "aria-describedby"),
    states: statesOf(el),
    focusable: html.tabIndex >= 0 && !(el as HTMLButtonElement).disabled,
  };
}

export function roleWord(el: Element, role: string | null): string {
  if (!role || role === "presentation" || role === "none" || role === "generic") return "";
  if (role === "heading") return `heading level ${headingLevel(el)}`;
  return ROLE_WORDS[role] ?? role;
}

/** One line, roughly as a screen reader would say it on focus. */
export function announce(el: Element): string {
  const reading = read(el);
  const role = roleWord(el, reading.role);
  if (!role) {
    const text = clean(textOf(el));
    return text ? `"${text}" (plain text: not announced as a control)` : "(nothing: hidden from assistive technology)";
  }
  return [reading.name || "unlabelled", role, ...reading.states, reading.description].filter(Boolean).join(", ");
}

export function headingLevel(el: Element): number {
  const aria = Number(el.getAttribute("aria-level"));
  if (aria > 0) return aria;
  const match = /^H(\d)$/.exec(el.tagName);
  return match ? Number(match[1]) : 2;
}

export type Outline = {
  landmarks: { role: string; name: string }[];
  headings: { level: number; text: string }[];
  problems: string[];
};

/** Landmarks and headings in document order, as a screen reader's navigation menus list them. */
export function outline(root: ParentNode): Outline {
  const landmarks: Outline["landmarks"] = [];
  const headings: Outline["headings"] = [];
  for (const el of root.querySelectorAll("*")) {
    if (el.closest("[aria-hidden='true']")) continue;
    const role = roleOf(el);
    if (role && LANDMARK_ROLES.has(role)) landmarks.push({ role, name: accessibleName(el).name });
    if (role === "heading") headings.push({ level: headingLevel(el), text: clean(textOf(el)) });
  }

  const problems: string[] = [];
  if (landmarks.length === 0) problems.push("No landmarks: there is no way to jump to the navigation or the main content.");
  else if (!landmarks.some((l) => l.role === "main")) problems.push("No main landmark.");
  if (headings.length === 0) problems.push("No headings: the page can only be read from top to bottom.");
  else if (!headings.some((h) => h.level === 1)) problems.push("No level-1 heading naming the page.");
  headings.forEach((heading, i) => {
    const previous = i === 0 ? 0 : headings[i - 1].level;
    if (heading.level > previous + 1 && i > 0) problems.push(`Heading level skipped: h${previous} → h${heading.level} ("${heading.text}").`);
  });
  return { landmarks, headings, problems };
}
