import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { pageMetadata } from "@/lib/site";
import { ClosingCta } from "@/components/home/closing-cta";
import { AttendanceSummary } from "@/components/profile/attendance-summary";
import { ProgressInsights } from "@/components/profile/progress-insights";
import { Owl } from "@/components/mascot/owl";
import { PageHero } from "@/components/shell/page-hero";
import { SectionHeading } from "@/components/shell/section-heading";

const DESCRIPTION = "Điểm chuyên cần, chuỗi ngày học và tiến bộ của bạn.";
const BADGE = { icon: Sprout, text: "Mỗi ngày bạn lại tiến thêm một chút" };

export const metadata: Metadata = pageMetadata({ title: "Hồ sơ", path: "/profile", description: DESCRIPTION, index: false });

/** `/profile`, laid out like the home page: hero, titled sections and the closing band (feature 019, AC-006). */
export default function ProfilePage() {
  return (
    <>
      <PageHero badge={BADGE} title="Hồ sơ của bạn" description={DESCRIPTION} mascot={<Owl mood="cheer" size={112} className="mx-auto" />} />
      <div className="grid gap-14 pb-8 md:gap-20">
        <section aria-labelledby="attendance-heading" className="grid gap-4">
          <div className="px-4 md:px-8">
            <SectionHeading id="attendance-heading" eyebrow="Chuyên cần" title="Chuỗi ngày học của bạn" description="Điểm, chuỗi ngày và lịch học 12 tuần gần đây." />
          </div>
          <AttendanceSummary />
        </section>
        <section aria-labelledby="progress-heading" className="grid gap-4">
          <div className="px-4 md:px-8">
            <SectionHeading id="progress-heading" eyebrow="Tiến bộ" title="Bạn đã học được bao nhiêu" description="Học hết một trình độ để nhận chứng nhận của trình độ đó." />
          </div>
          <ProgressInsights />
        </section>
        <ClosingCta />
      </div>
    </>
  );
}
