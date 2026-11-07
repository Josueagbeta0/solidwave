"use client";

import { ChevronRight, RotateCcw } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/** Open/closed state of collapsible sections, kept across tab switches. */
const sectionState = new Map<string, boolean>();

/**
 * A titled block of the inspector. Collapsible sections start closed unless
 * `defaultOpen`, so the panel shows the essentials and the rest is one click away.
 * Opening and closing animate the height (CSS grid rows, see `.fold`).
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
  // Content is clipped only while the height animates, so tooltips and focus
  // rings can overflow the section once it is open.
  const [moving, setMoving] = useState(false);
  const setOpen = (next: boolean) => {
    sectionState.set(title, next);
    setOpenState(next);
    setMoving(true);
  };
  const expanded = !collapsible || open;

  const actions = (hint || onReset) && (
    <div
      className={`flex min-w-0 items-center gap-1.5 transition-opacity duration-200 ${expanded ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {hint && <span className="truncate text-[11.5px] text-ink-4">{hint}</span>}
      {onReset && (
        <Tip label="Réinitialiser" side="left">
          <button
            type="button"
            onClick={onReset}
            aria-label={`Réinitialiser : ${title}`}
            className="focus-ring grid size-7 place-items-center rounded-[8px] text-ink-4 transition-[color,background-color,rotate] duration-300 ease-spring hover:-rotate-45 hover:bg-well-strong hover:text-ink [--ring-offset:2px]"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
          </button>
        </Tip>
      )}
    </div>
  );

  return (
    <section className={`border-b border-hairline px-5 last:border-b-0 ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
            className="focus-ring group/head -mx-2 flex min-h-10 flex-1 items-center gap-2 rounded-[8px] px-2 text-left [--ring-offset:0px]"
          >
            <ChevronRight
              size={14}
              strokeWidth={1.9}
              className={`shrink-0 text-ink-4 transition-transform duration-300 ease-spring group-hover/head:text-ink-2 ${open ? "rotate-90" : ""}`}
            />
            <h3
              className={`text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-200 ${open ? "text-ink" : "text-ink-3 group-hover/head:text-ink"}`}
            >
              {title}
            </h3>
          </button>
        ) : (
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        )}
        {actions}
      </div>
      <div
        id={id}
        className="fold"
        data-open={expanded}
        data-settled={expanded && !moving}
        inert={!expanded}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === "grid-template-rows") setMoving(false);
        }}
      >
        <div>
          <div className="pb-5 pt-0.5">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * Hover/focus label for an icon control, with an optional keyboard shortcut.
 * Appears after a short delay so it never flickers while the pointer passes by.
 */
export function Tip({
  label,
  shortcut,
  side = "top",
  children,
  className = "",
  disabled = false,
}: {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
  className?: string;
  /** Hide the label, e.g. while the menu it would cover is open. */
  disabled?: boolean;
}) {
  const place = {
    top: "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 origin-bottom",
    bottom: "top-[calc(100%+8px)] left-1/2 -translate-x-1/2 origin-top",
    left: "right-[calc(100%+10px)] top-1/2 -translate-y-1/2 origin-right",
    right: "left-[calc(100%+10px)] top-1/2 -translate-y-1/2 origin-left",
  }[side];
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        hidden={disabled}
        className={`pointer-events-none absolute z-50 flex scale-95 items-center gap-2 whitespace-nowrap rounded-[8px] bg-ink px-2 py-1.5 text-[11.5px] font-medium text-white opacity-0 shadow-float transition-[opacity,scale] duration-150 group-hover/tip:scale-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:scale-100 group-has-[:focus-visible]/tip:opacity-100 hover-none:hidden ${place}`}
      >
        {label}
        {shortcut && (
          <kbd className="rounded-[4px] bg-white/15 px-1 font-mono text-[10px] font-medium text-white/80">{shortcut}</kbd>
        )}
      </span>
    </span>
  );
}

