import type { Metadata } from "next";
import { SignInGate } from "@/components/account/sign-in-gate";
import { BackToHub, DuelSetup } from "@/components/arena/duel-setup";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Đấu 1-1",
  path: "/arena/1v1",
  description: "Tạo phòng đấu 1-1, chọn chế độ, trình độ và số hiệp, rồi gửi mã cho bạn bè.",
});

/** Feature 024: set up a 1-1 duel on one screen. */
export default function ArenaDuelPage() {
  return (
    <div className="px-4 pt-[4.25rem] pb-10 md:px-8 md:pt-[4.75rem]">
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <div>
          <BackToHub />
        </div>
        <SignInGate area="arena">
          <DuelSetup />
        </SignInGate>
      </div>
    </div>
  );
}
