import { describe, expect, it } from "vitest";
import type { ClaimsFile } from "../claims";
import { buildClaimsSheet, escapeHtml } from "./claims-sheet";

const EVIL = `</script><img src=x onerror="alert('x')">&`;

function file(): ClaimsFile {
  const sentence = { level: "A1", vi: "Hạn chót là thứ Sáu.", en: "The deadline is Friday." };
  return {
    date: "2026-11-01",
    target: "local",
    groups: [
      {
        key: `sentence:fx-friday#${EVIL}`,
        sentenceId: "sentence:fx-friday",
        answer: EVIL,
        claimIds: ["a", "b"],
        count: 2,
        aiCount: 1,
        sentence,
        suggestion: { verdict: "reject", reasonVi: `Bạn viết sai ${EVIL}`, noteEn: EVIL },
      },
      { key: "sentence:fx-friday#ok", sentenceId: "sentence:fx-friday", answer: "OK answer", claimIds: ["c"], count: 1, sentence, suggestionError: EVIL },
      { key: "sentence:fx-gone#x", sentenceId: "sentence:fx-gone", answer: EVIL, claimIds: ["d"], count: 1, auto: { status: "dropped", reason: "sentence not in the approved course" } },
    ],
  };
}

describe("escapeHtml", () => {
  it("escapes markup and both quote kinds", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });
});

describe("buildClaimsSheet", () => {
  it("never puts learner or model text into the page unescaped", () => {
    const html = buildClaimsSheet(file());
    expect(html).not.toContain("<img");
    expect(html).not.toContain(`onerror="`);
    // The page's own two script blocks are the only ones closed.
    expect(html.match(/<\/script>/g)).toHaveLength(2);
    expect(html).toContain("&lt;/script&gt;&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;");
  });

  it("lists open groups with actions and prefilled rejection text, and automatic ones read-only", () => {
    const html = buildClaimsSheet(file());
    expect(html.match(/<article data-key=/g)).toHaveLength(2);
    expect(html.match(/AI accepted 1/g)).toHaveLength(1); // feature 033
    expect(html).toContain('data-suggest="reject"');
    expect(html).toMatch(/<textarea[^>]*>Bạn viết sai &lt;\/script&gt;/);
    expect(html).toContain('<article class="auto">');
    expect(html).toContain("Dropped");
    expect(html).toContain("claims-decisions-");
    expect(html).toContain("2 claims");
  });
});
