import type { Metadata } from "next";
import Link from "next/link";
import { AUTHOR, pageMetadata } from "@/lib/site";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = pageMetadata({
  title: "Quyền riêng tư",
  path: "/privacy",
  description: "Streak Daily lưu những gì, để làm gì, ai thấy được, giữ bao lâu và cách xóa.",
});

// What the app keeps and why (feature 022, AC-025). Keep in step with what the code stores:
// account tables and progress (src/server/db/schema.ts), anonymous stats, claims and the board.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Khi bạn chưa đăng nhập",
    body: [
      "Bạn học từ vựng và làm bài kiểm tra trình độ mà không cần tài khoản. Tiến độ (từ đã đánh dấu, bộ từ đang học, trình độ) chỉ nằm trong trình duyệt của bạn; ứng dụng không biết bạn là ai.",
    ],
  },
  {
    title: "Khi bạn đăng nhập với Google",
    body: [
      "Từ tài khoản Google, ứng dụng chỉ nhận tên, địa chỉ email và ảnh đại diện. Ứng dụng không đọc được Gmail, Drive, danh bạ hay bất cứ thứ gì khác, và không bao giờ biết mật khẩu của bạn.",
      "Ứng dụng lưu tiến độ học của bạn trong tài khoản: từ và chủ điểm ngữ pháp đã học cùng lịch ôn tập, các bài học, chuỗi ngày học và điểm, câu trả lời trong bài tập (dùng để tìm từ khó), cùng các cài đặt học như trình độ, bộ từ đang học và tên gọi. Nhờ vậy tiến độ giống nhau trên mọi thiết bị bạn đăng nhập.",
      "Khi bạn đấu ở Đấu trường, ứng dụng lưu số trận thắng, thua cùng 50 trận gần nhất của bạn: kết quả, điểm từng hiệp, thời gian, và tên cùng ảnh đại diện mà đối thủ dùng trong trận.",
      "Để biết bạn còn đăng nhập, trình duyệt giữ một cookie phiên. Phiên kéo dài 30 ngày kể từ lần bạn dùng ứng dụng gần nhất; mỗi lần bạn học, phiên được gia hạn.",
    ],
  },
  {
    title: "Câu trả lời bạn gửi để xem lại",
    body: [
      "Khi bạn bấm báo rằng một câu dịch bị chấm sai, câu trả lời đó được gửi cho chủ ứng dụng xem lại. Chỉ câu trả lời và câu gốc được gửi, không kèm tên hay email của bạn. Câu đã được xem xét sẽ bị xóa sau 90 ngày.",
    ],
  },
  {
    title: "Thống kê sử dụng",
    body: [
      "Khi “Gửi thống kê ẩn danh” đang bật (trong Cài đặt), ứng dụng đếm số bài học hoàn thành, số bài kiểm tra trình độ, số câu đã làm theo từng dạng bài và những từ hay bị trả lời sai. Mỗi thiết bị chỉ được nhận diện bằng một mã đã mã hóa, đổi mỗi ngày, nên không thể lần ra ai.",
      "Với tài khoản, ứng dụng ghi thêm những tuần bạn có học và trên bao nhiêu thiết bị (mỗi thiết bị là một mã đã mã hóa), để biết có bao nhiêu người học, quay lại và học trên nhiều máy. Chủ ứng dụng chỉ xem được con số tổng, không xem được tên hay email của ai.",
      "Tắt “Gửi thống kê ẩn danh” để không được đếm, cả khi chưa đăng nhập lẫn khi đã đăng nhập.",
    ],
  },
  {
    title: "Người khác thấy gì",
    body: [
      "Chỉ khi bạn chọn tham gia bảng xếp hạng: tên gọi bạn tự đặt (hoặc tên Google nếu chưa đặt) và chuỗi ngày học của bạn; điểm chỉ dùng để xếp hạng khi bằng chuỗi, không hiện ra. Mỗi tài khoản Google chỉ có một chỗ trên bảng. Email và ảnh đại diện không bao giờ hiện cho người khác.",
      "Bạn rời bảng bất cứ lúc nào trong Cài đặt. Ai không học trong 90 ngày sẽ tự được xóa khỏi bảng.",
      "Ở Đấu trường, đối thủ thấy tên và ảnh đại diện của bạn trong trận, và sau đó trong lịch sử đấu của họ.",
    ],
  },
  {
    title: "Ai giữ dữ liệu",
    body: [
      "Google xử lý việc đăng nhập. Ứng dụng và dữ liệu được lưu trên Cloudflare. Ứng dụng không bán dữ liệu, không chạy quảng cáo và không dùng công cụ theo dõi của bên thứ ba.",
    ],
  },
  {
    title: "Giữ bao lâu và cách xóa",
    body: [
      "Tài khoản và tiến độ được giữ cho đến khi bạn xóa tài khoản. Vào Cài đặt, chọn “Xóa tài khoản”: tài khoản, toàn bộ tiến độ, các tuần đã học, chỗ trên bảng xếp hạng và lịch sử đấu bị xóa khỏi máy chủ và khỏi thiết bị, không lấy lại được. Trong lịch sử đấu của người từng đấu với bạn, tên và ảnh của bạn cũng bị xóa. Bạn có thể xuất tiến độ ra file trước.",
      "Đăng xuất chỉ xóa tiến độ khỏi thiết bị đang dùng; tài khoản vẫn giữ nguyên và bạn đăng nhập lại là có lại tiến độ.",
      "Nếu bạn từng dùng mã đồng bộ: mã cũ chỉ còn dùng được để gộp tiến độ vào tài khoản trong một thời gian ngắn. Sau khi gộp, hoặc khi hết thời gian đó, dữ liệu của mã bị xóa.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Quyền riêng tư" description="Streak Daily lưu những gì, để làm gì, ai thấy được, giữ bao lâu và cách xóa." />
      <div className="grid max-w-3xl gap-4 px-4 pb-8 md:px-8">
        {SECTIONS.map((section) => (
          <section key={section.title} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{section.title}</h2>
            {section.body.map((text) => (
              <p key={text} className="mt-2 text-sm text-muted-foreground">
                {text}
              </p>
            ))}
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          Quản lý tài khoản trong{" "}
          <Link href="/settings#tai-khoan" className="text-link underline underline-offset-4">
            Cài đặt
          </Link>
          . Có câu hỏi về dữ liệu của bạn? Liên hệ {AUTHOR.name} qua{" "}
          <a href={AUTHOR.url} className="text-link underline underline-offset-4" rel="noreferrer" target="_blank">
            {AUTHOR.url.replace(/^https?:\/\//, "")}
          </a>
          .
        </p>
      </div>
    </>
  );
}
