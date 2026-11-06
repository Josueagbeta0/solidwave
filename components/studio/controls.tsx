"use client";

import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export function PanelSection({
  title,
  hint,
  onReset,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-hairline px-4 py-4 last:border-b-0 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="eyebrow !text-[11px] !text-ink-2">{title}</h3>
        <div className="flex items-center gap-2">
          {hint && <span className="text-[11.5px] text-ink-4">{hint}</span>}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label={`Reset ${title}`}
              className="focus-ring grid size-6 place-items-center rounded-md text-ink-4 transition-colors hover:bg-well-strong hover:text-ink [--ring-offset:2px]"
            >
              <RotateCcw size={12} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex rounded-[11px] bg-well p-[3px] shadow-[inset_0_0_0_1px_var(--color-hairline)] ${className}`}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`focus-ring flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[12.5px] font-medium transition-[background,color,box-shadow] duration-200 [--ring-offset:2px] ${
              active
                ? "bg-raised text-ink shadow-raise"
                : "text-ink-3 hover:text-ink"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  description,
  format,
  defaultValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  description?: string;
  format?: (value: number) => string;
  /** Double-click the slider to return to this value. */
  defaultValue?: number;
}) {
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const display = format ? format(value) : `${value.toFixed(decimals)}${unit}`;

  return (
    <div className="mb-3 last:mb-0">
      <div
        className="group/slider relative h-9 overflow-hidden rounded-[10px] bg-well shadow-[inset_0_0_0_1px_var(--color-hairline)]"
        onDoubleClick={defaultValue === undefined ? undefined : () => onChange(defaultValue)}
        title={defaultValue === undefined ? undefined : "Double-click to reset"}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#2f5bff1f,#2f5bff33)] transition-[width] duration-75"
          style={{ width: `${percent}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[7px] w-[2px] -translate-x-1/2 rounded-full bg-wave-cyan shadow-[0_0_10px_#2f5bff] transition-[left] duration-75"
          style={{ left: `${percent}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-ink-2"
        >
          {label}
        </span>
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11.5px] tabular-nums text-ink-2">
          {display}
        </span>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      {description && (
        <p className="mt-1.5 text-[11.5px] leading-[1.45] text-ink-4">{description}</p>
      )}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 [--ring-offset:2px] ${
        checked ? "bg-wave" : "bg-well-strong shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      }`}
    >
      <span
        className={`absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring ${
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11.5px] leading-[1.4] text-ink-4">{description}</p>
        )}
      </div>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-2 flex h-9 cursor-pointer items-center justify-between gap-3 rounded-[10px] bg-well px-2.5 shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:bg-well-strong last:mb-0">
      <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11.5px] uppercase tabular-nums text-ink-3">
          {value.replace("#", "")}
        </span>
        <span
          className="size-5 rounded-md shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
        />
      </span>
    </label>
  );
}

/** Grid of large selectable tiles (lighting rigs, quality, floor…). */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 3,
}: {
  options: { value: T; label: string; preview?: ReactNode; detail?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: number;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`focus-ring flex flex-col items-start gap-2 rounded-[12px] p-2 text-left transition-[background,box-shadow] duration-200 [--ring-offset:1px] ${
              active
                ? "bg-raised shadow-[0_0_0_1px_#2f5bff99,0_6px_20px_-10px_#2f5bffaa]"
                : "bg-well shadow-[inset_0_0_0_1px_var(--color-hairline)] hover:bg-well-strong"
            }`}
          >
            {option.preview}
            <span className="w-full">
              <span className="block truncate text-[12px] font-medium text-ink">{option.label}</span>
              {option.detail && (
                <span className="block truncate text-[10.5px] text-ink-4">{option.detail}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
