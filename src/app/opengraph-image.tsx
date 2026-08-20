import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

/**
 * Generated OpenGraph / social-share image (1200×630) — the preview card that
 * appears when the site is shared. Rendered at build time via next/og in the
 * site's dark-green + lime palette. `twitter-image.tsx` re-exports this.
 */
export const alt = `${profile.display} — ${profile.title}`;
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
          background: "#0b1510",
          color: "#e9f1e6",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#d7f24a",
              color: "#0b1510",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            {profile.monogram}
          </div>
          <div
            style={{
              fontSize: "24px",
              letterSpacing: "6px",
              textTransform: "uppercase",
              color: "#a3b2a1",
            }}
          >
            Portfolio
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "132px", fontWeight: 800, lineHeight: 1 }}>
            {profile.display}
          </div>
          <div style={{ fontSize: "46px", color: "#d7f24a", marginTop: "28px" }}>
            Software Engineer
          </div>
          <div style={{ fontSize: "30px", color: "#a3b2a1", marginTop: "14px" }}>
            AI-Native Development · React · Next.js · TypeScript
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "28px", color: "#6f7d69" }}>
          {profile.url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    ),
    size,
  );
}