/** Small "?" that reveals a control's explanation on hover or focus. */
export function InfoTip({ text }: { text: string }) {
  return (
    // Positioned against the nearest `relative` row, so it spans the panel width and never clips.
    <span className="group/info inline-flex align-middle">
      <span
        tabIndex={0}
        aria-label={text}
        className="focus-ring grid size-4 cursor-help place-items-center rounded-full text-[9.5px] font-semibold text-ink-4 shadow-[inset_0_0_0_1px_var(--color-hairline)] transition-colors hover:text-ink [--ring-offset:1px]"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+6px)] z-40 translate-y-1 rounded-[10px] bg-ink px-2.5 py-2 text-[11.5px] font-normal leading-[1.45] text-white opacity-0 shadow-float transition-[opacity,translate] duration-200 ease-out [text-wrap:pretty] group-hover/info:translate-y-0 group-hover/info:opacity-100 group-focus-within/info:translate-y-0 group-focus-within/info:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Equal-width segmented control. The active pill slides between options
 * instead of jumping, which reads as one control rather than separate buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
  size = "md",
  tone = "light",
}: {
  options: { value: T; label: string; icon?: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
  /** "dark" for controls floating on a dark stage. */
  tone?: "light" | "dark";
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const count = options.length;
  const dark = tone === "dark";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative grid rounded-[10px] p-[3px] ${dark ? "bg-white/10" : "bg-well-strong"} ${className}`}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className={`absolute bottom-[3px] left-[3px] top-[3px] rounded-[8px] transition-transform duration-300 ease-spring ${
          dark ? "bg-white/20" : "bg-surface shadow-raise"
        }`}
        style={{
          width: `calc((100% - 6px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`focus-ring relative z-[1] flex items-center justify-center gap-1.5 rounded-[8px] px-2 font-medium transition-colors duration-200 [--ring-offset:2px] ${
              size === "sm" ? "min-h-7 text-[12px]" : "min-h-8 text-[12.5px]"
            } ${dark ? (active ? "text-white" : "text-white/60 hover:text-white") : active ? "text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Caption above a control group inside a section. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-1 text-[12px] text-ink-3">{children}</p>;
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
  const changed = defaultValue !== undefined && Math.abs(value - defaultValue) > step / 2;

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
        <span
          className={`font-mono text-[11.5px] tabular-nums transition-colors duration-200 ${changed ? "text-accent" : "text-ink-3"}`}
        >
          {display}
        </span>
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
          className="pointer-events-none absolute top-1/2 size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(12,10,9,.12),0_2px_6px_rgba(12,10,9,.22)] transition-[scale,box-shadow] duration-200 ease-spring group-hover/slider:scale-110 group-has-[input:active]/slider:scale-125 group-has-[input:active]/slider:shadow-[0_0_0_1px_rgba(12,10,9,.12),0_0_0_6px_#2f5bff26,0_2px_6px_rgba(12,10,9,.22)] group-has-[input:focus-visible]/slider:ring-2 group-has-[input:focus-visible]/slider:ring-accent"
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
      className={`focus-ring group/switch relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 [--ring-offset:2px] ${
        checked ? "bg-accent" : "bg-well-strong shadow-[inset_0_0_0_1px_var(--color-hairline)]"
      }`}
    >
      <span
        className={`absolute left-0 top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-[translate,width] duration-300 ease-spring group-active/switch:w-5 ${
          checked ? "translate-x-[19px] group-active/switch:translate-x-[15px]" : "translate-x-[3px]"
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
    <div className="relative flex items-center justify-between gap-3 py-2">
      <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
        {label}
        {description && <InfoTip text={description} />}
      </p>
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
    <label className="group/color mb-2 flex h-10 cursor-pointer items-center gap-3 rounded-[10px] bg-surface px-2.5 shadow-raise transition-shadow duration-200 last:mb-0 hover:shadow-float">
      <span
        className="size-6 shrink-0 rounded-[7px] shadow-[inset_0_0_0_1px_rgba(12,10,9,.12)] transition-[scale] duration-300 ease-spring group-hover/color:scale-110"
        style={{ background: value }}
      />
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
            className={`focus-ring flex flex-col items-start gap-2 rounded-[12px] bg-surface p-2 text-left transition-[box-shadow,translate] duration-200 [--ring-offset:1px] ${
              active
                ? "shadow-[0_0_0_1.5px_var(--color-accent),0_6px_16px_-8px_#2f5bff80]"
                : "shadow-raise hover:-translate-y-px hover:shadow-float"
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
