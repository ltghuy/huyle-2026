"use client";

import { ArrowUp, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { feedCache, type FeedEvent } from "./feed-cache";
import { PostCard } from "./post-card";
import type { useFeed } from "./use-feed";

type Feed = ReturnType<typeof useFeed>;

function describe(event: FeedEvent) {
  switch (event.type) {
    case "loaded":
      return `Loaded ${event.count} more posts, ${event.total} total.`;
    case "error":
      return "Couldn't load more posts.";
    case "ended":
      return `End of feed, ${event.total} posts.`;
    case "shown":
      return `${event.count} new posts shown.`;
  }
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function articlesIn(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>("article[data-post-id]") ?? [])];
}

/** First article whose bottom edge is below the top of the box. */
function findAnchor(box: HTMLElement) {
  const articles = articlesIn(box);
  let lo = 0;
  let hi = articles.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const el = articles[mid];
    if (el.offsetTop + el.offsetHeight > box.scrollTop) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  const el = articles[found];
  return el ? { id: el.dataset.postId!, offset: box.scrollTop - el.offsetTop } : null;
}

export function FeedView({ feed, distance }: { feed: Feed; distance: number }) {
  const { state, loadMore, showPending } = feed;
  const boxRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [showTop, setShowTop] = useState(false);

  // Observe the end-of-list marker. Re-created whenever loading settles, so
  // its initial callback re-checks "still near the end?" and fills the box.
  useEffect(() => {
    const box = boxRef.current;
    const sentinel = sentinelRef.current;
    if (state.status !== "idle" || !box || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root: box, rootMargin: `0px 0px ${distance}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [state.status, state.posts.length, distance, loadMore]);

  // Restore the reading position before the first paint.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const anchor = feedCache.readAnchor();
    if (!box || !anchor) return;
    const el = box.querySelector<HTMLElement>(`[data-post-id="${CSS.escape(anchor.id)}"]`);
    if (el) box.scrollTop = el.offsetTop + anchor.offset;
  }, []);

  // Record the anchor and Back-to-top visibility, at most once per frame.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        feedCache.writeAnchor(findAnchor(box));
        setShowTop(box.scrollTop > box.clientHeight * 2);
      });
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      box.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (state.event && liveRef.current) liveRef.current.textContent = describe(state.event);
  }, [state.event]);

  function handleShowNew() {
    showPending();
    requestAnimationFrame(() => boxRef.current?.scrollTo({ top: 0, behavior: scrollBehavior() }));
  }

  function handleBackToTop() {
    boxRef.current?.scrollTo({ top: 0, behavior: scrollBehavior() });
    articlesIn(boxRef.current)[0]?.focus({ preventScroll: true });
  }

  function handleFeedKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "PageDown" && event.key !== "PageUp") return;
    const articles = articlesIn(boxRef.current);
    const at = articles.indexOf(event.target as HTMLElement);
    if (at === -1) return;
    event.preventDefault();
    const next = articles[event.key === "PageDown" ? at + 1 : at - 1];
    next?.focus({ preventScroll: true });
    next?.scrollIntoView({ block: "nearest" });
  }

  const empty = state.posts.length === 0;
  const pendingLabel = state.pendingCount > 99 ? "99+" : String(state.pendingCount);

  return (
    <div className="relative">
      {state.pendingCount > 0 && state.pending.length > 0 ? (
        <Button
          size="sm"
          onClick={handleShowNew}
          className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-lg"
        >
          <ArrowUp aria-hidden /> {pendingLabel} new {state.pendingCount === 1 ? "post" : "posts"}
        </Button>
      ) : null}

      <div
        ref={boxRef}
        tabIndex={-1}
        className="relative h-[32rem] overflow-y-auto overscroll-contain rounded-lg border bg-background outline-none"
      >
        {empty && state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading posts" className="flex flex-col gap-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : empty && state.status === "error" ? (
          <div role="alert" className="flex flex-col items-start gap-3 p-6">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <TriangleAlert aria-hidden className="size-4" /> Couldn&apos;t load the feed
            </p>
            <p className="text-sm text-muted-foreground">{state.error}</p>
            <Button variant="outline" size="sm" onClick={loadMore}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div
              role="feed"
              aria-busy={state.status === "loading"}
              aria-label="Posts"
              onKeyDown={handleFeedKeyDown}
            >
              {state.posts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  position={i + 1}
                  setSize={state.total ?? -1}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-2 border-t p-4 text-sm text-muted-foreground">
              {state.status === "loading" ? (
                <span className="flex items-center gap-2">
                  <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
                  Loading more posts…
                </span>
              ) : state.status === "error" ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="flex items-center gap-2 text-destructive">
                    <TriangleAlert aria-hidden className="size-4" />
                    Couldn&apos;t load more posts: {state.error}
                  </span>
                  <Button variant="outline" size="sm" onClick={loadMore}>
                    Retry
                  </Button>
                </div>
              ) : state.status === "ended" ? (
                <span>You&apos;ve reached the end · {state.posts.length} posts</span>
              ) : (
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more
                </Button>
              )}
            </div>
          </>
        )}
        <div ref={sentinelRef} aria-hidden className="h-px" />
      </div>

      {showTop ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleBackToTop}
          className="absolute right-3 bottom-3 shadow-lg"
        >
          <ArrowUp aria-hidden /> Back to top
        </Button>
      ) : null}

      <p ref={liveRef} role="status" className="sr-only" />
    </div>
  );
}
