import { ImageResponse } from "next/og";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Social-share image (1200×630), rendered at build time with next/og. The
 * text is plain ASCII: the default next/og font may lack Vietnamese glyphs.
 * `twitter-image.tsx` re-exports this.
 */
export const alt = OG_IMAGE.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
          <div style={{ fontSize: "26px", letterSpacing: "6px", textTransform: "uppercase", color: "#a1a1aa" }}>For Vietnamese learners</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "112px", fontWeight: 800, lineHeight: 1 }}>{SITE_NAME}</div>
          <div style={{ fontSize: "42px", color: "#818cf8", marginTop: "28px" }}>Vocabulary · Grammar · Daily review</div>
        </div>

        <div style={{ display: "flex", fontSize: "28px", color: "#71717a" }}>{SITE_URL.replace(/^https?:\/\//, "")}</div>
      </div>
    ),
    size,
  );
}
