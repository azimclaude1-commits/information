import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useMinWidth } from "../marketModel";
import { Sheet } from "./Sheet";

export type DropdownOption<V extends string> = {
  value: V;
  label: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** short tag on the right, e.g. 推荐 */
  badge?: React.ReactNode;
  /** green by default; `warn` for cautions such as a discontinued coin */
  badgeTone?: "warn";
  disabled?: boolean;
};

/**
 * Field-styled select. From 640px the options open in a popover under the trigger (portal + fixed
 * position, flips upward when there is no room, follows scroll); below 640px they open in a bottom
 * `Sheet`. Never use a native `<select>` for option lists with icons or long names.
 */
export function Dropdown<V extends string>({
  label,
  title,
  value,
  options,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  /** sheet title on phones (defaults to the label) */
  title?: string;
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  disabled?: boolean;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const wide = useMinWidth(640);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12,
      above = r.top - 12;
    const up = below < 260 && above > below;
    setPos({
      left: r.left,
      width: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      maxHeight: Math.max(160, Math.min(360, up ? above : below)),
    });
  };
  useLayoutEffect(() => {
    if (open && wide) place();
  }, [open, wide]);
  useEffect(() => {
    if (!open || !wide) return;
    const outside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(pop.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? Math.min(items.length - 1, at + 1) : Math.max(0, at - 1);
        items[next]?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    // Focus the selected option so arrow keys start from it.
    requestAnimationFrame(() => pop.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, wide]);

  const pick = (v: V) => {
    onChange(v);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const list = (
    <div className="sh-dd-list" role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          disabled={o.disabled}
          className="sh-dd-opt"
          onClick={() => pick(o.value)}
        >
          {o.icon}
          <span className="sh-dd-main">
            <b>{o.label}</b>
            {o.sub && <small>{o.sub}</small>}
          </span>
          {o.badge && <em className={`sh-dd-badge${o.badgeTone ? ` is-${o.badgeTone}` : ""}`}>{o.badge}</em>}
          <i className="sh-dd-check">{o.value === value && <Check size={16} strokeWidth={2.6} />}</i>
        </button>
      ))}
    </div>
  );

  return (
    <div className="sh-field sh-dd-field">
      <span id={`${id}-label`}>{label}</span>
      <button
        ref={trigger}
        type="button"
        className="sh-dd"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {current?.icon}
        <span className="sh-dd-main" id={`${id}-value`}>
          <b>{current?.label}</b>
          {current?.sub && <small>{current.sub}</small>}
        </span>
        {/* Only cautions stay visible on the closed field; other tags would crowd long labels. */}
        {current?.badge && current.badgeTone === "warn" && (
          <em className="sh-dd-badge is-warn">{current.badge}</em>
        )}
        <ChevronDown size={18} className="sh-dd-caret" />
      </button>
      {hint && <p className="sh-hint">{hint}</p>}
      {open &&
        (wide
          ? pos &&
            createPortal(
              <div
                ref={pop}
                className="sh-dd-pop"
                style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
              >
                {list}
              </div>,
              document.body,
            )
          : (
            <Sheet title={title ?? label} size="sm" onClose={() => setOpen(false)} className="sh-dd-sheet">
              {list}
            </Sheet>
          ))}
    </div>
  );
}
