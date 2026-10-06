import { simulateNewPosts } from "@/server/practices/infinite-scroll/feed.store";

export function POST() {
  return Response.json({ data: simulateNewPosts() });
}
