"use client";

import { useState } from "react";

import {
  loadDemoScenario,
  clearDemoData,
  isDemoLoaded,
  LAGOS_FAMILY_SCENARIO,
} from "@/lib/demoData";
import { Group } from "@/lib/types";

interface DemoBannerProps {
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
  onDemoLoaded: (group: Group) => void;
  onDemoCleared: () => void;
  /** When the user already has real wallets, only show the banner if the demo is active (so Reset stays reachable). */
  hasGroups?: boolean;
}

export function DemoBanner({
  walletAddress,
  userEmail,
  userPhone,
  onDemoLoaded,
  onDemoCleared,
  hasGroups = false,
}: DemoBannerProps) {
  const [loading, setLoading] = useState(false);
  const [demoActive, setDemoActive] = useState(() => isDemoLoaded());

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const { group } = await loadDemoScenario(
        LAGOS_FAMILY_SCENARIO,
        walletAddress,
        userEmail,
        userPhone
      );
      setDemoActive(true);
      onDemoLoaded(group);
    } catch (error) {
      console.error("Failed to load demo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    setLoading(true);
    try {
      await clearDemoData(walletAddress);
      setDemoActive(false);
      onDemoCleared();
    } catch (error) {
      console.error("Failed to clear demo:", error);
    } finally {
      setLoading(false);
    }
  };

  if (demoActive) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-sun-100 px-4 py-3 ring-1 ring-sun-300">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-sun-400 px-2.5 py-0.5 text-xs font-bold text-ink">Demo</span>
          <span className="truncate text-sm font-medium text-ink-soft">Adeyemi family loaded</span>
        </div>
        <button
          type="button"
          onClick={handleClearDemo}
          disabled={loading}
          className="focus-ring shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-soft shadow-card transition-all hover:text-ink active:scale-95 disabled:opacity-50"
        >
          {loading ? "Resetting…" : "Reset demo"}
        </button>
      </div>
    );
  }

  if (hasGroups) return null;

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-coral-400 via-coral-500 to-fuchsia-600 p-5 text-white shadow-glow-coral">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-float rounded-full bg-sun-300/50 blur-2xl" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Try it in 10 seconds</p>
        <h3 className="mt-1 font-display text-2xl font-extrabold leading-tight">Meet the Adeyemi family</h3>
        <p className="mt-1 text-sm text-white/90">
          Mama Funke, Chidi and Ngozi — with balances, history and a request waiting for you.
        </p>
        <button
          type="button"
          onClick={handleLoadDemo}
          disabled={loading}
          className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-display text-sm font-bold text-coral-700 shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load the demo"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
