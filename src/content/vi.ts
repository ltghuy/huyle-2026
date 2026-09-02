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
      "Naver Care (phân loại triệu chứng bằng AI) & Naver Healthcare (bộ sản phẩm PHR tại nhà) — Việt Nam & Hàn Quốc",
    period: "Th11 2025 – Hiện tại",
    location: "Thành phố Hồ Chí Minh, Việt Nam",
    highlights: [
      "Thành viên chủ chốt xây dựng Symptom Editor Admin — công cụ kéo-thả trực quan giúp đội ngũ y tế tự thiết kế & xuất bản bộ câu hỏi y khoa phân nhánh, biến những yêu cầu kỹ thuật mất nhiều ngày thành tự phục vụ.",
      "Xây dựng các lớp bảo vệ khi soạn thảo: kiểm tra phát hiện luồng câu hỏi bị đứt, chế độ mô phỏng xem trước trải nghiệm bệnh nhân, và lịch sử phiên bản với quy trình duyệt-rồi-kích-hoạt.",
      "Phát triển Naver Care Symptom Checker cho người dùng cuối — bộ câu hỏi thích ứng có lưu tiến trình sau khi tải lại, phục vụ luồng công khai + đối tác bệnh viện bằng tiếng Hàn & tiếng Anh.",
      "Phát triển frontend cho sản phẩm PHR đầu tiên của Naver Healthcare — BodyReport (InBody), kịp ra mắt đúng hạn cho đợt phát hành P1.",
      "Thúc đẩy chuẩn hóa design system trên một codebase đa ứng dụng lớn — thư viện component dùng chung được các đội anh em áp dụng.",
    ],
  },
  {
    role: "Kỹ sư Frontend / Trưởng nhóm",
    context: "InjuryEx — nền tảng quy trình legal-tech & y tế đa bên",
    period: "Th2 2024 – Th11 2025",
    location: "Từ xa",
    highlights: [
      "Khởi tạo InjuryEx từ con số không — định hình stack frontend, kiến trúc và quy ước, về sau trở thành chuẩn của cả đội.",
      "Dẫn dắt đội frontend: lập kế hoạch sprint, ước lượng, đào tạo, và xây dựng văn hóa review code trong một lĩnh vực nhiều bên.",
      "Thiết kế giải pháp cho các quy trình phức tạp giữa bệnh nhân/luật sư/bác sĩ/nhà thuốc, gồm cả thanh toán tự động ANZ & Xero kèm thông báo SMS/email.",
      "Viết các extension VSCode nội bộ để chuẩn hóa các tác vụ lặp lại; đóng góp full-stack (Python, FastAPI) khi cần đẩy nhanh tiến độ.",
    ],
  },
  {
    role: "Kỹ sư Frontend",
    context:
      "Australian Epilepsy Project (Viện Florey) — nền tảng nghiên cứu chẩn đoán hình ảnh do chính phủ tài trợ",
    period: "Th4 2023 – Th2 2024",
    location: "Từ xa",
    highlights: [
      "Chuyển các yêu cầu lâm sàng thành tính năng React chuẩn production cho mạng lưới chẩn đoán động kinh quốc gia.",
      "Tích hợp OHIF (Open Health Imaging Foundation) cho hiển thị hình ảnh y khoa nâng cao.",
      "Xây dựng các component tái sử dụng với độ phủ kiểm thử unit/integration/E2E.",
    ],
  },
  {
    role: "Kỹ sư Frontend",
    context: "ETech — nền tảng hội nghị & quản lý sự kiện cho doanh nghiệp",
    period: "Th1 2022 – Th3 2023",
    location: "Thành phố Hồ Chí Minh, Việt Nam",
    highlights: [
      "Phát triển tính năng web & React Native cho nền tảng hội nghị được Burger King, Herbalife, JSEA và Switch Production sử dụng.",
      "Xây dựng phòng họp ảo thời gian thực dựa trên WebSocket kèm thống kê trực tuyến toàn cục.",
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
    role: "Kỹ sư Frontend · Naver Vietnam",
    period: "2025 – Hiện tại",
    oneLiner:
      "Phân loại triệu chứng bằng AI — trình chỉnh sửa trực quan để bác sĩ tự xuất bản bộ câu hỏi phân nhánh, không cần kỹ sư.",
    description:
      "Các công cụ cốt lõi cho sản phẩm phân loại triệu chứng bằng AI của Naver. Xây dựng Symptom Editor Admin — công cụ soạn thảo kéo-thả với kiểm tra luồng, chế độ mô phỏng xem trước cho bệnh nhân, và lịch sử phiên bản duyệt-rồi-kích-hoạt — cùng Symptom Checker thích ứng cho người dùng, phục vụ luồng công khai và đối tác bệnh viện bằng tiếng Hàn & tiếng Anh.",
  },
  {
    role: "Kỹ sư Frontend / Trưởng nhóm · PTN Global",
    period: "2024 – 2025",
    oneLiner:
      "Nền tảng legal-tech đa bên mình khởi tạo từ một repo trống thành khuôn mẫu của cả đội.",
    description:
      "Nền tảng quy trình legal-tech & y tế điều phối bệnh nhân, luật sư, bác sĩ và nhà thuốc. Định hình stack và quy ước frontend, dẫn dắt đội, và thiết kế các quy trình đa bên phức tạp gồm thanh toán tự động ANZ & Xero kèm thông báo SMS/email.",
  },
  {
    role: "Kỹ sư Frontend · PTN Global (Viện Florey)",
    period: "2023 – 2024",
    oneLiner:
      "Nền tảng chẩn đoán hình ảnh do chính phủ tài trợ cho mạng lưới chẩn đoán động kinh quốc gia.",
    description:
      "Chuyển các yêu cầu lâm sàng thành tính năng React chuẩn production cho mạng lưới chẩn đoán động kinh quốc gia, tích hợp OHIF cho hiển thị hình ảnh y khoa nâng cao với độ phủ kiểm thử unit/integration/E2E đầy đủ.",
  },
  {
    role: "Kỹ sư Frontend · Skyblaze Studios",
    period: "2022 – 2023",
    oneLiner:
      "Nền tảng hội nghị doanh nghiệp với phòng ảo thời gian thực — đúng vậy, cái mà Burger King & Herbalife đã dùng.",
    description:
      "Các tính năng web & React Native cho nền tảng hội nghị & quản lý sự kiện được Burger King, Herbalife, JSEA và Switch Production sử dụng. Xây dựng phòng họp ảo thời gian thực dựa trên WebSocket kèm thống kê trực tuyến toàn cục và thư viện component Vue tái sử dụng.",
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
  "Bông — chú mèo tuxedo, đang giám sát",
  "Giải lao cà phê — nạp lại năng lượng",
];

export const galleryImagesVi: GalleryImage[] = galleryEn.map((img, i) => ({
  ...img,
  alt: galleryAltVi[i] ?? img.alt,
}));
