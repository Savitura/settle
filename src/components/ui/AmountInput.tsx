"use client";

import { useId } from "react";

import { formatDigits } from "@/lib/currency";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

export function AmountInput({
  label,
  value,
  onChange,
  error,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string;
  onChange: (digits: string) => void;
  error?: string | null;
  hint?: React.ReactNode;
  tone?: "primary" | "coral";
}) {
  const id = useId();
  const hasValue = value.length > 0;
  const accent =
    tone === "coral"
      ? "focus-within:border-coral-400 focus-within:ring-coral-200/60"
      : "focus-within:border-primary-400 focus-within:ring-primary-200/60";
  const chipActive =
    tone === "coral"
      ? "border-coral-400 bg-coral-50 text-coral-700"
      : "border-primary-400 bg-primary-50 text-primary-700";

  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">
        {label}
      </label>
      <div
        className={`flex items-baseline justify-center gap-1 rounded-3xl border-2 bg-cream px-4 py-5 ring-4 ring-transparent transition-all ${
          error ? "border-coral-400 bg-coral-50" : `border-transparent ${accent}`
        }`}
      >
        <span
          className={`font-display text-3xl font-bold ${hasValue ? "text-ink" : "text-ink/30"}`}
          aria-hidden="true"
        >
          ₦
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatDigits(value)}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
          placeholder="0"
          aria-invalid={!!error}
          className="tabular w-full min-w-0 max-w-[12ch] bg-transparent text-center font-display text-5xl font-extrabold tracking-tight text-ink placeholder:text-ink/25 focus:outline-none"
          style={{ width: `${Math.max(1, formatDigits(value).length || 1) + 0.5}ch` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Quick amounts">
        {QUICK_AMOUNTS.map((amt) => {
          const active = value === String(amt);
          return (
            <button
              key={amt}
              type="button"
              onClick={() => onChange(String(amt))}
              aria-pressed={active}
              className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95 ${
                active ? chipActive : "border-ink/10 bg-white text-ink-soft hover:border-ink/20"
              }`}
            >
              ₦{amt.toLocaleString("en-NG")}
            </button>
          );
        })}
      </div>

      {(error || hint) && (
        <div className={`mt-3 text-center text-sm ${error ? "font-medium text-coral-700" : "text-ink-muted"}`} role={error ? "alert" : undefined}>
          {error || hint}
        </div>
      )}
    </div>
  );
}
