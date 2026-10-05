"use client";

import { useState, useEffect } from "react";

import { Group, MoneyRequest } from "@/lib/types";
import { createMoneyRequest } from "@/lib/db";
import { formatNgn, getNgnRate } from "@/lib/currency";
import { Sheet, SheetHeader, StepPanel } from "./ui/Sheet";
import { AmountInput } from "./ui/AmountInput";
import { MemberPicker } from "./ui/MemberPicker";
import { Avatar, memberName } from "./ui/Avatar";
import { SuccessView, ErrorView } from "./ui/Status";

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type RequestStep = "form" | "confirm" | "success" | "error";

const NOTE_IDEAS = ["Market money", "Rent", "School fees", "Light bill", "Fuel"];

export function RequestMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
}: RequestMoneyModalProps) {
  const rate = getNgnRate();
  const [step, setStep] = useState<RequestStep>("form");
  const [amount, setAmount] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [note, setNote] = useState("");
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const ngnAmount = parseFloat(amount) || 0;
  const usdcAmount = ngnAmount / rate;
  const selectedMember = otherMembers.find((m) => m.id === selectedMemberId);
  const recipientName = selectedMember ? memberName(selectedMember) : "them";
  const isValidForm = ngnAmount > 0 && !!selectedMemberId;

  const handleContinue = () => {
    if (!selectedMemberId) {
      setError("Pick who you're asking");
      return;
    }
    if (!isValidForm) return;
    setError("");
    setStep("confirm");
  };

  const handleRequest = async () => {
    const recipientAddress = selectedMember?.walletAddress || "";
    setSubmitting(true);
    try {
      const newRequest = await createMoneyRequest({
        groupId: group.id,
        fromAddress: currentUserWallet,
        toAddress: recipientAddress,
        amountUsdc: usdcAmount.toFixed(6),
        amountNgn: ngnAmount.toFixed(0),
        note: note || undefined,
      });

      setRequest(newRequest);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("form");
    setAmount("");
    setSelectedMemberId("");
    setNote("");
    setRequest(null);
    setError("");
  };

  const handleClose = () => {
    if (step === "success") onSuccess();
    reset();
    onClose();
  };

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && otherMembers.length === 1 && !selectedMemberId) {
      setSelectedMemberId(otherMembers[0].id);
    }
  }, [isOpen, otherMembers, selectedMemberId]);

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} label="Request money">
      {step === "form" && (
        <StepPanel stepKey="form">
          <SheetHeader title="Request money" onClose={handleClose} step={1} totalSteps={2} />
          <div className="space-y-6 px-5 pb-5 pt-3">
            <AmountInput label="How much do you need?" value={amount} onChange={setAmount} tone="coral" />

            <MemberPicker
              label="Ask"
              members={otherMembers}
              selectedId={selectedMemberId}
              onSelect={(id) => {
                setSelectedMemberId(id);
                setError("");
              }}
              tone="coral"
              error={error}
            />

            <div>
              <label htmlFor="request-note" className="eyebrow mb-2 block">
                What&apos;s it for? <span className="font-medium normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="request-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Market money"
                maxLength={60}
                className="w-full rounded-2xl border-2 border-transparent bg-cream px-4 py-3.5 text-ink placeholder:text-ink/40 focus:border-coral-300 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {NOTE_IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setNote(idea)}
                    aria-pressed={note === idea}
                    className={`focus-ring rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-95 ${
                      note === idea
                        ? "border-coral-400 bg-coral-50 text-coral-700"
                        : "border-ink/10 bg-white text-ink-soft hover:border-ink/20"
                    }`}
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={handleContinue} disabled={!isValidForm} className="btn-coral">
              {ngnAmount > 0 && selectedMember
                ? `Continue · ask ${recipientName} for ${formatNgn(ngnAmount)}`
                : "Continue"}
            </button>
          </div>
        </StepPanel>
      )}

      {step === "confirm" && (
        <StepPanel stepKey="confirm">
          <SheetHeader title="Check your request" onBack={() => setStep("form")} step={2} totalSteps={2} />
          <div className="px-5 pb-5 pt-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coral-400 via-coral-500 to-fuchsia-600 p-6 text-center text-white shadow-glow-coral">
              <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-sun-300/40 blur-2xl" />
              <div className="relative mx-auto w-fit">
                <Avatar name={recipientName} seed={selectedMember?.walletAddress} size="lg" ring />
              </div>
              <p className="relative mt-4 text-sm font-medium text-white/85">Asking {recipientName} for</p>
              <p className="tabular relative mt-1 font-display text-5xl font-extrabold tracking-tight">
                {formatNgn(ngnAmount)}
              </p>
              {note && (
                <p className="relative mx-auto mt-3 w-fit rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                  {note}
                </p>
              )}
            </div>

            <button type="button" onClick={handleRequest} disabled={submitting} className="btn-coral mt-5">
              {submitting ? "Sending request…" : `Send request to ${recipientName}`}
            </button>
            <p className="mt-3 text-center text-sm text-ink-muted">
              {recipientName} will see it in the wallet and can pay in one tap.
            </p>
          </div>
        </StepPanel>
      )}

      {step === "success" && request && (
        <StepPanel stepKey="success">
          <SuccessView
            title="Request sent"
            tone="coral"
            celebrate={false}
            actions={
              <button type="button" onClick={handleClose} className="btn-coral">
                Back to {group.name}
              </button>
            }
          >
            You asked {recipientName} for <span className="tabular font-bold text-ink">{formatNgn(ngnAmount)}</span>
            {note ? ` for ${note.toLowerCase()}` : ""}.
          </SuccessView>
        </StepPanel>
      )}

      {step === "error" && (
        <StepPanel stepKey="error">
          <ErrorView message={error} onRetry={() => setStep("confirm")} onClose={handleClose} />
        </StepPanel>
      )}
    </Sheet>
  );
}
