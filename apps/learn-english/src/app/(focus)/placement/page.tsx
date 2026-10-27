import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { PlacementTest } from "@/components/placement/placement-test";

export const metadata: Metadata = pageMetadata({ title: "Kiểm tra trình độ", path: "/placement", description: "Bài kiểm tra ngắn để chọn trình độ bắt đầu phù hợp.", index: false });

export default function PlacementPage() {
  return <PlacementTest />;
}
