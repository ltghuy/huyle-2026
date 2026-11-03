import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The closing call to action at the end of the home page (019 AC-005). */
export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 md:px-8">
      <div className="flex flex-col gap-5 rounded-2xl bg-primary p-6 text-primary-foreground md:flex-row md:items-center md:justify-between md:p-10">
        <div className="max-w-xl">
          <h2 id="cta-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
            Hôm nay bạn đã học chưa?
          </h2>
          <p className="mt-2 opacity-90">Một bài ngắn là đủ giữ chuỗi ngày học. Bắt đầu ngay, miễn phí với tài khoản Google.</p>
        </div>
        <Link href="/lesson" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 shrink-0 self-start px-5 md:self-auto")}>
          Vào bài hôm nay <ArrowRight aria-hidden />
        </Link>
      </div>
    </section>
  );
}
