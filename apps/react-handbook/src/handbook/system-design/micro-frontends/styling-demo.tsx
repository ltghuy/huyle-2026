"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Code } from "@/components/playground/code";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

// A real style collision between the shell and the checkout piece. The whole demo
// renders inside a shadow root that stands in for the page, so the broad rules
// below can't touch the rest of this site. Verdicts are read back from the browser.

type Mode = "none" | "prefix" | "scoped" | "shadow";

const MODE_OPTIONS = [
  { value: "none", label: "No isolation" },
  { value: "prefix", label: "Team prefix (checkout-)" },
  { value: "scoped", label: "Scoped class names" },
  { value: "shadow", label: "Shadow tree" },
] as const;

/** The shell's own CSS, which includes the design system's button. */
const SHELL_CSS = `
:host { display: block; color: var(--foreground); font: 14px/1.5 var(--font-sans), system-ui, sans-serif; --brand: var(--primary); }
.frame { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--card); }
.bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.title { font-weight: 600; color: var(--brand); }
.button { background: var(--primary); color: var(--primary-foreground); border: 0; border-radius: 6px; padding: 4px 12px; font: inherit; }
.piece { display: grid; gap: 6px; padding: 10px; border: 1px dashed var(--border); border-radius: 8px; }
.probe-primary { background: var(--primary); }
.probe-brand { color: var(--brand); }
`;

/** Checkout's rules: a heading style and its own button color. */
const PIECE_RULES = (title: string, button: string) => `
.${title} { text-transform: uppercase; letter-spacing: 0.06em; }
.${button} { background: var(--destructive); color: var(--background); }
.price { color: var(--brand); font-weight: 600; }
`;

const NAMES: Record<Mode, { title: string; button: string }> = {
  none: { title: "title", button: "button" },
  prefix: { title: "checkout-title", button: "checkout-button" },
  scoped: { title: "title_k3x9a", button: "button_k3x9a" },
  shadow: { title: "title", button: "button" },
};

type Checks = {
  pieceIntoShell: boolean;
  shellIntoPiece: boolean;
  themeCrosses: boolean;
  fontCrosses: boolean;
  designSystemReaches: boolean;
};

function measure(root: ShadowRoot): Checks | null {
  const q = (scope: ParentNode, selector: string) => scope.querySelector<HTMLElement>(selector);
  const pieceScope = q(root, "[data-piece-host]")?.shadowRoot ?? root;
  const els = {
    shellTitle: q(root, "[data-shell-title]"),
    shellButton: q(root, "[data-shell-button]"),
    primary: q(root, ".probe-primary"),
    brand: q(root, ".probe-brand"),
    pieceTitle: q(pieceScope, "[data-piece-title]"),
    pieceButton: q(pieceScope, "[data-piece-button]"),
    price: q(pieceScope, "[data-piece-price]"),
  };
  if (Object.values(els).some((el) => !el)) return null;
  const s = (el: HTMLElement | null) => getComputedStyle(el!);
  return {
    pieceIntoShell: s(els.shellTitle).textTransform === "uppercase" || s(els.shellButton).backgroundColor !== s(els.primary).backgroundColor,
    shellIntoPiece: s(els.pieceTitle).color === s(els.brand).color,
    themeCrosses: s(els.price).color === s(els.brand).color,
    fontCrosses: s(els.pieceTitle).fontFamily === s(els.shellTitle).fontFamily,
    designSystemReaches: s(els.pieceButton).borderRadius === s(els.shellButton).borderRadius,
  };
}

function PieceMarkup({ mode }: { mode: Mode }) {
  const names = NAMES[mode];
  // With prefixed or scoped names, the piece still uses the design system's
  // .button class and adds its own modifier.
  const buttonClass = mode === "none" || mode === "shadow" ? names.button : `button ${names.button}`;
  return (
    <div className="piece">
      <span data-piece-title className={names.title}>
        Mini cart
      </span>
      <span>
        2 items · <span data-piece-price className="price">€120</span>
      </span>
      <span>
        <button type="button" tabIndex={-1} data-piece-button className={buttonClass}>
          Checkout
        </button>
      </span>
    </div>
  );
}

