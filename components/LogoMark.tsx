/**
 * SolidWave mark: two solid wave bands, one heavy and one light.
 * Kept as plain filled paths so the studio can extrude the logo itself.
 */
export const LOGO_VIEWBOX = "0 6 100 100";

export const LOGO_PATHS = [
  "M8 34C22 12 38 12 50 34S78 56 92 34V52C78 74 62 74 50 52S22 30 8 52Z",
  "M8 66C22 44 38 44 50 66S78 88 92 66V78C78 100 62 100 50 78S22 56 8 78Z",
];

type LogoMarkProps = {
  size?: number;
  className?: string;
  /** Fill with the wave gradient instead of currentColor. */
  gradient?: boolean;
};

export function LogoMark({ size = 24, className, gradient = false }: LogoMarkProps) {
  const id = "solidwave-mark-gradient";
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      fill={gradient ? `url(#${id})` : "currentColor"}
      aria-hidden="true"
      className={className}
    >
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.35">
            <stop offset="0" stopColor="#39e1ff" />
            <stop offset="0.4" stopColor="#5b7cff" />
            <stop offset="0.72" stopColor="#9b5cff" />
            <stop offset="1" stopColor="#ff5cc8" />
          </linearGradient>
        </defs>
      )}
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-[-0.04em] ${className}`}>
      Solid<span className="text-ink-3">Wave</span>
    </span>
  );
}
