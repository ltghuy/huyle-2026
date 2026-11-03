import { Flame, PenLine, RotateCcw, Volume2, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/shell/section-heading";

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Flame, title: "Giữ chuỗi ngày học", text: "Mỗi bài xong thêm một ngày vào chuỗi và 20 điểm, nên bạn muốn quay lại ngày mai." },
  { icon: RotateCcw, title: "Ôn đúng lúc sắp quên", text: "Lịch ôn tập ngắt quãng đưa từ cũ quay lại vừa kịp trước khi bạn quên." },
  { icon: Volume2, title: "Phát âm có IPA và audio", text: "Từ nào cũng có phiên âm và giọng đọc, câu ví dụ cũng vậy." },
  { icon: PenLine, title: "Viết câu theo chủ đề", text: "Dịch câu tiếng Việt sang tiếng Anh, chấm ngay, bấm vào từng từ để xem nghĩa." },
];

const DEMO_WORDS = ["Her", "idea", "is", "very", "original."];

/** Why the method works, next to a static example exercise (019 AC-003). */
export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-6 px-4 md:px-8">
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <SectionHeading
            id="how-title"
            eyebrow="Cách học"
            title="Ít mà đều, tiếng Anh sẽ ở lại"
            description="Bài học mỗi ngày gồm ôn tập, từ mới, ngữ pháp, đặt câu và một bài viết ngắn, khoảng 15 phút."
          />
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <figure className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
          <figcaption className="text-sm font-medium text-muted-foreground">Ví dụ: Sắp xếp câu</figcaption>
          <p className="mt-3 text-lg">Ý tưởng của cô ấy rất độc đáo.</p>
          <div className="mt-4 flex flex-wrap gap-2 border-b-2 border-dashed pb-3" lang="en">
            {DEMO_WORDS.map((word) => (
              <span key={word} className="inline-flex min-h-11 items-center rounded-lg border bg-background px-3 text-lg shadow-xs">
                {word}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
            <span aria-hidden className="size-2 rounded-full bg-success" /> Chính xác! Bấm vào từng từ để xem nghĩa.
          </p>
        </figure>
      </div>
    </section>
  );
}
