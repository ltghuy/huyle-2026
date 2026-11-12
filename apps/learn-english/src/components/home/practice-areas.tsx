import Link from "next/link";
import { SectionHeading } from "@/components/shell/section-heading";
import { ArrowRight, BookOpenText, Headphones, NotebookPen, PenLine, RotateCcw, Shuffle, type LucideIcon } from "lucide-react";

// Icons match the sidebar's where the page has one there (`components/shell/nav.ts`).
const AREAS: { href: string; icon: LucideIcon; title: string; text: string }[] = [
  { href: "/vocabulary", icon: BookOpenText, title: "Từ vựng", text: "Từ A1 đến C1 theo chủ đề, kèm phiên âm, audio và ví dụ." },
  { href: "/grammar", icon: NotebookPen, title: "Ngữ pháp", text: "12 thì và các điểm ngữ pháp, giải thích bằng tiếng Việt." },
  { href: "/exercises?tab=sentence", icon: PenLine, title: "Viết câu", text: "Dịch 10 câu theo chủ đề và trình độ bạn chọn." },
  { href: "/exercises?tab=dictation", icon: Headphones, title: "Nghe chép", text: "Nghe một câu rồi gõ lại đúng từng chữ." },
  { href: "/irregular-verbs", icon: Shuffle, title: "Động từ bất quy tắc", text: "Ba dạng của động từ, nhóm theo quy luật để dễ nhớ." },
  { href: "/review", icon: RotateCcw, title: "Ôn tập", text: "Những từ đến hạn ôn hôm nay, trước khi bạn quên." },
];

/** Links to the main practice areas (019 AC-004). */
export function PracticeAreas() {
  return (
    <section aria-labelledby="areas-title" className="px-4 md:px-8">
      <SectionHeading id="areas-title" eyebrow="Luyện tập" title="Muốn luyện thêm? Chọn phần bạn thích" />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-colors duration-200 hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                Bắt đầu <ArrowRight className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
