import type { Metadata } from "next";
import { PlacementTest } from "@/components/placement/placement-test";

export const metadata: Metadata = { title: "Kiểm tra trình độ" };

export default function PlacementPage() {
  return <PlacementTest />;
}
