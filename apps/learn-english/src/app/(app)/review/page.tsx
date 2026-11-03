import { SignInGate } from "@/components/account/sign-in-gate";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { RotateCcw } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";
import { ReviewOverview } from "@/components/review/review-overview";

const BADGE = { icon: RotateCcw, text: "Ôn đúng lúc sắp quên" };

export const metadata: Metadata = pageMetadata({ title: "Ôn tập", path: "/review", description: "Ôn lại từ vựng đúng lúc bạn sắp quên.", index: false });

export default function ReviewPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Ôn tập" description="Mỗi ngày ôn một ít, từ sẽ ở lại với bạn lâu hơn." mascot={<Owl mood="cheer" size="hero" />} />
      <SignInGate area="review">
        <ReviewOverview />
      </SignInGate>
    </>
  );
}
