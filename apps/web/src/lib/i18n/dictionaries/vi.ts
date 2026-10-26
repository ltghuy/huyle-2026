import type { Chapter, Dictionary } from "./en";

/**
 * Vietnamese dictionary. Type-checked against the English canonical shape.
 * Voice: first person as "mình" (warm, personal). Tech/brand nouns (React,
 * Naver, frontend, backend, AI-native, production…) are kept in English, the way
 * Vietnamese engineers actually write them. Like the English copy, prose avoids
 * em dashes; use commas, colons, or a new sentence instead.
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
        body: "Mình là Huy, sinh ra và lớn lên ở Việt Nam, giờ đang làm phần mềm tại Thành phố Hồ Chí Minh và sống chủ yếu nhờ cà phê.",
      },
      {
        body: "Bốn năm qua, mình làm các nền tảng web cho lĩnh vực y tế, legal-tech và sự kiện doanh nghiệp. Gần đây nhất, mình dẫn dắt mảng frontend cho các sản phẩm y tế AI-native tại Naver, nơi bug ít hơn nhưng mỗi lỗi đều đắt hơn nhiều.",
      },
      {
        body: "Mình để tâm, có lẽ hơi quá mức, tới tay nghề: kiến trúc mở rộng được, design system mà các đội khác muốn dùng, và giao diện chăm chút tới từng chuyển động. Trang này cũng là dịp để mình khoe một chút.",
      },
      {
        body: "Ngoài giờ làm, mình thường xem anime, đi tìm một playlist hay, hoặc cãi thua Bông, chú mèo tuxedo kiêm reviewer code chạy bằng pate của mình. Nhìn kỹ một chút, có khi bạn sẽ thấy Bông đâu đó trên trang này 🐱",
      },
    ] as Chapter[],
    // Single tokens present verbatim in the Vietnamese chapters above. Vietnamese
    // compounds are multi-token, so only clean standalone words are accented.
    accentWords: ["Huy", "Bông", "Naver", "anime"],
  },
  statement: {
    text: "“ Mình xây dựng những nền tảng web nhanh và dễ tiếp cận, từ bản đặc tả sản phẩm đầu tiên cho tới cảnh báo cuối cùng trên production, và chỉ đưa AI vào những chỗ thật sự giúp được người dùng. Phần còn lại nhờ cà phê và sự lì lợm. ”",
    accentPhrase: "nhanh và dễ tiếp cận,",
  },
  gallery: {
    eyebrow: "Bộ sưu tập",
    heading: "Ngoài giờ làm",
    body: "Vài khoảnh khắc đời thường ngoài bàn phím: phòng gym, cà phê, và một chú mèo nghĩ cả nhà là của nó.",
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
      "Hơn bốn năm làm frontend production cho các sản phẩm y tế, pháp lý và doanh nghiệp.",
    now: "HIỆN NAY",
  },
  work: {
    eyebrow: "Dự án tiêu biểu",
    heading: "Dự án",
    liveDemo: "Truy cập trang",
    comingSoon: "Sắp ra mắt",
    placeholderBody: "Một dự án khác đang được hoàn thiện.",
    source: "Mã nguồn",
  },
  contact: {
    availability: "Sẵn sàng cho cơ hội mới",
    eyebrow: "Liên hệ",
    heading: "Cùng trò chuyện",
    body: "Bạn đang có một vị trí, một dự án, hay chỉ muốn tán gẫu chuyện nghề bên ly cà phê? Cứ email cho mình, mình trả lời thật đấy.",
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
      "Làm web nhanh và dễ tiếp cận từ 2021, chạy bằng cà phê và dưới sự giám sát của một chú mèo rất hay phán xét.",
    colophon: "Thiết kế, xây dựng & có vẻ suy nghĩ hơi nhiều",
    backToTop: "Lên đầu trang",
    backToTopSuffix: "lên đầu trang",
  },
};
