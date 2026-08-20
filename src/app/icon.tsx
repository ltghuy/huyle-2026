import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

/**
 * Generated favicon (the "HL" monogram, lime on dark green) — Next auto-wires
 * the <link rel="icon">. Replaces the previous dangling `/favicon.ico`.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1510",
          color: "#d7f24a",
          fontSize: "18px",
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        {profile.monogram}
      </div>
    ),
    size,
  );
}
