"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { AlertIcon } from "./Icons";

/** Animated "money is moving" screen: pulsing rings + progress bar. */
export function ProcessingView({
  title,
  subtitle,
  tone = "primary",
  from,
  to,
}: {
  title: string;
  subtitle: string;
  tone?: "primary" | "coral";
  from?: ReactNode;
  to?: ReactNode;
}) {
  const ring = tone === "coral" ? "bg-coral-300" : "bg-primary-300";
  const bar = tone === "coral" ? "from-coral-300 to-coral-500" : "from-primary-300 to-primary-600";

  return (
    <div className="px-6 pb-8 pt-6 text-center" role="status" aria-live="polite">
      <div className="relative mx-auto mb-8 flex h-28 items-center justify-center gap-10">
        {from}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className={`absolute inset-0 animate-ring-out rounded-full ${ring}`} />
          <span className={`absolute inset-0 animate-ring-out rounded-full ${ring} [animation-delay:0.5s]`} />
          <span className={`relative h-4 w-4 rounded-full bg-gradient-to-br ${bar}`} />
        </div>
        {to}
      </div>
      <h3 className="font-display text-2xl font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
      <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full animate-progress rounded-full bg-gradient-to-r ${bar}`} />
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#0fb872", "#ff6d38", "#ffc91f", "#d946ef", "#38bdf8", "#32d08b"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 22 }).map((_, i) => {
      const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 70;
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist - 20}px`,
        rot: `${Math.random() * 540 - 270}deg`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${Math.random() * 120}ms`,
        shape: i % 3 === 0 ? "rounded-full" : "rounded-[2px]",
        size: 6 + Math.round(Math.random() * 4),
      };
    })
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`absolute animate-confetti ${p.shape}`}
          style={
            {
              width: p.size,
              height: p.size * (p.shape === "rounded-full" ? 1 : 0.5),
              backgroundColor: p.color,
              animationDelay: p.delay,
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Celebratory success: popping badge, drawn tick and a confetti burst. */
export function SuccessView({
  title,
  children,
  tone = "primary",
  actions,
  celebrate = true,
}: {
  title: string;
  children?: ReactNode;
  tone?: "primary" | "coral";
  actions: ReactNode;
  celebrate?: boolean;
}) {
  const badge =
    tone === "coral"
      ? "from-coral-300 to-coral-500 shadow-glow-coral"
      : "from-primary-400 to-primary-600 shadow-glow";
  return (
    <div className="px-6 pb-6 pt-4 text-center">
      <div className="relative mx-auto mb-5 h-24 w-24">
        {celebrate && <Confetti />}
        <div
          className={`relative flex h-24 w-24 animate-pop items-center justify-center rounded-full bg-gradient-to-br ${badge}`}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="white"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              className="animate-draw"
            />
          </svg>
        </div>
      </div>
      <h3 className="animate-rise-in font-display text-3xl font-extrabold tracking-tight text-ink [animation-delay:200ms]">
        {title}
      </h3>
      {children && (
        <div className="mt-2 animate-rise-in text-base text-ink-soft [animation-delay:300ms]">{children}</div>
      )}
      <div className="mt-7 animate-rise-in space-y-3 [animation-delay:400ms]">{actions}</div>
    </div>
  );
}

export function ErrorView({
  message,
  onRetry,
  onClose,
  fundsMayHaveMoved = false,
}: {
  message: string;
  onRetry: () => void;
  onClose: () => void;
  fundsMayHaveMoved?: boolean;
}) {
  return (
    <div className="px-6 pb-6 pt-4 text-center" role="alert">
      <div className="mx-auto mb-4 flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-coral-100 text-coral-600">
        <AlertIcon size={28} />
      </div>
      <h3 className="font-display text-2xl font-bold text-ink">That didn&apos;t go through</h3>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {fundsMayHaveMoved
          ? "Your payment was submitted. Retry to check its confirmation — Settle will not send it twice."
          : "No money has left your balance."}
      </p>
      <div className="mt-6 space-y-3">
        <button type="button" onClick={onRetry} className="btn-primary">
          Try again
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Smoothly counts a number up/down when it changes (starts from 0 on mount). */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = current.current;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
