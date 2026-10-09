import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("browser-platform");

export default function BrowserPlatformPage() {
  return (
    <SectionIndex
      id="browser-platform"
      intro="Short handbooks on what the browser and the network do for every page: the main concepts, what matters most, and live demos that run in your own browser."
    />
  );
}
