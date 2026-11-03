import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HeroBadge } from "@/components/shell/page-hero";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { OwlShowcase } from "./owl-showcase";

/**
 * The home page's opening (019 AC-001, 021 AC-003): the wordmark, tagline and the way into today's
 * lesson, with the 3D owl. Stacked and centred on phones and tablets; from `lg` the text sits left and the
 * owl, larger, on the right.
 */
export function HomeHero() {
  return (
    <section aria-labelledby="page-title" className="relative isolate overflow-hidden px-4 pt-[4.25rem] pb-8 md:px-8 md:pt-[4.75rem] md:pb-10">
      {/* A soft glow in the theme's accent colour, behind the owl from lg; decoration only. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 max-w-3xl rounded-full bg-primary/15 blur-3xl lg:inset-x-auto lg:top-10 lg:right-0 lg:h-88 lg:w-[36rem]" />
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <OwlShowcase className="lg:order-last lg:mr-12 xl:mr-24" />
        <div className="text-center lg:text-left">
          <HeroBadge icon={Flame} text="Mỗi ngày một chút, nhớ lâu hơn" />
          <h1 id="page-title" className="mt-4 pb-1 text-5xl font-extrabold tracking-tight md:text-7xl">
            {SITE_NAME}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg lg:mx-0">
            Học từ vựng, ngữ pháp và viết câu tiếng Anh trong một bài ngắn mỗi ngày. Lịch ôn tập nhắc lại từ đúng lúc bạn sắp quên.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/lesson" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
              Vào bài hôm nay <ArrowRight aria-hidden />
            </Link>
            <Link href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>
              Xem cách học
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Miễn phí · Đăng nhập bằng Google</p>
        </div>
      </div>
    </section>
  );
}
