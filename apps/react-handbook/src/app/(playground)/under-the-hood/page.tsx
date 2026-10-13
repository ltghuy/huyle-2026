import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("under-the-hood");

export default function UnderTheHoodPage() {
  return (
    <SectionIndex
      id="under-the-hood"
      intro="What a scaffolding command hides: how source files become the bundle the browser loads, and how React turns JSX into DOM updates. Each page names the real tools, then lets you step through a simplified model of what they do."
    />
  );
}
