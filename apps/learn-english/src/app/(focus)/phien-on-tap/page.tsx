import type { Metadata } from "next";
import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = { title: "Ôn tập" };

export default function ReviewSessionPage() {
  return <ReviewSession />;
}
