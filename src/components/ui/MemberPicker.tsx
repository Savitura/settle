"use client";

import type { GroupMember } from "@/lib/types";

import { Avatar, memberName } from "./Avatar";

/** Horizontal row of big tappable faces — faster than a vertical list for 1–3 people. */
export function MemberPicker({
  label,
  members,
  selectedId,
  onSelect,
  tone = "primary",
  error,
}: {
  label: string;
  members: GroupMember[];
  selectedId: string;
  onSelect: (id: string) => void;
  tone?: "primary" | "coral";
  error?: string;
}) {
  const ring = tone === "coral" ? "ring-coral-400" : "ring-primary-500";
  const check = tone === "coral" ? "bg-coral-500" : "bg-primary-600";

  return (
    <div>
      <p className="eyebrow mb-3" id="member-picker-label">
        {label}
      </p>
      {members.length === 0 ? (
        <p className="rounded-2xl bg-cream p-4 text-center text-sm text-ink-muted">
          Invite someone to this wallet first
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1" role="radiogroup" aria-labelledby="member-picker-label">
          {members.map((member) => {
            const name = memberName(member);
            const selected = selectedId === member.id;
            return (
              <button
                key={member.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(member.id)}
                className={`focus-ring flex min-w-[88px] flex-col items-center gap-2 rounded-2xl px-2 py-3 transition-all active:scale-95 ${
                  selected ? "bg-cream" : "hover:bg-cream/70"
                }`}
              >
                <div className="relative">
                  <div className={`rounded-full ring-offset-2 transition-all ${selected ? `ring-[3px] ${ring}` : ""}`}>
                    <Avatar name={name} seed={member.walletAddress} size="lg" />
                  </div>
                  {selected && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 animate-pop items-center justify-center rounded-full border-2 border-white text-white ${check}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <span className={`max-w-[88px] truncate text-sm ${selected ? "font-bold text-ink" : "font-medium text-ink-soft"}`}>
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-coral-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
