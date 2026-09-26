import type { Chapter, Dictionary } from "./en";

/**
 * Vietnamese dictionary. Type-checked against the English canonical shape.
 * Voice: first person as "mình" (warm, personal). Tech/brand nouns (React,
 * Naver, frontend, backend, AI-native, production…) are kept in English, the way
 * Vietnamese engineers actually write them. Dashes are the em-dash "—" for
 * consistency with the English copy.
 */
export const vi: Dictionary = {
  skip: {
    toContent: "Đến nội dung chính",
  },
  nav: {
    links: { work: "Dự án", about: "Giới thiệu", contact: "Liên hệ" },
    sections: {
      home: "Trang chủ",
      about: "Giới thiệu",
      ethos: "Tôn chỉ",
      gallery: "Thư viện",
      capabilities: "Năng lực",
      career: "Sự nghiệp",
      work: "Dự án",
      contact: "Liên hệ",
    },
    logoHome: "trang chủ",
  },
  hero: {
    runnerSince: "Bắt đầu từ",
  },
  about: {
    chip: "Giới thiệu",
    person: "Con người",
    chapters: [
      {
        // Kicker kept distinct from the "Giới thiệu" chip shown just above it.
        kicker: "Giới thiệu",
        heading: "Tôi là ai?",
        body: "Mình là Huy — sinh ra và lớn lên ở Việt Nam, giờ đang làm phần mềm tại Thành phố Hồ Chí Minh, hoàn thành công việc chủ yếu bằng cà phê.",
      },
      {
        body: "Bốn năm qua, mình xây dựng các nền tảng web thực tế trong lĩnh vực y tế, legal-tech và sự kiện doanh nghiệp — gần đây nhất là dẫn dắt mảng frontend cho các sản phẩm y tế AI-native tại Naver, nơi bug ít hơn nhưng cái giá của sai sót thì cao hơn nhiều.",
      },
      {
        body: "Mình để tâm, có lẽ hơi quá mức: kiến trúc mở rộng được, design system mà các đội thật sự chịu dùng, và giao diện chăm chút tới từng chuyển động. Cả trang này là mình đang lặng lẽ thể hiện điều đó.",
      },
      {
        body: "Ngoài giờ làm, bạn sẽ thấy mình tìm đến các bộ anime thú vị, chìm đắm vào một playlist thật hay, hoặc chơi đùa với Bông — chú mèo tuxedo kiêm reviewer code chạy bằng pate của mình, mà nếu để ý kỹ, bạn sẽ thấy Bông ở đây đấy 🐱",
      },
    ] as Chapter[],
    // Single tokens present verbatim in the Vietnamese chapters above. Vietnamese
    // compounds are multi-token, so only clean standalone words are accented.
    accentWords: ["Huy", "Bông", "Naver", "anime"],
  },
  statement: {
    text: "“ Mình xây dựng những nền tảng web hiệu suất cao, dễ tiếp cận và chỉn chu — từ bản đặc tả sản phẩm đầu tiên cho tới lúc vận hành và giám sát trên production, chỉ đưa AI vào đúng những chỗ nó thật sự xứng đáng. Phần còn lại là cà phê và sự lì lợm. ”",
    accentPhrase: "nhanh, dễ tiếp cận và chỉn chu, AI",
  },
  gallery: {
    eyebrow: "Bộ sưu tập",
    heading: "Ngoài giờ làm",
    body: "Vài khoảnh khắc đời thường ngoài bàn phím — phòng gym, cà phê, và một chú mèo nghĩ cả nhà là của nó.",
    drag: "Kéo để khám phá nhé",
  },
  whatIDo: {
    eyebrow: "Mình có thể làm gì?",
    heading: "Kĩ năng",
    ring: ["FRONTEND", "AI", "BACKEND", "QUALITY"],
  },
  experience: {
    eyebrow: "Hành trình của mình",
    heading: "Sự nghiệp &",
    headingAccent: "Kinh nghiệm",
    subhead:
      "Hơn bốn năm làm frontend cho các sản phẩm thực tế trong lĩnh vực y tế, pháp lý và doanh nghiệp.",
    now: "HIỆN NAY",
  },
  work: {
    eyebrow: "Dự án tiêu biểu",
    heading: "Dự án",
    hint: "Di chuột vào từng bảng để khám phá",
    liveDemo: "Xem demo",
    source: "Mã nguồn",
  },
  contact: {
    availability: "Sẵn sàng cho cơ hội mới",
    eyebrow: "Liên hệ",
    heading: "Cùng trò chuyện",
    body: "Bạn đang có một vị trí, một dự án, hay chỉ muốn tán gẫu chuyện nghề bên ly cà phê? Hộp thư của mình luôn mở — và mình trả lời thật đấy.",
    findElsewhere: "Hoặc cũng có thể tìm mình tại",
  },
  email: {
    copy: "Sao chép",
    copied: "Đã sao chép",
    copyAria: "Sao chép địa chỉ email",
    copiedAria: "Đã sao chép địa chỉ email",
  },
  footer: {
    personality:
      "Làm web hiệu suất cao và dễ tiếp cận từ 2021 — chạy bằng cà phê, dưới sự giám sát của một chú mèo rất hay phán xét.",
    colophon: "Thiết kế, xây dựng & có vẻ suy nghĩ hơi nhiều",
    backToTop: "Lên đầu trang",
    backToTopSuffix: "lên đầu trang",
  },
};
