/**
 * Vietnamese content overlay. Each entry spreads the English item (from the
 * canonical content modules) so structural fields — tech, company, hrefs, icons,
 * image srcs, `current`, `index`, `links` — stay shared and only the translated
 * prose is overridden. Keep the arrays index-aligned with their English source.
 */
import { profile as profileEn, type Profile } from "./profile";
import { experience as experienceEn, type ExperienceItem } from "./experience";
import { projects as projectsEn, type Project } from "./projects";
import { skillGroups as skillGroupsEn, type SkillGroup } from "./skills";
import { galleryImages as galleryEn, type GalleryImage } from "./gallery";

export const profileVi: Profile = {
  ...profileEn,
  title: "Kỹ sư phần mềm · Phát triển AI-Native",
  location: "Thành phố Hồ Chí Minh, Việt Nam",
};

const experienceOverrides: Array<Partial<ExperienceItem>> = [
  {
    role: "Kỹ sư Frontend",
    context:
      "Naver Care (phân loại triệu chứng bằng AI) và Naver Healthcare (bộ sản phẩm PHR tại nhà) · Việt Nam & Hàn Quốc",
    period: "Th11 2025 – Hiện tại",
    location: "Thành phố Hồ Chí Minh, Việt Nam",
    highlights: [
      "Lập trình viên chính của Symptom Editor Admin, công cụ kéo-thả giúp đội ngũ y tế tự thiết kế và xuất bản bộ câu hỏi y khoa phân nhánh. Những thay đổi trước đây kỹ sư phải mất vài ngày giờ đội y tế tự làm được.",
      "Xây dựng các lớp bảo vệ khi soạn thảo: kiểm tra để phát hiện luồng câu hỏi bị đứt, chế độ mô phỏng để xem trước trải nghiệm của bệnh nhân, và lịch sử phiên bản với quy trình duyệt-rồi-kích-hoạt.",
      "Phát triển Naver Care Symptom Checker cho người dùng cuối, một bộ câu hỏi thích ứng giữ lại tiến trình khi tải lại trang, phục vụ cả luồng công khai lẫn đối tác bệnh viện bằng tiếng Hàn và tiếng Anh.",
      "Làm frontend cho BodyReport (InBody), sản phẩm PHR đầu tiên của Naver Healthcare, và ra mắt đúng hạn cho đợt phát hành P1.",
      "Dẫn dắt việc chuẩn hóa design system trên một codebase đa ứng dụng lớn. Các đội anh em hiện dùng chung thư viện component này.",
    ],
  },
  {
    role: "Kỹ sư Frontend / Trưởng nhóm",
    context:
      "InjuryEx, nền tảng quy trình legal-tech và y tế với nhiều bên liên quan",
    period: "Th2 2024 – Th11 2025",
    location: "Từ xa",
    highlights: [
      "Khởi tạo InjuryEx từ con số không. Mình chọn stack frontend, kiến trúc và quy ước, về sau trở thành chuẩn của cả đội.",
      "Dẫn dắt đội frontend: lập kế hoạch sprint, ước lượng, kèm cặp thành viên và review code.",
      "Thiết kế các quy trình giữa bệnh nhân, luật sư, bác sĩ và nhà thuốc, gồm cả thanh toán tự động qua ANZ và Xero kèm thông báo SMS/email.",
      "Viết các extension VS Code nội bộ cho những tác vụ lặp lại, và làm cả full-stack (Python, FastAPI) khi đội cần đẩy nhanh tiến độ.",
    ],
  },
  {
    role: "Kỹ sư Frontend",
    context:
      "Australian Epilepsy Project (Viện Florey), nền tảng nghiên cứu chẩn đoán hình ảnh do chính phủ tài trợ",
    period: "Th4 2023 – Th2 2024",
    location: "Từ xa",
    highlights: [
      "Chuyển các yêu cầu lâm sàng thành tính năng React chạy production cho mạng lưới chẩn đoán động kinh quốc gia.",
      "Tích hợp OHIF (Open Health Imaging Foundation) để xem hình ảnh y khoa.",
      "Xây dựng các component tái sử dụng, có kiểm thử unit, integration và E2E.",
    ],
  },
  {
    role: "Kỹ sư Frontend",
    context: "ETech, nền tảng hội nghị và quản lý sự kiện cho doanh nghiệp",
    period: "Th1 2022 – Th3 2023",
    location: "Thành phố Hồ Chí Minh, Việt Nam",
    highlights: [
      "Phát triển tính năng web và React Native cho nền tảng hội nghị được Burger King, Herbalife, JSEA và Switch Production sử dụng.",
      "Xây dựng phòng họp ảo thời gian thực qua WebSocket, kèm thống kê trực tiếp toàn cầu.",
      "Xây dựng thư viện component Vue tái sử dụng.",
    ],
  },
];

export const experienceVi: ExperienceItem[] = experienceEn.map((e, i) => ({
  ...e,
  ...experienceOverrides[i],
}));

const projectOverrides: Array<Partial<Project>> = [
  {
    role: "Dự án cá nhân · learn.huyle.work",
    oneLiner:
      "Ghi chép và bản dựng cho kỹ sư frontend senior: các bài thực hành React cùng những chủ đề xoay quanh, mỗi bài có demo chạy trực tiếp.",
    description:
      "Các bài toán UI kinh điển được dựng từ đầu, như toast, infinite scroll, danh sách ảo hóa và data grid, cùng các chủ đề xoay quanh: trình duyệt, hiệu năng, khả năng tiếp cận, bảo mật, thiết kế hệ thống, kiểm thử và SEO. Mỗi trang đi kèm ghi chú ngắn và một demo trực tiếp để bạn thoải mái phá thử.",
  },
];

export const projectsVi: Project[] = projectsEn.map((p, i) => ({
  ...p,
  ...projectOverrides[i],
}));

// Only "Testing & Quality" translates; the rest are kept as tech-domain labels.
const skillLabelVi: Record<SkillGroup["id"], string> = {
  frontend: "Frontend",
  "ai-native": "AI-Native",
  backend: "Backend / APIs",
  quality: "Kiểm thử & Chất lượng",
};

export const skillGroupsVi: SkillGroup[] = skillGroupsEn.map((g) => ({
  ...g,
  label: skillLabelVi[g.id],
}));

const galleryAltVi = [
  "Ở phòng gym, giữa hiệp tập",
  "Đi chụp ảnh, săn ánh sáng",
  "Bông, chú mèo tuxedo, đang giám sát",
  "Giải lao cà phê, nạp lại năng lượng",
];

export const galleryImagesVi: GalleryImage[] = galleryEn.map((img, i) => ({
  ...img,
  alt: galleryAltVi[i] ?? img.alt,
}));
