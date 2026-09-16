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
}

export function DemoBanner({
  walletAddress,
  userEmail,
  userPhone,
  onDemoLoaded,
  onDemoCleared,
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Demo Mode
            </span>
            <span className="text-sm text-amber-700">
              Lagos family scenario loaded
            </span>
          </div>
          <button
            onClick={handleClearDemo}
            disabled={loading}
            className="text-xs text-amber-600 underline hover:text-amber-800 disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-primary-800">
            Try the Demo
          </h3>
          <p className="mt-1 text-xs text-primary-600">
            Load a Lagos family scenario to explore all features
          </p>
        </div>
        <button
          onClick={handleLoadDemo}
          disabled={loading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Demo"}
        </button>
      </div>
    </div>
  );
}
