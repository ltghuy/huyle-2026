import type { Metadata } from "next";
import { Users } from "lucide-react";
import { SignInGate } from "@/components/account/sign-in-gate";
import { Mascot } from "@/components/mascot/mascot";
import { PageHero } from "@/components/shell/page-hero";
import { FriendsList } from "@/components/social/friends-list";
import { pageMetadata } from "@/lib/site";

const DESCRIPTION = "Những người bạn đã kết bạn ở Đấu trường, và ai đang trực tuyến.";
const BADGE = { icon: Users, text: "Học cùng bạn bè vui hơn" };

export const metadata: Metadata = pageMetadata({ title: "Bạn bè", path: "/friends", description: DESCRIPTION, index: false });

/** `/friends`: the friends list as its own page, reached on phones from the Thêm sheet (feature 032). */
export default function FriendsPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Bạn bè của bạn" description={DESCRIPTION} mascot={<Mascot mood="happy" size="hero" />} />
      <SignInGate area="friends">
        <div className="px-4 pb-8 md:px-8">
          <div className="max-w-2xl rounded-2xl border bg-card p-2 sm:p-4">
            <FriendsList heading={false} roomy className="pt-2" />
          </div>
        </div>
      </SignInGate>
    </>
  );
}
