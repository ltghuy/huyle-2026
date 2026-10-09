import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("performance-accessibility");

export default function PerformanceAccessibilityPage() {
  return (
    <SectionIndex
      id="performance-accessibility"
      intro="Short handbooks on making pages fast and usable by everyone: the main concepts, what matters most, and live demos you can measure in your own browser."
    />
  );
}
