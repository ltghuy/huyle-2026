import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Nguồn dữ liệu" };

const SOURCES = [
  {
    name: "CEFR-J Wordlist Version 1.5",
    use: "Danh sách từ vựng trình độ A1 đến B2.",
    credit:
      "The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Bản quyền thuộc Tono Laboratory, TUFS; được dùng miễn phí với điều kiện ghi nguồn.",
    link: { href: "https://github.com/openlanguageprofiles/olp-en-cefrj", label: "Open Language Profiles" },
  },
  {
    name: "Octanove Vocabulary Profile C1/C2 1.0",
    use: "Danh sách từ vựng trình độ C1.",
    credit:
      "© Octanove Labs, cấp phép theo Creative Commons Attribution-ShareAlike 4.0. Dữ liệu từ vựng C1 của ứng dụng (dựa trên danh sách này) cũng được chia sẻ theo cùng giấy phép.",
    link: { href: "https://creativecommons.org/licenses/by-sa/4.0/deed.vi", label: "CC BY-SA 4.0" },
  },
  {
    name: "CMU Pronouncing Dictionary",
    use: "Phiên âm giọng Mỹ, được chuyển sang ký hiệu IPA.",
    credit: "Copyright © 1993–2015 Carnegie Mellon University. All rights reserved. Dùng theo giấy phép kiểu BSD của CMU.",
    link: { href: "https://github.com/cmusphinx/cmudict", label: "cmusphinx/cmudict" },
  },
] as const;

export default function CreditsPage() {
  return (
    <>
      <PageHeader title="Nguồn dữ liệu" description="Ứng dụng được xây dựng dựa trên những nguồn mở sau. Cảm ơn các tác giả." />
      <ul className="grid gap-4 px-4 md:px-8">
        {SOURCES.map((source) => (
          <li key={source.name} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold" lang="en">
              {source.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{source.use}</p>
            <p className="mt-3 text-sm">{source.credit}</p>
            <a
              href={source.link.href}
              className="mt-3 inline-block text-sm text-link underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            >
              {source.link.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="px-4 pt-6 text-sm text-muted-foreground md:px-8">
        Nghĩa tiếng Việt, câu ví dụ và bài giảng ngữ pháp do nhóm biên soạn với sự hỗ trợ của AI và được kiểm duyệt trước khi
        đưa vào ứng dụng.
      </p>
    </>
  );
}
