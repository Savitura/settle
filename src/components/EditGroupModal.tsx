"use client";

import { useEffect, useState } from "react";

import { manageGroup } from "@/lib/db";
import { Group } from "@/lib/types";
import { Sheet, SheetHeader } from "./ui/Sheet";

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onSaved: () => void | Promise<void>;
}

export function EditGroupModal({ isOpen, onClose, group, onSaved }: EditGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(group.name);
      setError(null);
      setSaving(false);
    }
  }, [isOpen, group.name]);

  const trimmed = name.trim();
  const unchanged = trimmed === group.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setError("Give your wallet a name");
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await manageGroup({ action: "rename", groupId: group.id, name: trimmed });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} label="Rename family wallet">
      <SheetHeader title="Rename wallet" onClose={onClose} />
      <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2">
        <label htmlFor="editGroupName" className="eyebrow mb-2 block">
          Wallet name
        </label>
        <input
          type="text"
          id="editGroupName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Adeyemi Family"
          className="w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-4 font-display text-xl font-bold text-ink placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-ink/40 focus:border-primary-300 focus:outline-none"
          required
          maxLength={50}
        />
        <p className="mt-4 text-sm text-ink-muted">Everyone in the wallet will see the new name.</p>

        {error && (
          <div className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-medium text-coral-700" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving || !trimmed || unchanged} className="btn-primary mt-6">
          {saving ? "Saving…" : "Save name"}
        </button>
      </form>
    </Sheet>
  );
}
