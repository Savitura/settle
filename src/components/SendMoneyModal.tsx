"use client";

import { useState, useEffect } from "react";

import { Group, GroupMember, Transaction } from "@/lib/types";
import { createTransaction, updateMemberBalance } from "@/lib/db";
import { generateMockTxHash, formatNgn } from "@/lib/currency";

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type SendStep = "form" | "confirm" | "sending" | "success" | "error";

const DEMO_RATE = 1580;

export function SendMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
}: SendMoneyModalProps) {
  const [step, setStep] = useState<SendStep>("form");
  const [amount, setAmount] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [showCashOut, setShowCashOut] = useState(false);

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );

  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const currentBalanceUsdc = parseFloat(currentMember?.balance.usdc || "0");
  const currentBalanceNgn = currentBalanceUsdc * DEMO_RATE;

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
    if (usdcAmount > currentBalanceUsdc) return false;
    if (!selectedMemberId) return false;
    return true;
  };

  const getFormError = (): string | null => {
    if (amount && usdcAmount > currentBalanceUsdc) {
      return "Not enough in your balance";
    }
    return null;
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

  const handleSend = async () => {
    setStep("sending");
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const txHash = generateMockTxHash();
      const recipientAddress = selectedMember?.walletAddress || "";

      const newTx = await createTransaction({
        groupId: group.id,
        type: "send",
        fromAddress: currentUserWallet,
        toAddress: recipientAddress,
        amountUsdc: usdcAmount.toFixed(6),
        amountNgn: ngnAmount.toFixed(0),
        txHash,
        status: "confirmed",
      });

      const newSenderBalance = (currentBalanceUsdc - usdcAmount).toFixed(6);
      await updateMemberBalance(group.id, currentUserWallet, newSenderBalance);

      if (selectedMember) {
        const recipientBalance = parseFloat(selectedMember.balance.usdc || "0");
        const newRecipientBalance = (recipientBalance + usdcAmount).toFixed(6);
        await updateMemberBalance(group.id, selectedMember.walletAddress, newRecipientBalance);
      }

      setTransaction(newTx);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    setStep("form");
    setAmount("");
    setSelectedMemberId("");
    setTransaction(null);
    setError("");
    setShowCashOut(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setAmount("");
      setSelectedMemberId("");
      setTransaction(null);
      setError("");
      setShowCashOut(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {step === "form" && (
          <FormStep
            currentBalanceNgn={currentBalanceNgn}
            amount={amount}
            ngnAmount={ngnAmount}
            selectedMemberId={selectedMemberId}
            otherMembers={otherMembers}
            formError={getFormError()}
            validationError={error}
            showCashOut={showCashOut}
            onAmountChange={handleAmountChange}
            onMemberSelect={setSelectedMemberId}
            onShowCashOutChange={setShowCashOut}
            onContinue={handleContinue}
            onClose={handleClose}
            isValidForm={isValidForm()}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            ngnAmount={ngnAmount}
            recipientName={getRecipientName()}
            showCashOut={showCashOut}
            onBack={() => setStep("form")}
            onConfirm={handleSend}
          />
        )}

        {step === "sending" && <SendingStep />}

        {step === "success" && transaction && (
          <SuccessStep
            ngnAmount={ngnAmount}
            recipientName={getRecipientName()}
            onClose={handleClose}
          />
        )}

        {step === "error" && (
          <ErrorStep
            error={error}
            onRetry={() => setStep("confirm")}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

function FormStep({
  currentBalanceNgn,
  amount,
  ngnAmount,
  selectedMemberId,
  otherMembers,
  formError,
  validationError,
  showCashOut,
  onAmountChange,
  onMemberSelect,
  onShowCashOutChange,
  onContinue,
  onClose,
  isValidForm,
}: {
  currentBalanceNgn: number;
  amount: string;
  ngnAmount: number;
  selectedMemberId: string;
  otherMembers: GroupMember[];
  formError: string | null;
  validationError: string;
  showCashOut: boolean;
  onAmountChange: (value: string) => void;
  onMemberSelect: (id: string) => void;
  onShowCashOutChange: (show: boolean) => void;
  onContinue: () => void;
  onClose: () => void;
  isValidForm: boolean;
}) {
  const theyGet = ngnAmount > 0 ? formatNgn(ngnAmount) : "₦0";

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Send money</h2>
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
            You send (₦)
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
              className={`w-full rounded-xl border-2 py-4 pl-12 pr-4 text-2xl font-semibold transition-colors ${
                formError
                  ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500"
                  : "border-gray-200 text-gray-900 focus:border-primary-500"
              } focus:outline-none`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              ≈ $1 = ₦1,580 · Demo rate
            </span>
            <span className={formError ? "text-red-600" : "text-gray-500"}>
              Balance: {formatNgn(currentBalanceNgn)}
            </span>
          </div>

          {formError && (
            <p className="mt-1 text-sm text-red-600">{formError}</p>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">They get</span>
            <span className="text-lg font-semibold text-gray-900">{theyGet}</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Send to</label>

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

        <div className="rounded-lg border border-gray-200 p-3">
          <label className="flex cursor-pointer items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Cash out to Naira (demo)</p>
              <p className="mt-0.5 text-xs text-gray-500">
                In the full product this pays to bank or mobile money. For this demo, balance updates in the group wallet.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showCashOut}
              onChange={(e) => onShowCashOutChange(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>

        <button
          onClick={onContinue}
          disabled={!isValidForm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>

        <p className="text-center text-xs text-gray-500">
          Settles in seconds. No bank transfer wait.
        </p>
      </div>
    </>
  );
}

function ConfirmStep({
  ngnAmount,
  recipientName,
  showCashOut,
  onBack,
  onConfirm,
}: {
  ngnAmount: number;
  recipientName: string;
  showCashOut: boolean;
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
        <h2 className="text-lg font-semibold text-gray-900">Confirm</h2>
      </div>

      <div className="p-4">
        <div className="mb-6 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-center text-white">
          <p className="text-sm font-medium text-primary-100">Sending</p>
          <p className="mt-2 text-4xl font-bold">{formatNgn(ngnAmount)}</p>
          <p className="mt-2 text-sm text-primary-200">to {recipientName}</p>
        </div>

        <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">They get</span>
            <span className="text-sm font-medium text-gray-900">{formatNgn(ngnAmount)}</span>
          </div>
          {showCashOut && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cash out</span>
              <span className="text-sm text-primary-600">Enabled (demo)</span>
            </div>
          )}
        </div>

        <button
          onClick={onConfirm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {showCashOut ? "Simulate cash out" : "Send"}
        </button>
      </div>
    </>
  );
}

function SendingStep() {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto mb-6 h-16 w-16">
        <svg className="h-16 w-16 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Sending...</h3>
      <p className="mt-2 text-sm text-gray-500">
        This will only take a moment
      </p>
    </div>
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Sent</h3>
      </div>

      <div className="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-green-50 p-5 text-center">
        <p className="text-lg text-gray-900">
          {formatNgn(ngnAmount)} is on the way to {recipientName}.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          They can cash out when ready.
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

function ErrorStep({
  error,
  onRetry,
  onClose,
}: {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Something went wrong</h3>
      <p className="mt-2 text-sm text-gray-500">{error}</p>

      <div className="mt-6 space-y-3">
        <button
          onClick={onRetry}
          className="w-full rounded-lg bg-primary-600 py-3 text-sm font-medium text-white hover:bg-primary-700"
        >
          Try again
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
