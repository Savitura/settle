import type { ReactNode } from "react";

import { SettleIcon } from "./Icons";

/** One row of a getting-started checklist. Actions only show while the step is still to do. */
export function StartStep({
  index,
  title,
  body,
  done,
  children,
}: {
  index: number;
  title: string;
  body: ReactNode;
  done: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
          done ? "bg-primary-500 text-ink" : "bg-cream text-ink-soft ring-1 ring-ink/10"
        }`}
      >
        {done ? <SettleIcon size={16} /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? "text-ink-muted" : "text-ink"}`}>
          {title}
          {done && <span className="sr-only"> (done)</span>}
        </p>
        {!done && <div className="mt-0.5 text-sm text-ink-muted">{body}</div>}
        {!done && children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      </div>
    </li>
  );
}

export function StartAction({
  onClick,
  children,
  primary = false,
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        primary ? "bg-primary-500 text-ink shadow-glow" : "border border-ink/15 bg-white text-ink-soft hover:bg-ink/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
