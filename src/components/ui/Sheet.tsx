import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import "./sheet.css";

let openSheets = 0;

/** Bottom sheet below 640px, centred dialog above it. Used by every secondary flow. */
export function Sheet({
  title,
  subtitle,
  onClose,
  onBack,
  footer,
  size = "md",
  tone,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  tone?: "danger";
  className?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (!openSheets++) document.documentElement.classList.add("sh-locked");
    panel.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const all = document.querySelectorAll(".sh-panel");
      if (all[all.length - 1] !== panel.current) return;
      e.stopPropagation();
      close.current();
    };
    document.addEventListener("keydown", key, true);
    return () => {
      if (!--openSheets) document.documentElement.classList.remove("sh-locked");
      document.removeEventListener("keydown", key, true);
      previous?.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div
      className="sh-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`sh-panel sh-${size} ${tone ? `sh-${tone}` : ""} ${className}`}
      >
        <i className="sh-grip" aria-hidden />
        {(title || onBack) && (
          <header className="sh-head">
            {onBack && (
              <button className="sh-icon" aria-label="Back" onClick={onBack}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="sh-title">
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button className="sh-icon" aria-label="Close" onClick={onClose}>
              <X size={19} />
            </button>
          </header>
        )}
        <div className="sh-body">{children}</div>
        {footer && <footer className="sh-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Small confirm dialog built on Sheet. */
export function ConfirmSheet({
  title,
  children,
  confirm,
  cancel,
  danger,
  onConfirm,
  onClose,
  disabled,
}: {
  title: string;
  children?: React.ReactNode;
  confirm: string;
  cancel: string;
  danger?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      size="sm"
      tone={danger ? "danger" : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="sh-btn" onClick={onClose}>
            {cancel}
          </button>
          <button
            className={`sh-btn ${danger ? "sh-btn-danger" : "sh-btn-primary"}`}
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirm}
          </button>
        </>
      }
    >
      {children}
    </Sheet>
  );
}

/** Label/value rows used in detail sheets. */
export function SheetRows({
  rows,
}: {
  rows: [React.ReactNode, React.ReactNode, string?][];
}) {
  return (
    <dl className="sh-rows">
      {rows.map(([k, v, cls], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd className={cls}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Six separate digit cells over one hidden input (codes, PINs). */
export function DigitInput({
  value,
  onChange,
  length = 6,
  masked,
  autoFocus,
  invalid,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  masked?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  label: string;
}) {
  return (
    <label className={`sh-digits ${invalid ? "is-invalid" : ""}`}>
      <input
        aria-label={label}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
      />
      {Array.from({ length }, (_, i) => (
        <span
          key={i}
          className={i === value.length ? "is-caret" : value[i] ? "is-filled" : ""}
        >
          {value[i] ? (masked ? "•" : value[i]) : ""}
        </span>
      ))}
    </label>
  );
}
