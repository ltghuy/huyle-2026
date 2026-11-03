import { SignInGate } from "@/components/account/sign-in-gate";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/home/closing-cta";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PracticeAreas } from "@/components/home/practice-areas";
import { SectionHeading } from "@/components/shell/section-heading";
import { TodayLesson } from "@/components/lesson/today-lesson";
import { homeLd, JsonLd } from "@/lib/json-ld";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

/** Home: the hero, today's lesson right under it, then how it works, the practice areas and a closing call (feature 019). */
export default function HomePage() {
  return (
    <>
      <JsonLd data={homeLd()} />
      <HomeHero />
      <div className="grid gap-14 pb-8 md:gap-20">
        <section id="today" aria-labelledby="today-heading" className="grid gap-3">
          <div className="px-4 md:px-8">
            <SectionHeading id="today-heading" eyebrow="Hôm nay" title="Bài học hôm nay" description="Ôn lại bài cũ, học từ mới và luyện câu, mỗi ngày một chút." />
          </div>
          <SignInGate area="lesson" tour="lesson-card">
            <TodayLesson />
          </SignInGate>
        </section>
        <HowItWorks />
        <PracticeAreas />
        <ClosingCta />
      </div>
    </>
  );
}
