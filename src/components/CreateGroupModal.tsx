"use client";

import { useState } from "react";

import { createGroup } from "@/lib/db";
import { Group } from "@/lib/types";
import { Sheet, SheetHeader } from "./ui/Sheet";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreated,
  walletAddress,
  userEmail,
  userPhone,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error("Group name is required");
      }

      const group = await createGroup(
        name.trim(),
        walletAddress,
        undefined,
        userEmail,
        userPhone
      );

      onCreated(group);
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const suggestions = ["Family Savings", "Lagos Rent", "School Fees", "Mama's Upkeep"];

  return (
    <Sheet isOpen={isOpen} onClose={onClose} label="New family wallet">
      <SheetHeader title="New family wallet" onClose={onClose} />
      <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2">
        <label htmlFor="groupName" className="eyebrow mb-2 block">
          Give it a name
        </label>
        <input
          type="text"
          id="groupName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adeyemi Family"
          className="w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-4 font-display text-xl font-bold text-ink placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-ink/40 focus:border-primary-300 focus:outline-none"
          required
          maxLength={50}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="focus-ring rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold text-ink-soft transition-all hover:border-primary-300 hover:text-primary-700 active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-muted">You can invite up to 2 more people after creating it.</p>

        {error && (
          <div className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-medium text-coral-700" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={!name.trim()} className="btn-primary mt-6">
          Create wallet
        </button>
      </form>
    </Sheet>
  );
}
