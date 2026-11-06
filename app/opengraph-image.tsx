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
          background:
            "radial-gradient(80% 90% at 85% 10%, #1b2250 0%, #0a0c14 55%, #06070c 100%)",
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox={LOGO_VIEWBOX}>
            <defs>
              <linearGradient id="w" x1="0" y1="0" x2="1" y2="0.35">
                <stop offset="0" stopColor="#39e1ff" />
                <stop offset="0.4" stopColor="#5b7cff" />
                <stop offset="0.72" stopColor="#9b5cff" />
                <stop offset="1" stopColor="#ff5cc8" />
              </linearGradient>
            </defs>
            {LOGO_PATHS.map((d) => (
              <path key={d} d={d} fill="url(#w)" />
            ))}
          </svg>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5 }}>
            {site.name}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: -4,
              maxWidth: 900,
            }}
          >
            Make your logo solid.
          </div>
          <div style={{ fontSize: 32, color: "#b7bdcc", maxWidth: 860 }}>
            Glass, metal or colour. 4K renders, GLB and STL — right in the browser.
          </div>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 8,
            background: "linear-gradient(90deg, #39e1ff, #5b7cff, #9b5cff, #ff5cc8)",
          }}
        />
      </div>
    ),
    size,
  );
}
