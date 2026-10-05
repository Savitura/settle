"use client";

import { useState } from "react";

import { getGroupByInviteCode, joinGroup } from "@/lib/db";
import { Group } from "@/lib/types";
import { Sheet, SheetHeader } from "./ui/Sheet";
import { Avatar } from "./ui/Avatar";

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (group: Group) => void;
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
  initialCode?: string;
}

export function JoinGroupModal({
  isOpen,
  onClose,
  onJoined,
  walletAddress,
  userEmail,
  userPhone,
  initialCode = "",
}: JoinGroupModalProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [groupPreview, setGroupPreview] = useState<{
    name: string;
    memberCount: number;
  } | null>(null);

  const handleLookup = async () => {
    if (!code.trim()) return;
    setError(null);

    const group = await getGroupByInviteCode(code.trim());
    if (!group) {
      setError("Invalid invite code");
      setGroupPreview(null);
      return;
    }

    setGroupPreview({
      name: group.name,
      memberCount: group.members.length,
    });
  };

  const handleJoin = async () => {
    setError(null);

    try {
      const group = await joinGroup(
        code.trim(),
        walletAddress,
        undefined,
        userEmail,
        userPhone
      );

      if (!group) {
        setError("Invalid invite code");
        return;
      }

      onJoined(group);
      setCode("");
      setGroupPreview(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    setGroupPreview(null);
    setError(null);
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} label="Join a family wallet">
      <SheetHeader title="Join a family wallet" onClose={onClose} />
      <div className="px-5 pb-5 pt-2">
        <label htmlFor="inviteCode" className="eyebrow mb-2 block">
          Invite code
        </label>
        <input
          type="text"
          id="inviteCode"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="ABC123"
          autoComplete="off"
          className="w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-4 text-center font-mono text-3xl font-bold uppercase tracking-[0.3em] text-ink placeholder:text-ink/20 focus:border-primary-300 focus:outline-none"
          maxLength={6}
        />
        <p className="mt-2 text-center text-sm text-ink-muted">Ask a family member for their 6-character code</p>

        {groupPreview && (
          <div className="mt-5 flex animate-rise-in items-center gap-3 rounded-2xl bg-primary-50 p-4 ring-1 ring-primary-200">
            <Avatar name={groupPreview.name} size="md" tone={0} />
            <div>
              <p className="font-display text-lg font-bold text-ink">{groupPreview.name}</p>
              <p className="text-sm text-primary-800">
                {groupPreview.memberCount} member{groupPreview.memberCount !== 1 ? "s" : ""} waiting for you
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-medium text-coral-700" role="alert">
            {error}
          </div>
        )}

        <div className="mt-6">
          {groupPreview ? (
            <button type="button" onClick={handleJoin} className="btn-primary">
              Join {groupPreview.name}
            </button>
          ) : (
            <button type="button" onClick={handleLookup} disabled={code.length < 6} className="btn-primary">
              Find wallet
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
