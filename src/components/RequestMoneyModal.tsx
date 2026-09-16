"use client";

import { useState, useEffect } from "react";

import { Group, GroupMember, MoneyRequest } from "@/lib/types";
import { createMoneyRequest } from "@/lib/db";
import { formatNgn } from "@/lib/currency";

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type RequestStep = "form" | "confirm" | "success";

const DEMO_RATE = 1580;

export function RequestMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
}: RequestMoneyModalProps) {
  const [step, setStep] = useState<RequestStep>("form");
  const [amount, setAmount] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [note, setNote] = useState("");
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [error, setError] = useState("");

  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const ngnAmount = parseFloat(amount) || 0;
  const usdcAmount = ngnAmount / DEMO_RATE;

  const selectedMember = otherMembers.find((m) => m.id === selectedMemberId);

  const getRecipientName = (): string => {
    if (selectedMember) {
      return selectedMember.displayName || selectedMember.email || "them";
    }
    return "them";
  };

  const isValidForm = (): boolean => {
    if (ngnAmount <= 0) return false;
    if (!selectedMemberId) return false;
    return true;
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setAmount(sanitized);
  };

  const handleContinue = () => {
    if (!selectedMemberId) {
      setError("Pick someone in the group");
      return;
    }
    if (!isValidForm()) return;
    setError("");
    setStep("confirm");
  };

  const handleRequest = () => {
    const recipientAddress = selectedMember?.walletAddress || "";

    const newRequest = createMoneyRequest({
      groupId: group.id,
      fromAddress: currentUserWallet,
      toAddress: recipientAddress,
      amountUsdc: usdcAmount.toFixed(6),
      amountNgn: ngnAmount.toFixed(0),
      note: note || undefined,
    });

    setRequest(newRequest);
    setStep("success");
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    setStep("form");
    setAmount("");
    setSelectedMemberId("");
    setNote("");
    setRequest(null);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setAmount("");
      setSelectedMemberId("");
      setNote("");
      setRequest(null);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {step === "form" && (
          <FormStep
            amount={amount}
            ngnAmount={ngnAmount}
            selectedMemberId={selectedMemberId}
            otherMembers={otherMembers}
            note={note}
            validationError={error}
            onAmountChange={handleAmountChange}
            onMemberSelect={setSelectedMemberId}
            onNoteChange={setNote}
            onContinue={handleContinue}
            onClose={handleClose}
            isValidForm={isValidForm()}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            ngnAmount={ngnAmount}
            recipientName={getRecipientName()}
            note={note}
            onBack={() => setStep("form")}
            onConfirm={handleRequest}
          />
        )}

        {step === "success" && request && (
          <SuccessStep
            ngnAmount={ngnAmount}
            recipientName={getRecipientName()}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

function FormStep({
  amount,
  ngnAmount,
  selectedMemberId,
  otherMembers,
  note,
  validationError,
  onAmountChange,
  onMemberSelect,
  onNoteChange,
  onContinue,
  onClose,
  isValidForm,
}: {
  amount: string;
  ngnAmount: number;
  selectedMemberId: string;
  otherMembers: GroupMember[];
  note: string;
  validationError: string;
  onAmountChange: (value: string) => void;
  onMemberSelect: (id: string) => void;
  onNoteChange: (value: string) => void;
  onContinue: () => void;
  onClose: () => void;
  isValidForm: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Request money</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Amount (₦)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-gray-400">
              ₦
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border-2 border-gray-200 py-4 pl-12 pr-4 text-2xl font-semibold text-gray-900 transition-colors focus:border-primary-500 focus:outline-none"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            ≈ $1 = ₦1,580 · Demo rate
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Ask from</label>

          <div className="space-y-2">
            {otherMembers.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                No other members in this group yet
              </p>
            ) : (
              otherMembers.map((member) => {
                const displayName = member.displayName || member.email || "Member";
                return (
                  <button
                    key={member.id}
                    onClick={() => onMemberSelect(member.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                      selectedMemberId === member.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-medium text-white">
                      {displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{displayName}</p>
                    </div>
                    {selectedMemberId === member.id && (
                      <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {validationError && (
            <p className="mt-2 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="What's this for?"
            maxLength={100}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 transition-colors focus:border-primary-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onContinue}
          disabled={!isValidForm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request
        </button>
      </div>
    </>
  );
}

function ConfirmStep({
  ngnAmount,
  recipientName,
  note,
  onBack,
  onConfirm,
}: {
  ngnAmount: number;
  recipientName: string;
  note: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-gray-100 p-4">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Confirm request</h2>
      </div>

      <div className="p-4">
        <div className="mb-6 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-center text-white">
          <p className="text-sm font-medium text-amber-100">Requesting</p>
          <p className="mt-2 text-4xl font-bold">{formatNgn(ngnAmount)}</p>
          <p className="mt-2 text-sm text-amber-200">from {recipientName}</p>
        </div>

        {note && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Note</p>
            <p className="mt-1 font-medium text-gray-900">{note}</p>
          </div>
        )}

        <button
          onClick={onConfirm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Request
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          They&apos;ll get notified and can pay when ready.
        </p>
      </div>
    </>
  );
}

function SuccessStep({
  ngnAmount,
  recipientName,
  onClose,
}: {
  ngnAmount: number;
  recipientName: string;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Request sent</h3>
      </div>

      <div className="mb-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
        <p className="text-lg text-gray-900">
          Asked {recipientName} for {formatNgn(ngnAmount)}.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          They can pay whenever they&apos;re ready.
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Back to group
      </button>
    </div>
  );
}
