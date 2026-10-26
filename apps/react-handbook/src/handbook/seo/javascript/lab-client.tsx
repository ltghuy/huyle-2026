"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ARTICLE, getLab } from "./labs";

// The browser-only parts of the lab pages. Each is deliberately written the
// way that hides content or links from crawlers that don't run JavaScript,
// or from any crawler that doesn't interact. The texts are imported here,
// not passed as props, so they aren't serialized into the server HTML's
// inline RSC payload.

const NOT_FOUND = getLab("soft-404")!.markers[0];
const [, , MOUNT, CLICK, SCROLL] = getLab("interaction")!.markers;

function subscribeNever() {
  return () => {};
}

/** False in the server HTML, true once the page runs in a browser. */
function useMounted() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export function ClientArticle() {
  const mounted = useMounted();
  if (!mounted) return <p>Loading…</p>;
  return (
    <article>
      <h1>{ARTICLE.heading}</h1>
      <p data-marker={ARTICLE.marker.id}>{ARTICLE.marker.text}</p>
    </article>
  );
}

export function ClientTitle() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content = "A five-step pour-over recipe, with the title and this description set by JavaScript.";
    document.head.append(meta);
    // Next.js writes its own <title> back after hydration, so a title set
    // straight away in an effect is lost; wait a moment, as such code often does.
    const timer = setTimeout(() => {
      document.title = "How to brew pour-over coffee · SEO lab";
    }, 300);
    return () => {
      clearTimeout(timer);
      meta.remove();
    };
  }, []);
  return null;
}

export function SoftNotFound({ noindex }: { noindex: boolean }) {
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted || !noindex) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.append(meta);
    return () => meta.remove();
  }, [mounted, noindex]);

  if (!mounted) return <p>Loading product…</p>;
  return (
    <>
      <h1>Product not found</h1>
      <p data-marker={NOT_FOUND.id}>{NOT_FOUND.text}</p>
    </>
  );
}

export function JsLinks() {
  const router = useRouter();

  function handleButton() {
    router.push("/seo-lab/server");
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") handleButton();
  }

  return (
    <>
      <button type="button" data-nav="Button with router.push()" onClick={handleButton}>
        Brewing guide (button)
      </button>
      <span role="link" tabIndex={0} data-nav="Span with role=link" onClick={handleButton} onKeyDown={handleKeyDown}>
        Brewing guide (span)
      </span>
      <a data-nav="Anchor without href" onClick={handleButton} role="link" tabIndex={0} onKeyDown={handleKeyDown}>
        Brewing guide (anchor, no href)
      </a>
      <a href="javascript:void(0)" data-nav="javascript: URL" onClick={handleButton}>
        Brewing guide (javascript: URL)
      </a>
    </>
  );
}

export function InteractionParts() {
  const mounted = useMounted();
  const [clicked, setClicked] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 0) setScrolled(true);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {mounted ? <p data-marker={MOUNT.id}>{MOUNT.text}</p> : null}
      <button type="button" data-lab-action onClick={() => setClicked(true)}>
        Show more
      </button>
      {clicked ? <p data-marker={CLICK.id}>{CLICK.text}</p> : null}
      <div style={{ height: 1600 }} aria-hidden />
      {scrolled ? <p data-marker={SCROLL.id}>{SCROLL.text}</p> : <p>Scroll to load more.</p>}
    </>
  );
}
