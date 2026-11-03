import { SignInGate } from "@/components/account/sign-in-gate";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = pageMetadata({ title: "Ôn tập", path: "/review-session", description: "Phiên ôn tập từ vựng của bạn.", index: false });

export default function ReviewSessionPage() {
  return (
    <SignInGate area="review" className="mx-auto max-w-xl py-16" owl>
      <ReviewSession />
    </SignInGate>
  );
}
