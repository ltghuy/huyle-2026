import type { Metadata } from "next";
import { SignInGate } from "@/components/account/sign-in-gate";
import { CommunityList } from "@/components/arena/community-list";
import { BackToHub } from "@/components/arena/duel-setup";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Cộng đồng",
  path: "/arena/community",
  description: "Các phòng Đấu trường đang chờ người chơi: đấu 1-1 hoặc đấu đội, vào ngay không cần mã.",
});

/** Feature 041: the public Arena lobbies with a free seat. Guests are asked to sign in (AC-014). */
export default function ArenaCommunityPage() {
  return (
    <div className="px-4 pt-[4.25rem] pb-10 md:px-8 md:pt-[4.75rem]">
      <div className="mx-auto grid w-full max-w-3xl gap-4">
        <div>
          <BackToHub />
        </div>
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold">Cộng đồng</h1>
          <p className="text-muted-foreground">Phòng đang chờ người chơi, mới nhất ở trên. Danh sách chỉ đổi khi bạn bấm Làm mới.</p>
        </div>
        <SignInGate area="arena">
          <CommunityList />
        </SignInGate>
      </div>
    </div>
  );
}
