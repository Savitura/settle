"use client";

import { useState, useEffect } from "react";

import { Group, MoneyRequest, Transaction } from "@/lib/types";
import {
  updateRequestStatus,
  updateMemberBalance,
  createTransaction,
} from "@/lib/db";
import { formatNgn, generateMockTxHash } from "@/lib/currency";

interface SettleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MoneyRequest;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type SettleStep = "confirm" | "sending" | "success" | "error";

const DEMO_RATE = 1580;

export function SettleRequestModal({
  isOpen,
  onClose,
  request,
  group,
  currentUserWallet,
  onSuccess,
}: SettleRequestModalProps) {
  const [step, setStep] = useState<SettleStep>("confirm");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

  const requester = group.members.find(
    (m) => m.walletAddress.toLowerCase() === request.fromAddress.toLowerCase()
  );
  const requesterName =
    requester?.displayName || requester?.email || "them";

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );
  const currentBalanceUsdc = parseFloat(currentMember?.balance.usdc || "0");
  const currentBalanceNgn = currentBalanceUsdc * DEMO_RATE;

  const requestAmountUsdc = parseFloat(request.amountUsdc);
  const requestAmountNgn = parseFloat(request.amountNgn);
  const hasEnoughBalance = currentBalanceUsdc >= requestAmountUsdc;

  const handlePay = async () => {
    if (!hasEnoughBalance) {
      setError("Not enough balance to pay this request");
      setStep("error");
      return;
    }

    setStep("sending");
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const txHash = generateMockTxHash();

      const newTx = createTransaction({
        groupId: group.id,
        type: "settle",
        fromAddress: currentUserWallet,
        toAddress: request.fromAddress,
        amountUsdc: request.amountUsdc,
        amountNgn: request.amountNgn,
        txHash,
        status: "confirmed",
        note: request.note,
      });

      const newPayerBalance = (currentBalanceUsdc - requestAmountUsdc).toFixed(6);
      updateMemberBalance(group.id, currentUserWallet, newPayerBalance);

      if (requester) {
        const requesterBalance = parseFloat(requester.balance.usdc || "0");
        const newRequesterBalance = (requesterBalance + requestAmountUsdc).toFixed(6);
        updateMemberBalance(group.id, requester.walletAddress, newRequesterBalance);
      }

      updateRequestStatus(request.id, "paid", newTx.id);

      setTransaction(newTx);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const handleDecline = () => {
    updateRequestStatus(request.id, "declined");
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    setStep("confirm");
    setTransaction(null);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setTransaction(null);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {step === "confirm" && (
          <ConfirmStep
            requestAmountNgn={requestAmountNgn}
            requesterName={requesterName}
            note={request.note}
            currentBalanceNgn={currentBalanceNgn}
            hasEnoughBalance={hasEnoughBalance}
            onPay={handlePay}
            onDecline={handleDecline}
            onClose={handleClose}
          />
        )}

        {step === "sending" && <SendingStep />}

        {step === "success" && transaction && (
          <SuccessStep
            amountNgn={requestAmountNgn}
            requesterName={requesterName}
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

function ConfirmStep({
  requestAmountNgn,
  requesterName,
  note,
  currentBalanceNgn,
  hasEnoughBalance,
  onPay,
  onDecline,
  onClose,
}: {
  requestAmountNgn: number;
  requesterName: string;
  note?: string;
  currentBalanceNgn: number;
  hasEnoughBalance: boolean;
  onPay: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Settle up</h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="mb-6 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-center text-white">
          <p className="mt-2 text-lg font-medium">
            You owe {requesterName} {formatNgn(requestAmountNgn)}
          </p>
        </div>

        {note && (
          <div className="mb-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">For</p>
            <p className="mt-1 font-medium text-gray-900">{note}</p>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <span className="text-sm text-gray-600">Your balance</span>
          <span className={`text-sm font-medium ${hasEnoughBalance ? "text-gray-900" : "text-red-600"}`}>
            {formatNgn(currentBalanceNgn)}
          </span>
        </div>

        {!hasEnoughBalance && (
          <p className="mb-4 text-center text-sm text-red-600">
            Not enough balance to pay this request
          </p>
        )}

        <div className="space-y-3">
          <button
            onClick={onPay}
            disabled={!hasEnoughBalance}
            className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as paid
          </button>
          <button
            onClick={onDecline}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Decline
          </button>
        </div>
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
      <h3 className="text-lg font-semibold text-gray-900">Settling...</h3>
      <p className="mt-2 text-sm text-gray-500">
        This will only take a moment
      </p>
    </div>
  );
}

function SuccessStep({
  requesterName,
  onClose,
}: {
  amountNgn: number;
  requesterName: string;
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
        <h3 className="text-xl font-semibold text-gray-900">Settled with {requesterName}</h3>
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
