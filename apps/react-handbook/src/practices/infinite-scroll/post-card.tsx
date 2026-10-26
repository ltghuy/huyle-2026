import { memo } from "react";

import type { Post } from "@/server/practices/infinite-scroll/feed.schema";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function timeAgo(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relative.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export const PostCard = memo(function PostCard({
  post,
  position,
  setSize,
}: {
  post: Post;
  position: number;
  setSize: number;
}) {
  const labelId = `post-${post.id}-author`;
  return (
    <article
      data-post-id={post.id}
      tabIndex={0}
      aria-posinset={position}
      aria-setsize={setSize}
      aria-labelledby={labelId}
      className="border-b px-4 py-3 outline-none last:border-b-0 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60"
    >
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span id={labelId} className="font-medium">
          {post.author}
        </span>
        <span className="text-muted-foreground">@{post.handle}</span>
        <time dateTime={post.createdAt} className="text-xs text-muted-foreground">
          · {timeAgo(post.createdAt)}
        </time>
      </header>
      <p className="mt-1 text-sm">{post.text}</p>
    </article>
  );
});
