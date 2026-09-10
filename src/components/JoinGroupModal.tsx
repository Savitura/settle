"use client";

import { useState } from "react";

import { getGroupByInviteCode, joinGroup } from "@/lib/db";
import { Group } from "@/lib/types";

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

  if (!isOpen) return null;

  const handleLookup = () => {
    if (!code.trim()) return;
    setError(null);

    const group = getGroupByInviteCode(code.trim());
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

  const handleJoin = () => {
    setError(null);

    try {
      const group = joinGroup(
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Join Family Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="inviteCode"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Invite Code
          </label>
          <input
            type="text"
            id="inviteCode"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter 6-character code"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-xl font-bold uppercase tracking-widest text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            maxLength={6}
            autoFocus
          />
        </div>

        {groupPreview && (
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              {groupPreview.name}
            </p>
            <p className="text-xs text-green-600">
              {groupPreview.memberCount} member
              {groupPreview.memberCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {groupPreview ? (
            <button
              type="button"
              onClick={handleJoin}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Join Wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLookup}
              disabled={code.length < 6}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Look Up
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
