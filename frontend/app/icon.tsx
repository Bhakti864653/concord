import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same two-overlapping-circles mark as components/Logo.tsx - a light chip
// with the actual mentee/mentor tint-fill + stroke treatment, matching the
// in-page logo instead of an unrelated dark background.
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
          background: "#fbfaf7",
          borderRadius: 7,
        }}
      >
        <div style={{ position: "relative", width: 20, height: 14, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#eeeafd",
              border: "1.6px solid #514299",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 6,
              top: 0,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#fff0eb",
              border: "1.6px solid #a64526",
              opacity: 0.92,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
