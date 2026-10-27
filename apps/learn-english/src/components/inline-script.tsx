/**
 * A script that runs while the HTML is parsed, before the first paint. On the
 * client it is inert (`text/plain`) so React doesn't warn about rendering a
 * script; `suppressHydrationWarning` covers the type difference.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
