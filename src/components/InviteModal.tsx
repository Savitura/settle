"use client";

import { useState } from "react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  groupName: string;
}

export function InviteModal({
  isOpen,
  onClose,
  inviteCode,
  groupName,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${inviteCode}`
      : "";

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Settle`,
          text: `Join my family wallet "${groupName}" using code: ${inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to share:", err);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Invite Members
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

        <p className="mb-4 text-sm text-gray-600">
          Share this code or link with family members to invite them to{" "}
          <span className="font-medium">{groupName}</span>.
        </p>

        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Invite Code
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl font-bold tracking-wider text-gray-900">
              {inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="rounded-lg bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Invite Link
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 truncate rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
            />
            <button
              onClick={handleCopyLink}
              className="rounded-lg bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
