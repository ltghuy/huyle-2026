import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot/mascot";
import { SignInButton } from "./sign-in-button";

/** The areas guests can't open (feature 022, AC-009, AC-010, AC-011). */
export type LockedArea = "lesson" | "streak" | "review" | "hard-words" | "profile" | "grammar" | "exercises" | "irregular-verbs" | "arena" | "friends";

const COPY: Record<LockedArea, { title: string; text: string; mood: MascotMood }> = {
  lesson: { title: "Đăng nhập để học bài hôm nay", text: "Mỗi ngày một bài ngắn: ôn từ cũ, học từ mới và luyện câu. Tiến độ được lưu vào tài khoản, học trên máy nào cũng tiếp tục được.", mood: "cheer" },
  streak: { title: "Đăng nhập để giữ chuỗi ngày học", text: "Chuỗi ngày học và điểm của bạn được lưu vào tài khoản Google.", mood: "happy" },
  review: { title: "Đăng nhập để ôn tập", text: "Lịch ôn tập nhắc lại từ đúng lúc bạn sắp quên. Đăng nhập để bắt đầu.", mood: "think" },
  "hard-words": { title: "Đăng nhập để xem từ khó", text: "Những từ bạn hay sai sẽ được gom lại ở đây để luyện thêm.", mood: "think" },
  profile: { title: "Đăng nhập để xem hồ sơ", text: "Lịch chuyên cần, bảng xếp hạng và biểu đồ tiến bộ có sau khi bạn đăng nhập.", mood: "happy" },
  grammar: { title: "Đăng nhập để học ngữ pháp", text: "Xem bài học, ví dụ và luyện tập cho từng chủ điểm ngữ pháp.", mood: "think" },
  exercises: { title: "Đăng nhập để làm bài tập", text: "Mọi bộ bài tập đều mở sau khi bạn đăng nhập.", mood: "cheer" },
  "irregular-verbs": { title: "Đăng nhập để luyện động từ", text: "Bạn vẫn xem được bảng động từ. Đăng nhập để luyện các dạng của chúng.", mood: "think" },
  arena: { title: "Đăng nhập để vào Đấu trường", text: "Thách đấu bạn bè bằng mã phòng: cùng một câu hỏi, ai trả lời đúng trước thì ghi điểm.", mood: "cheer" },
  friends: { title: "Đăng nhập để xem bạn bè", text: "Kết bạn với người bạn đã đấu cùng ở Đấu trường và xem ai đang trực tuyến.", mood: "happy" },
};

/**
 * What a guest sees in place of a locked area: what signing in unlocks, the button and the privacy
 * note. Pages with a hero already show the cat, so the prompt shows a lock instead; focus screens
 * (no hero) pass `mascot`.
 */
export function SignInPrompt({ area, tour, className, mascot = false }: { area: LockedArea; tour?: string; className?: string; mascot?: boolean }) {
  const { title, text, mood } = COPY[area];
  return (
    <div data-tour={tour} className={className}>
      <div className="mx-4 flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-10 text-center md:mx-8">
        {mascot ? (
          <Mascot mood={mood} size={72} />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
            <LockKeyhole className="size-6" />
          </span>
        )}
        <p className="text-lg font-semibold">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{text}</p>
        <SignInButton />
        <p className="text-xs text-muted-foreground">
          Miễn phí. Xem{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            ứng dụng lưu những gì
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
