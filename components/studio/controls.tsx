"use client";

import { ChevronRight, RotateCcw } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/** Open/closed state of collapsible sections, kept across tab switches. */
const sectionState = new Map<string, boolean>();

/**
 * A titled block of the inspector. Collapsible sections start closed unless
 * `defaultOpen`, so the panel shows the essentials and the rest is one click away.
 */
export function PanelSection({
  title,
  hint,
  onReset,
  children,
  className = "",
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpenState] = useState(() => sectionState.get(title) ?? defaultOpen);
  const setOpen = (next: boolean) => {
    sectionState.set(title, next);
    setOpenState(next);
  };
  const expanded = !collapsible || open;

  return (
    <section className={`border-b border-hairline px-5 last:border-b-0 ${expanded ? "pb-5 pt-4" : "py-1"} ${className}`}>
      <div className={`flex min-h-6 items-center justify-between gap-3 ${expanded ? "mb-3.5" : ""}`}>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
            className="focus-ring -mx-2 flex min-h-10 flex-1 items-center gap-2 rounded-[8px] px-2 text-left [--ring-offset:0px]"
          >
            <ChevronRight
              size={14}
              strokeWidth={1.8}
              className={`shrink-0 text-ink-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            />
            <h3 className={`text-[13px] font-semibold tracking-[-0.01em] ${open ? "text-ink" : "text-ink-2"}`}>{title}</h3>
          </button>
        ) : (
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        )}
        {expanded && (
          <div className="flex min-w-0 items-center gap-1.5">
            {hint && <span className="truncate text-[11.5px] text-ink-4">{hint}</span>}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                aria-label={`Réinitialiser : ${title}`}
                title="Réinitialiser"
                className="focus-ring grid size-7 place-items-center rounded-[8px] text-ink-4 transition-colors duration-150 hover:bg-well-strong hover:text-ink [--ring-offset:2px]"
              >
                <RotateCcw size={13} strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}
      </div>
      {expanded && <div id={id}>{children}</div>}
    </section>
  );
}

/** Small "?" that reveals a control's explanation on hover or focus. */
export function InfoTip({ text }: { text: string }) {
  return (
    // Positioned against the nearest `relative` row, so it spans the panel width and never clips.
    <span className="group/tip inline-flex align-middle">
      <span
        tabIndex={0}
        aria-label={text}
        className="focus-ring grid size-4 cursor-help place-items-center rounded-full text-[9.5px] font-semibold text-ink-4 shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:text-ink [--ring-offset:1px]"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+6px)] z-40 rounded-[10px] bg-ink px-2.5 py-2 text-[11.5px] font-normal leading-[1.45] text-white opacity-0 shadow-float transition-opacity duration-150 [text-wrap:pretty] group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
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
    <div role="group" aria-label={ariaLabel} className={`flex rounded-[10px] bg-well-strong p-[3px] ${className}`}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`focus-ring flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 [--ring-offset:2px] ${
              active ? "bg-surface text-ink shadow-raise" : "text-ink-3 hover:text-ink"
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

/**
 * Labelled slider with a real track and thumb. Double-click returns to
 * `defaultValue`. The native range input sits on top for keyboard and touch.
 */
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
  const display = format ? format(value) : `${value.toFixed(decimals).replace(".", ",")}${unit}`;

  return (
    <div
      className="group/slider mb-4 last:mb-0"
      onDoubleClick={defaultValue === undefined ? undefined : () => onChange(defaultValue)}
      title={defaultValue === undefined ? undefined : "Double-clic pour réinitialiser"}
    >
      <div className="relative mb-2 flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          {label}
          {description && <InfoTip text={description} />}
        </span>
        <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{display}</span>
      </div>
      <div className="relative h-5">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-well-strong" />
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-accent"
          style={{ width: `${percent}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(12,10,9,.12),0_2px_6px_rgba(12,10,9,.22)] transition-transform duration-150 group-hover/slider:scale-110 group-has-[input:focus-visible]/slider:ring-2 group-has-[input:focus-visible]/slider:ring-accent"
          style={{ left: `${percent}%` }}
        />
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
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
        checked ? "bg-accent" : "bg-well-strong shadow-[inset_0_0_0_1px_var(--color-hairline)]"
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
    <div className="relative flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          {label}
          {description && <InfoTip text={description} />}
        </p>
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
    <label className="mb-2 flex h-10 cursor-pointer items-center gap-3 rounded-[10px] bg-surface px-2.5 shadow-raise transition-shadow duration-150 last:mb-0 hover:shadow-float">
      <span className="size-6 shrink-0 rounded-[7px] shadow-[inset_0_0_0_1px_rgba(12,10,9,.12)]" style={{ background: value }} />
      <span className="flex-1 text-[12.5px] text-ink-2">{label}</span>
      <span className="font-mono text-[11.5px] uppercase tabular-nums text-ink-3">{value.replace("#", "")}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="sr-only" />
    </label>
  );
}

/** Grid of large selectable tiles (lighting rigs, quality, form…). */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  columns = 3,
}: {
  options: { value: T; label: string; preview?: ReactNode; detail?: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  columns?: number;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`focus-ring flex flex-col items-start gap-2 rounded-[12px] bg-surface p-2 text-left transition-[box-shadow,transform] duration-200 [--ring-offset:1px] ${
              active ? "shadow-[0_0_0_1.5px_var(--color-accent),0_6px_16px_-8px_#2f5bff80]" : "shadow-raise hover:-translate-y-px hover:shadow-float"
            }`}
          >
            {option.preview}
            <span className="w-full">
              <span className="block truncate text-[12px] font-medium text-ink">{option.label}</span>
              {option.detail && <span className="block truncate text-[10.5px] text-ink-4">{option.detail}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