function ShadowPiece({ onRoot, root }: { onRoot: (root: ShadowRoot) => void; root: ShadowRoot | null }) {
  function attach(el: HTMLDivElement | null) {
    if (el) onRoot(el.shadowRoot ?? el.attachShadow({ mode: "open" }));
  }
  return (
    <div data-piece-host ref={attach}>
      {root
        ? createPortal(
            <>
              <style>{`:host { display: block; }${PIECE_RULES("title", "button")}.piece { display: grid; gap: 6px; padding: 10px; border: 1px dashed var(--border); border-radius: 8px; }`}</style>
              <PieceMarkup mode="shadow" />
            </>,
            root,
          )
        : null}
    </div>
  );
}

const CHECK_TEXT: { key: keyof Checks; good: boolean; yes: string; no: string }[] = [
  { key: "pieceIntoShell", good: false, yes: "Checkout's rules leak into the shell: its heading turns uppercase and its buttons turn red.", no: "Checkout's rules stay out of the shell." },
  { key: "shellIntoPiece", good: false, yes: "The shell's .title rule leaks into checkout: the mini cart heading takes the brand color.", no: "The shell's rules stay out of checkout." },
  { key: "themeCrosses", good: true, yes: "The shell's --brand theme variable reaches the price, so one set of tokens themes every piece.", no: "The theme variable doesn't reach the piece." },
  { key: "fontCrosses", good: true, yes: "Inherited properties such as the font and text color flow in from the page.", no: "The piece doesn't inherit the page's font." },
  { key: "designSystemReaches", good: true, yes: "The design system's button styles apply to the piece's button.", no: "The design system's button styles don't reach the piece: its button is missing their padding and rounded corners. A shadow tree must load the design system's CSS itself." },
];

export function StylingDemo() {
  const [mode, setMode] = useState<Mode>("none");
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [pieceRoot, setPieceRoot] = useState<ShadowRoot | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);

  useEffect(() => {
    if (!root) return;
    // Wait a frame so nested shadow content has committed and styles are applied.
    const frame = requestAnimationFrame(() => setChecks(measure(root)));
    return () => cancelAnimationFrame(frame);
  }, [root, pieceRoot, mode]);

  function attach(el: HTMLDivElement | null) {
    if (el) setRoot(el.shadowRoot ?? el.attachShadow({ mode: "open" }));
  }

  const names = NAMES[mode];
  const pieceCss = mode === "shadow" ? "" : PIECE_RULES(names.title, names.button);

  return (
    <div className="flex flex-col gap-5">
      <Choice legend="Isolate checkout's styles with" value={mode} options={MODE_OPTIONS} onChange={setMode} />

      <div className="grid gap-4 md:grid-cols-2">
        <figure className="flex min-w-0 flex-col gap-2">
          <div ref={attach} />
          {root
            ? createPortal(
                <>
                  <style>{SHELL_CSS + pieceCss}</style>
                  <div className="frame">
                    <div className="bar">
                      <span data-shell-title className="title">
                        Shopfront
                      </span>
                      <button type="button" tabIndex={-1} data-shell-button className="button">
                        Sign in
                      </button>
                    </div>
                    {mode === "shadow" ? <ShadowPiece key="shadow" root={pieceRoot} onRoot={setPieceRoot} /> : <PieceMarkup mode={mode} />}
                    <span aria-hidden className="probe-primary" style={{ display: "none" }} />
                    <span aria-hidden className="probe-brand" style={{ display: "none" }} />
                  </div>
                </>,
                root,
              )
            : null}
          <figcaption className="text-xs text-foreground/75">The shell (header) and checkout&apos;s mini cart, rendered with the CSS on the right.</figcaption>
        </figure>

        <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap" tabIndex={0} aria-label="CSS on the page">
          <Code
            lang="css"
            code={`/* shell */\n.title { font-weight: 600; color: var(--brand); }\n.button { background: var(--primary); border-radius: 6px; padding: 4px 12px; … }\n\n/* checkout${mode === "shadow" ? ", inside its own shadow root" : ""} */${PIECE_RULES(names.title, names.button)}`}
          />
        </pre>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm" aria-live="polite">
        {checks
          ? CHECK_TEXT.map((c) => (
              <li key={c.key}>
                <Verdict pass={checks[c.key] === c.good}>{checks[c.key] ? c.yes : c.no}</Verdict>
              </li>
            ))
          : null}
      </ul>
      <p className="text-xs text-foreground/75">
        Real CSS, read back with getComputedStyle. Scoped names are what CSS Modules and similar tools generate at build time; the prefix is the same idea done by
        hand. The theme tokens are this site&apos;s own custom properties, which is why the demo follows light and dark mode even inside the shadow roots.
      </p>
    </div>
  );
}
