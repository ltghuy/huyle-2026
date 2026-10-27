import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { AttendanceSummary } from "@/components/profile/attendance-summary";
import { ProgressInsights } from "@/components/profile/progress-insights";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = pageMetadata({ title: "Hồ sơ", path: "/profile", description: "Điểm chuyên cần, chuỗi ngày học và tiến bộ của bạn.", index: false });

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ" description="Điểm chuyên cần, chuỗi ngày học và tiến bộ của bạn." />
      <div className="grid gap-8">
        <section aria-labelledby="attendance-heading" className="grid gap-3">
          <h2 id="attendance-heading" className="px-4 text-lg font-semibold md:px-8">
            Chuyên cần
          </h2>
          <AttendanceSummary />
        </section>
        <section aria-labelledby="progress-heading" className="grid gap-3">
          <h2 id="progress-heading" className="px-4 text-lg font-semibold md:px-8">
            Tiến bộ
          </h2>
          <ProgressInsights />
        </section>
      </div>
    </>
  );
}
