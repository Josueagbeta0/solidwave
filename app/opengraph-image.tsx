import { ImageResponse } from "next/og";
import { LOGO_PATHS, LOGO_VIEWBOX } from "@/components/LogoMark";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
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
          padding: 72,
          background: "radial-gradient(80% 90% at 50% 0%, #ffffff 0%, #f6f5f3 55%, #ebe9e5 100%)",
          color: "#0c0a09",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox={LOGO_VIEWBOX}>
            {LOGO_PATHS.map((d, index) => (
              <path key={d} d={d} fill={index === 0 ? "#2f5bff" : "#8aa3ff"} />
            ))}
          </svg>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1.5 }}>{site.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 0.95, letterSpacing: -5, maxWidth: 980 }}>
            Your logo, made solid.
          </div>
          <div style={{ fontSize: 32, color: "#66615b", maxWidth: 900 }}>
            Glass, chrome and gold renders, turntable videos, GLB and STL — in your browser.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["PNG", "MP4", "GLB", "STL"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid #e7e5e1",
                fontSize: 22,
                color: label === "MP4" ? "#2f5bff" : "#3d3a36",
              }}
            >
              .{label.toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
