// The per-context encoding a framework does for you, spelled out. The lesson
// of the XSS topic is that safety is about encoding output for the context it
// lands in — not filtering input, and not one escape function for everything.

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** For a value going inside a quoted attribute; also quote the attribute. */
export function escapeAttr(value: string): string {
  return value.replace(/[&<>"'`=]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A URL is only safe to use as href/src if its scheme is http(s) or relative. */
export function safeHref(value: string): string {
  const trimmed = value.trim();
  if (/^(https?:|mailto:|\/|\.|#|\?)/i.test(trimmed) && !/^\s*javascript:/i.test(trimmed)) return trimmed;
  return "about:blank#blocked";
}

export type XssSink = "html" | "text" | "attr" | "href";

export const SINKS: { value: XssSink; label: string; context: string }[] = [
  { value: "html", label: "Into HTML (innerHTML)", context: "The value becomes markup. Any tags and event handlers in it are live." },
  { value: "text", label: "As text (textContent)", context: "The value becomes a text node. Tags show as characters; nothing runs." },
  { value: "attr", label: "Into an attribute (title)", context: "The value goes inside a quoted attribute; breaking out of the quotes injects new attributes." },
  { value: "href", label: "Into a link's href", context: "A javascript: URL in an href runs when the link is clicked." },
];

export const XSS_PRESETS: { label: string; payload: string }[] = [
  { label: "Image with onerror", payload: '<img src=x onerror="report(\'img onerror\')">' },
  { label: "Script tag", payload: "<script>report('script tag')<\\/script>" },
  { label: "Break out of an attribute", payload: '"><img src=x onerror="report(\'attribute break-out\')">' },
  { label: "javascript: URL", payload: "javascript:report('javascript URL')" },
  { label: "Just a greeting", payload: "<b>hello</b> & welcome" },
];
