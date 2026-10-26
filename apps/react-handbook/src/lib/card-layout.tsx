import type { Card } from "./cards";
import { SITE_NAME, SITE_URL } from "./site";

// The social card's layout, with inline styles only, because ImageResponse
// (Satori) supports flexbox and a subset of CSS. The handbook demo renders the
// same JSX in the page as a live preview.

export function CardLayout({ card, scale = 1 }: { card: Pick<Card, "eyebrow" | "title" | "level">; scale?: number }) {
  const px = (n: number) => n * scale;
  return (
    <div
      style={{
        width: px(1200),
        height: px(630),
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: px(72),
        background: "#0b0b0c",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: px(20) }}>
        <div style={{ width: px(56), height: px(56), borderRadius: px(12), background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", color: "#0b0b0c", fontSize: px(30), fontWeight: 700 }}>
          FH
        </div>
        <div style={{ fontSize: px(30), fontWeight: 600 }}>{SITE_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: px(20) }}>
        <div style={{ fontSize: px(30), color: "#a1a1aa" }}>{card.eyebrow}</div>
        <div style={{ fontSize: px(card.title.length > 40 ? 64 : 80), fontWeight: 700, lineHeight: 1.1, letterSpacing: px(-1) }}>{card.title}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: px(26), color: "#a1a1aa" }}>
        <div>{SITE_URL.replace("https://", "")}</div>
        {card.level ? <div style={{ border: `${px(2)}px solid #3f3f46`, borderRadius: px(10), padding: `${px(6)}px ${px(16)}px` }}>{card.level}</div> : <div />}
      </div>
    </div>
  );
}
