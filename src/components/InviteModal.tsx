"use client";

import { useState } from "react";

import { Sheet, SheetHeader } from "./ui/Sheet";
import { CopyIcon, ShareIcon } from "./ui/Icons";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  groupName: string;
}

export function InviteModal({ isOpen, onClose, inviteCode, groupName }: InviteModalProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const inviteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join?code=${inviteCode}` : "";
  const shareText = `Join our family wallet "${groupName}" on Settle. Use code ${inviteCode} or tap: ${inviteUrl}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async (what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "code" ? inviteCode : inviteUrl);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: `Join ${groupName} on Settle`, text: shareText, url: inviteUrl });
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Failed to share:", err);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} label="Invite family">
      <SheetHeader title="Invite family" onClose={onClose} />
      <div className="px-5 pb-5 pt-2">
        <p className="text-sm text-ink-muted">
          Anyone with this code can join <span className="font-semibold text-ink">{groupName}</span>.
        </p>

        <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-6 text-center text-white shadow-glow">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-sun-300/30 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-primary-100">Invite code</p>
          <p className="relative mt-2 font-mono text-4xl font-bold tracking-[0.3em]">{inviteCode}</p>
          <button
            type="button"
            onClick={() => copy("code")}
            className="focus-ring relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition-all hover:bg-white/30 active:scale-95"
          >
            <CopyIcon size={16} />
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-[#073b1d] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={canShare ? handleShare : () => copy("link")}
            className="btn-ghost"
          >
            {canShare ? <ShareIcon size={16} /> : <CopyIcon size={16} />}
            {canShare ? "Share link" : copied === "link" ? "Link copied" : "Copy link"}
          </button>
        </div>

        <button type="button" onClick={onClose} className="mt-3 w-full py-3 text-sm font-semibold text-ink-muted hover:text-ink">
          Done
        </button>
      </div>
    </Sheet>
  );
}
