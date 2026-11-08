import type { Metadata } from "next";
import { AUTHOR, pageMetadata, SITE_NAME } from "@/lib/site";
import { PageHeader } from "@/components/shell/page-header";
import { LegalLink, type LegalSection, LegalSections } from "@/components/legal/legal-sections";

export const metadata: Metadata = pageMetadata({
  title: "Điều khoản sử dụng",
  path: "/terms",
  description: "Những điều bạn đồng ý khi dùng Tuxedo English: dịch vụ, tài khoản, quy tắc ứng xử, nội dung và trách nhiệm.",
});

const AUTHOR_SITE = AUTHOR.url.replace(/^https?:\/\//, "");

// The terms of use (feature 029). Only describe what the app does; change UPDATED whenever the text changes.
const UPDATED = "08/11/2026";

const SECTIONS: LegalSection[] = [
  {
    title: "Chấp nhận điều khoản",
    body: [
      <>
        Khi dùng {SITE_NAME}, bạn đồng ý với các điều khoản này và với chính sách{" "}
        <LegalLink href="/privacy">Quyền riêng tư</LegalLink>. Nếu không đồng ý, bạn vui lòng ngừng dùng ứng dụng.
      </>,
    ],
  },
  {
    title: "Dịch vụ",
    body: [
      `${SITE_NAME} là ứng dụng học tiếng Anh miễn phí, phi thương mại cho người Việt: từ vựng theo trình độ, ngữ pháp, bài tập, lịch ôn tập và Đấu trường. Phần lớn nội dung dùng được mà không cần tài khoản; đăng nhập bằng Google để lưu tiến độ trên mọi thiết bị.`,
      "Ứng dụng có thể thay đổi, tạm dừng hoặc ngừng một tính năng bất cứ lúc nào, nhất là khi cần sửa lỗi hay giữ an toàn cho người học.",
    ],
  },
  {
    title: "Tài khoản",
    body: [
      "Bạn đăng nhập bằng tài khoản Google của mình và tự giữ an toàn cho tài khoản Google đó. Bạn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của mình.",
      "Không mua bán hay cho thuê tài khoản, không dùng nhiều tài khoản hay công cụ tự động để làm sai lệch chuỗi ngày học, điểm, bảng xếp hạng hoặc kết quả ở Đấu trường.",
    ],
  },
  {
    title: "Quy tắc ứng xử (Nghị định 147/2024/NĐ-CP)",
    body: [
      "Người khác thấy được tên gọi của bạn (trên bảng xếp hạng và ở Đấu trường) và chủ ứng dụng đọc được câu trả lời bạn báo chấm sai. Trong những nội dung này, bạn không được đăng:",
    ],
    list: [
      "nội dung chống lại Nhà nước, gây phương hại an ninh quốc gia hoặc trật tự an toàn xã hội;",
      "nội dung bạo lực, khiêu dâm, kích động thù hằn hay phân biệt đối xử;",
      "nội dung lừa đảo, mạo danh người khác hoặc trái thuần phong mỹ tục;",
      "lời xúc phạm, quấy rối người khác, hoặc tin rác.",
    ],
  },
  {
    title: "Xử lý vi phạm",
    body: [
      "Bạn cũng không được tấn công, dò lỗi hay làm quá tải ứng dụng. Khi có vi phạm, chủ ứng dụng có thể đổi hoặc gỡ tên gọi, xóa bạn khỏi bảng xếp hạng, hoặc chặn tài khoản, có thể không báo trước.",
    ],
  },
  {
    title: "Nội dung học",
    body: [
      "Từ vựng, câu ví dụ và bài ngữ pháp được soạn với sự hỗ trợ của công cụ, rồi được chủ ứng dụng duyệt trước khi đăng. Dù vậy, nội dung vẫn có thể còn sai sót. Nếu thấy một câu bị chấm sai, hãy bấm báo để được xem lại.",
      "Nội dung dùng để tự học, không thay cho giáo viên và không phải chứng chỉ trình độ.",
    ],
  },
  {
    title: "Sở hữu trí tuệ",
    body: [
      <>
        Mã nguồn, giao diện và nội dung do {SITE_NAME} tự soạn thuộc về chủ ứng dụng. Danh sách từ và phiên âm lấy từ các nguồn mở, dùng theo giấy phép của từng nguồn (xem{" "}
        <LegalLink href="/credits">Nguồn dữ liệu</LegalLink>).
      </>,
      "Bạn được dùng ứng dụng để tự học. Không sao chép, phân phối lại hay khai thác thương mại bất kỳ phần nào khi chưa có sự đồng ý bằng văn bản, trừ những gì giấy phép của nguồn mở cho phép.",
    ],
  },
  {
    title: "Ủng hộ",
    body: [
      "Bạn có thể ủng hộ để duy trì máy chủ bằng mã QR ở cuối mỗi trang. Khoản ủng hộ là tự nguyện và không hoàn lại. Nó không mở thêm tính năng nào và không phải hợp đồng mua bán dịch vụ: ứng dụng vẫn miễn phí như nhau với mọi người.",
    ],
  },
  {
    title: "Miễn trừ trách nhiệm",
    body: [
      "Ứng dụng được cung cấp miễn phí, “nguyên trạng”, không cam kết luôn hoạt động liên tục. Chủ ứng dụng không chịu trách nhiệm về gián đoạn do sự cố mạng, do Google, Cloudflare hay các trường hợp bất khả kháng khác.",
      "Bạn nên thỉnh thoảng xuất tiến độ ra file trong Cài đặt để có bản sao của riêng mình.",
    ],
  },
  {
    title: "Thay đổi điều khoản",
    body: ["Điều khoản có thể được cập nhật; ngày cập nhật lần cuối ghi ở đầu trang. Bạn tiếp tục dùng ứng dụng sau khi thay đổi nghĩa là bạn đồng ý với bản mới."],
  },
  {
    title: "Luật áp dụng và giải quyết khiếu nại",
    body: [
      "Điều khoản này tuân theo pháp luật nước Cộng hòa xã hội chủ nghĩa Việt Nam. Mọi tranh chấp trước hết được giải quyết bằng thương lượng, hòa giải thiện chí; nếu không được, sẽ đưa ra cơ quan có thẩm quyền theo quy định của pháp luật.",
    ],
  },
  {
    title: "Liên hệ",
    body: [
      <>
        Có câu hỏi về điều khoản? Liên hệ {AUTHOR.name} qua{" "}
        <a href={AUTHOR.url} className="text-link underline underline-offset-4" rel="noreferrer" target="_blank">
          {AUTHOR_SITE}
        </a>
        .
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Điều khoản sử dụng" description="Những điều bạn đồng ý khi dùng Tuxedo English." />
      <div className="grid max-w-3xl gap-4 px-4 pb-8 md:px-8">
        <LegalSections updated={UPDATED} note="Theo pháp luật Việt Nam." sections={SECTIONS} />
      </div>
    </>
  );
}
