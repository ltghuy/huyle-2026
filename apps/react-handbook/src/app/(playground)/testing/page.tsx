import { SectionIndex, sectionMetadata } from "@/components/playground/section-index";

export const metadata = sectionMetadata("testing");

export default function TestingPage() {
  return (
    <SectionIndex
      id="testing"
      intro="Short handbooks on knowing the app still works: which tests to write and at what level, a real end-to-end suite for this site, scenarios that people outside engineering can read, and experiments that test the idea itself."
    />
  );
}
