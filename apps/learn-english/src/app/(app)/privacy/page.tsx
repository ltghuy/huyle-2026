import type { Metadata } from "next";
import { AUTHOR, pageMetadata, SITE_NAME } from "@/lib/site";
import { PageHeader } from "@/components/shell/page-header";
import { LegalLink, type LegalSection, LegalSections } from "@/components/legal/legal-sections";

export const metadata: Metadata = pageMetadata({
  title: "Quyền riêng tư",
  path: "/privacy",
  description: "Streak Daily lưu những gì, để làm gì, ai thấy được, giữ bao lâu, quyền của bạn và cách xóa.",
});

const AUTHOR_SITE = AUTHOR.url.replace(/^https?:\/\//, "");

// What the app keeps and why (feature 022 AC-025, feature 029). Keep in step with what the code stores:
// account tables and progress (src/server/db/schema.ts), anonymous stats, claims, the board and Arena,
// and the per-IP limiters (src/server/auth/throttle.ts), which never store the IP.
// Change UPDATED whenever the text changes.
const UPDATED = "08/11/2026";

const SECTIONS: LegalSection[] = [
  {
    title: "Giới thiệu và phạm vi",
    body: [
      `${SITE_NAME} (english.huyle.work) là ứng dụng học tiếng Anh miễn phí, phi thương mại, do ${AUTHOR.name} phát triển và vận hành. Trang này cho bạn biết ứng dụng xử lý dữ liệu cá nhân của bạn thế nào, theo Nghị định 13/2023/NĐ-CP ngày 17/04/2023 về bảo vệ dữ liệu cá nhân.`,
      "Khi đăng nhập, bạn đồng ý để ứng dụng xử lý dữ liệu như mô tả dưới đây. Bạn có thể rút lại sự đồng ý bất cứ lúc nào (mục 8).",
    ],
  },
  {
    title: "Dữ liệu ứng dụng thu thập",
    body: [
      "Khi chưa đăng nhập, bạn vẫn học từ vựng và làm bài kiểm tra trình độ được. Tiến độ (từ đã đánh dấu, bộ từ đang học, trình độ) chỉ nằm trong trình duyệt của bạn; ứng dụng không biết bạn là ai.",
      "Khi bạn đăng nhập với Google, ứng dụng chỉ nhận tên, địa chỉ email và ảnh đại diện. Ứng dụng không đọc được Gmail, Drive, danh bạ hay bất cứ thứ gì khác, và không bao giờ biết mật khẩu của bạn.",
      "Ứng dụng lưu tiến độ học trong tài khoản: từ và chủ điểm ngữ pháp đã học cùng lịch ôn tập, các bài học, chuỗi ngày học và điểm, câu trả lời trong bài tập (dùng để tìm từ khó), cùng các cài đặt học như trình độ, bộ từ đang học và tên gọi.",
      "Khi bạn đấu ở Đấu trường, ứng dụng lưu số trận thắng, thua cùng 50 trận gần nhất của bạn: kết quả, điểm từng hiệp, thời gian, và tên cùng ảnh đại diện mà đối thủ dùng trong trận.",
      "Khi bạn báo một câu dịch bị chấm sai, câu trả lời đó và câu gốc được gửi cho chủ ứng dụng xem lại, không kèm tên hay email của bạn.",
      "Khi “Gửi thống kê ẩn danh” đang bật (trong Cài đặt), ứng dụng đếm số bài học hoàn thành, số bài kiểm tra trình độ, số câu đã làm theo từng dạng bài và những từ hay bị trả lời sai. Mỗi thiết bị chỉ được nhận diện bằng một mã đã mã hóa, đổi mỗi ngày. Với tài khoản, ứng dụng ghi thêm những tuần bạn có học và trên bao nhiêu thiết bị (mỗi thiết bị là một mã đã mã hóa).",
      "Để biết bạn còn đăng nhập, trình duyệt giữ một cookie phiên. Địa chỉ IP của bạn chỉ được dùng để chặn việc gửi quá nhiều yêu cầu trong thời gian ngắn (đăng nhập, ghi bảng xếp hạng, tạo hoặc vào phòng đấu) và không được lưu lại.",
    ],
  },
  {
    title: "Mục đích xử lý",
    body: ["Ứng dụng chỉ dùng dữ liệu của bạn để:"],
    list: [
      "đăng nhập và nhận ra tài khoản của bạn;",
      "đồng bộ tiến độ giữa các thiết bị, lên lịch ôn tập và tìm từ khó cho bạn;",
      "hiện bảng xếp hạng và tổ chức trận đấu ở Đấu trường, khi bạn chọn tham gia;",
      "sửa những câu bị chấm sai mà bạn đã báo;",
      "đếm số liệu tổng để biết có bao nhiêu người học và cải thiện bài học;",
      "chống lạm dụng và giữ ứng dụng an toàn.",
    ],
  },
  {
    title: "Người khác thấy gì",
    body: [
      "Chỉ khi bạn chọn tham gia bảng xếp hạng: tên gọi bạn tự đặt (hoặc tên Google nếu chưa đặt) và chuỗi ngày học của bạn; điểm chỉ dùng để xếp hạng khi bằng chuỗi, không hiện ra. Mỗi tài khoản Google chỉ có một chỗ trên bảng. Email không bao giờ hiện cho người khác.",
      "Ở Đấu trường, đối thủ thấy tên và ảnh đại diện của bạn trong trận, và sau đó trong lịch sử đấu của họ.",
      "Chủ ứng dụng chỉ xem được con số thống kê tổng, không xem được tên hay email gắn với số liệu nào.",
    ],
  },
  {
    title: "Bên thứ ba",
    body: [
      "Ứng dụng không bán, cho thuê hay trao đổi dữ liệu của bạn, không chạy quảng cáo và không dùng công cụ theo dõi của bên thứ ba. Dữ liệu chỉ đi qua:",
    ],
    list: [
      "Google, để bạn đăng nhập;",
      "Cloudflare, nơi chạy ứng dụng và lưu dữ liệu. Máy chủ của Google và Cloudflare có thể đặt ngoài Việt Nam;",
      "cơ quan nhà nước có thẩm quyền, chỉ khi có yêu cầu hợp lệ theo quy định của pháp luật.",
    ],
  },
  {
    title: "Thời gian lưu trữ",
    body: [
      "Tài khoản và tiến độ được giữ cho đến khi bạn xóa tài khoản. Phiên đăng nhập kéo dài 30 ngày kể từ lần bạn dùng ứng dụng gần nhất.",
      "Câu trả lời bạn báo chấm sai bị xóa 90 ngày sau khi được xem xét. Ai không học trong 90 ngày sẽ tự được xóa khỏi bảng xếp hạng. Đấu trường chỉ giữ 50 trận gần nhất của bạn.",
      "Nếu bạn từng dùng mã đồng bộ: mã cũ chỉ còn dùng được để gộp tiến độ vào tài khoản trong một thời gian ngắn. Sau khi gộp, hoặc khi hết thời gian đó, dữ liệu của mã bị xóa.",
    ],
  },
  {
    title: "Quyền của bạn",
    body: ["Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:"],
    list: [
      "được biết dữ liệu nào được xử lý và để làm gì: chính là trang này;",
      "đồng ý hoặc rút lại sự đồng ý: tắt “Gửi thống kê ẩn danh”, rời bảng xếp hạng hoặc xóa tài khoản trong Cài đặt;",
      "xem và lấy bản sao dữ liệu: chọn “Xuất tiến độ” trong Cài đặt để tải tiến độ về máy;",
      "chỉnh sửa: đổi tên gọi trong Cài đặt; tên và ảnh Google được đổi trong tài khoản Google của bạn;",
      "xóa dữ liệu: chọn “Xóa tài khoản” trong Cài đặt;",
      "hạn chế hoặc phản đối việc xử lý, khiếu nại và tố cáo: liên hệ chủ ứng dụng (mục 10) hoặc cơ quan nhà nước có thẩm quyền.",
    ],
  },
  {
    title: "Rút lại đồng ý và xóa dữ liệu",
    body: [
      <>
        Vào{" "}
        <LegalLink href="/settings#tai-khoan">Cài đặt</LegalLink>, chọn “Xóa tài khoản”: tài khoản, toàn bộ tiến độ, các tuần đã học, chỗ trên bảng xếp hạng và lịch sử đấu bị xóa ngay khỏi máy chủ và khỏi thiết bị, không lấy lại được. Trong lịch sử đấu của người từng đấu với bạn, tên và ảnh của bạn cũng bị xóa. Bạn có thể xuất tiến độ ra file trước.
      </>,
      "Đăng xuất chỉ xóa tiến độ khỏi thiết bị đang dùng; tài khoản vẫn giữ nguyên và bạn đăng nhập lại là có lại tiến độ.",
      "Nếu không đăng nhập được để tự xóa, hãy liên hệ chủ ứng dụng (mục 10).",
    ],
  },
  {
    title: "Bảo vệ dữ liệu",
    body: [
      "Mọi kết nối tới ứng dụng đều qua HTTPS. Ứng dụng không lưu mật khẩu vì việc đăng nhập do Google xử lý. Thống kê chỉ dùng mã thiết bị đã mã hóa, và địa chỉ IP không được lưu. Mỗi tài khoản chỉ đọc và ghi được tiến độ của chính mình.",
    ],
  },
  {
    title: "Liên hệ",
    body: [
      <>
        {SITE_NAME} do {AUTHOR.name} vận hành. Có câu hỏi hay yêu cầu về dữ liệu của bạn? Liên hệ qua{" "}
        <a href={AUTHOR.url} className="text-link underline underline-offset-4" rel="noreferrer" target="_blank">
          {AUTHOR_SITE}
        </a>
        . Xem thêm <LegalLink href="/terms">Điều khoản sử dụng</LegalLink>.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Quyền riêng tư" description="Streak Daily lưu những gì, để làm gì, ai thấy được, giữ bao lâu, quyền của bạn và cách xóa." />
      <div className="grid max-w-3xl gap-4 px-4 pb-8 md:px-8">
        <LegalSections updated={UPDATED} note="Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân." sections={SECTIONS} />
      </div>
    </>
  );
}
