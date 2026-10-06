"use client";

import { useEffect, useState } from "react";

import { saveProfileLocally, updateProfile } from "@/lib/db";
import { ProfileInput } from "@/lib/types";
import { Sheet, SheetHeader } from "./ui/Sheet";
import { Avatar } from "./ui/Avatar";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (profile: ProfileInput) => void | Promise<void>;
  initial: { displayName: string; phone: string; email: string };
  /** The user's wallet address: keeps the avatar colour consistent and keys the copy saved on this device. */
  seed: string;
  walletCount: number;
}

const fieldClass =
  "w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-3.5 text-ink placeholder:text-ink/40 focus:border-primary-300 focus:outline-none";

export function ProfileModal({ isOpen, onClose, onSaved, initial, seed, walletCount }: ProfileModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initial.displayName);
      setPhone(initial.phone);
      setEmail(initial.email);
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    if (!displayName) {
      setError("Add the name your family knows you by");
      return;
    }
    const profile: ProfileInput = {
      displayName,
      phone: phone.trim() || null,
      email: email.trim() || null,
    };

    setSaving(true);
    setError(null);
    try {
      await updateProfile(profile);
      saveProfileLocally(seed, profile);
      await onSaved(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} label="Your profile">
      <SheetHeader title="Your profile" onClose={onClose} />
      <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2">
        <div className="flex items-center gap-4 rounded-3xl bg-cream p-4">
          <Avatar name={name.trim() || "?"} seed={seed} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink">{name.trim() || "Your name"}</p>
            <p className="text-sm text-ink-muted">This is how your family sees you.</p>
          </div>
        </div>

        <label htmlFor="profile-name" className="eyebrow mb-2 mt-6 block">
          Your name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mama Funke"
          autoComplete="name"
          maxLength={50}
          required
          className="w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-4 font-display text-xl font-bold text-ink placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-ink/40 focus:border-primary-300 focus:outline-none"
        />

        <label htmlFor="profile-phone" className="eyebrow mb-2 mt-5 block">
          Phone number <span className="font-medium normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +234 803 123 4567"
          autoComplete="tel"
          maxLength={20}
          className={fieldClass}
        />

        <label htmlFor="profile-email" className="eyebrow mb-2 mt-5 block">
          Email <span className="font-medium normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. funke@example.com"
          autoComplete="email"
          maxLength={255}
          className={fieldClass}
        />

        <p className="mt-4 text-sm text-ink-muted">
          {walletCount > 0
            ? `Your family sees this in ${walletCount === 1 ? "your family wallet" : `all ${walletCount} of your family wallets`}. It doesn't change how you sign in.`
            : "We'll use this when you start or join a family wallet. It doesn't change how you sign in."}
        </p>

        {error && (
          <div className="mt-4 rounded-2xl bg-coral-50 p-3 text-sm font-medium text-coral-700" role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving || !name.trim()} className="btn-primary mt-6">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}
