"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { BackIcon, CloseIcon } from "./Icons";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible title for the dialog. Rendered by <SheetHeader> when used. */
  label: string;
  /** Prevent closing via backdrop/Escape (e.g. while money is moving). */
  locked?: boolean;
}

/**
 * Bottom sheet on phones, centred card on larger screens.
 * Handles Escape, backdrop tap, scroll lock and initial focus.
 */
export function Sheet({ isOpen, onClose, children, label, locked }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);
  onCloseRef.current = onClose;
  lockedRef.current = locked;

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lockedRef.current) onCloseRef.current();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Focus the first input if there is one, otherwise the panel itself
    requestAnimationFrame(() => {
      const input = panelRef.current?.querySelector<HTMLElement>("input, textarea");
      (input ?? panelRef.current)?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-[2px]"
        onClick={() => !locked && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full max-w-md animate-sheet-up overflow-y-auto overscroll-contain rounded-t-[28px] bg-white pb-safe shadow-2xl focus:outline-none sm:animate-rise-in sm:rounded-[28px]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ink/10 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  title,
  onClose,
  onBack,
  step,
  totalSteps,
}: {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  step?: number;
  totalSteps?: number;
}) {
  const titleId = useId();
  return (
    <div className="px-5 pb-2 pt-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <IconButton label="Go back" onClick={onBack}>
            <BackIcon />
          </IconButton>
        )}
        <h2 id={titleId} className="flex-1 font-display text-xl font-bold text-ink">
          {title}
        </h2>
        {onClose && (
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </div>
      {step !== undefined && totalSteps !== undefined && (
        <StepBar step={step} total={totalSteps} />
      )}
    </div>
  );
}

export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="mt-3 flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      aria-label={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500 ${
              i < step ? "w-full" : "w-0"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}

/** Wraps step content so each step slides in. Change `stepKey` to animate. */
export function StepPanel({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  return (
    <div key={stepKey} className="animate-step-in">
      {children}
    </div>
  );
}
