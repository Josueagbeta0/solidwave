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
  /** Brand colouring: the heavy band in ink-blue accent, the light band softer. */
  gradient?: boolean;
};

export function LogoMark({ size = 24, className, gradient = false }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {LOGO_PATHS.map((d, index) => (
        <path
          key={d}
          d={d}
          fill={gradient ? (index === 0 ? "#2f5bff" : "#8aa3ff") : undefined}
        />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-[-0.045em] ${className}`}>
      SolidWave
    </span>
  );
}
