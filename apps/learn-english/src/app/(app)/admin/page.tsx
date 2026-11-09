import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminScreen } from "@/components/admin/admin-screen";
import { PageHero } from "@/components/shell/page-hero";
import { pageMetadata } from "@/lib/site";

const DESCRIPTION = "Người dùng, câu chờ duyệt và nội dung khóa học.";
const BADGE = { icon: ShieldCheck, text: "Chỉ dành cho người quản trị" };

export const metadata: Metadata = pageMetadata({ title: "Quản trị", path: "/admin", description: DESCRIPTION, index: false });

/** `/admin` (feature 038): a static shell; who may see it is checked by the admin routes. */
export default function AdminPage() {
  return (
    <>
      <PageHero size="sm" badge={BADGE} title="Quản trị" description={DESCRIPTION} />
      {/* Reads ?tab=, so it needs a Suspense boundary to keep the page static. */}
      <Suspense fallback={null}>
        <AdminScreen />
      </Suspense>
    </>
  );
}
