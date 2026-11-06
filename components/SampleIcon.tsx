import type { Sample } from "@/lib/samples";

export function SampleIcon({
  sample,
  size = 17,
  className,
}: {
  sample: Sample;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={sample.viewBox}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {sample.paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
