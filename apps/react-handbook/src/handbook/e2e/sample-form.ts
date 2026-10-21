// The sign-up form the locator demo runs against, and the UI changes that can
// be applied to it. One tree per version gives both the HTML the locators are
// matched in and the markup shown on the page. `key` marks the same element
// across versions, so the demo can tell "still finds it" from "finds something else".

export type FormNode = {
  key?: string;
  tag: string;
  attrs?: Record<string, string>;
  children?: (FormNode | string)[];
};

export type FormChange = { id: string; label: string; note: string };

export const FORM_CHANGES: readonly FormChange[] = [
  {
    id: "original",
    label: "Original form",
    note: "The form as it ships today.",
  },
  {
    id: "class",
    label: "Rename a class",
    note: "A design-system update renames btn-primary to button--primary.",
  },
  {
    id: "reword",
    label: "Reword the button",
    note: 'Copy changes the submit button from "Create account" to "Sign up".',
  },
  {
    id: "wrap",
    label: "Wrap the fields",
    note: "Each field moves into a wrapper div for a new layout.",
  },
  {
    id: "translate",
    label: "Translate the labels",
    note: "The page is shown in French.",
  },
];

export const TARGET_LABEL: Record<string, string> = {
  heading: "the heading",
  email: "the email field",
  password: "the password field",
  remember: "the remember-me checkbox",
  submit: "the submit button",
  cancel: "the cancel button",
  forgot: "the forgot-password link",
};

const TEXT = {
  en: {
    heading: "Create account",
    email: "Email",
    password: "Password",
    remember: "Remember me",
    forgot: "Forgot password?",
    cancel: "Cancel",
  },
  fr: {
    heading: "Créer un compte",
    email: "Adresse e-mail",
    password: "Mot de passe",
    remember: "Se souvenir de moi",
    forgot: "Mot de passe oublié ?",
    cancel: "Annuler",
  },
};

function field(
  id: string,
  label: string,
  type: string,
  key: string,
  wrap: boolean,
): FormNode[] {
  const nodes: FormNode[] = [
    { tag: "label", attrs: { for: id }, children: [label] },
    { key, tag: "input", attrs: { id, type, name: id } },
  ];
  return wrap
    ? [{ tag: "div", attrs: { class: "field" }, children: nodes }]
    : nodes;
}

export function formTree(changeId: string): FormNode {
  const t = changeId === "translate" ? TEXT.fr : TEXT.en;
  const wrap = changeId === "wrap";
  const submitText =
    changeId === "reword"
      ? "Sign up"
      : changeId === "translate"
        ? "Créer un compte"
        : "Create account";
  const submitClass =
    changeId === "class" ? "button button--primary" : "btn btn-primary";
  return {
    tag: "form",
    attrs: { class: "signup" },
    children: [
      { key: "heading", tag: "h3", children: [t.heading] },
      ...field("email", t.email, "email", "email", wrap),
      ...field("password", t.password, "password", "password", wrap),
      {
        tag: "label",
        attrs: { class: "check" },
        children: [
          {
            key: "remember",
            tag: "input",
            attrs: { type: "checkbox", name: "remember" },
          },
          ` ${t.remember}`,
        ],
      },
      {
        tag: "div",
        attrs: { class: "actions" },
        children: [
          {
            key: "submit",
            tag: "button",
            attrs: {
              type: "submit",
              class: submitClass,
              "data-testid": "signup-submit",
            },
            children: [submitText],
          },
          {
            key: "cancel",
            tag: "button",
            attrs: { type: "button", class: "btn" },
            children: [t.cancel],
          },
        ],
      },
      {
        key: "forgot",
        tag: "a",
        attrs: { href: "#forgot" },
        children: [t.forgot],
      },
    ],
  };
}

function escape(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const VOID = new Set(["input"]);

/** HTML for the tree, with each keyed element marked by data-key so matches can be traced back. */
export function toHtml(node: FormNode | string): string {
  if (typeof node === "string") return escape(node);
  const attrs = {
    ...node.attrs,
    ...(node.key ? { "data-key": node.key } : {}),
  };
  const open = `<${node.tag}${Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escape(value)}"`)
    .join("")}>`;
  if (VOID.has(node.tag)) return open;
  return `${open}${(node.children ?? []).map(toHtml).join("")}</${node.tag}>`;
}
