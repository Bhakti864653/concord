import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Same two-overlapping-circles mark as components/Logo.tsx, but on a solid
// dark chip - a browser tab can sit on a light or dark bar regardless of the
// page's own theme, so the icon needs its own fixed-contrast background
// rather than relying on currentColor like the in-page logo does.
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
          background: "#171717",
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
              border: "1.6px solid white",
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
              border: "1.6px solid white",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
