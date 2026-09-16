"use client";

import { useState, useEffect } from "react";

import { Group, GroupMember, Transaction, TransactionStatus } from "@/lib/types";
import { createTransaction, updateMemberBalance } from "@/lib/db";
import { generateMockTxHash, getExplorerTxUrl, formatNgn, usdcToNgn, ngnToUsdc } from "@/lib/currency";

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type SendStep = "form" | "confirm" | "sending" | "success" | "error";

interface RecipientOption {
  type: "member" | "external";
  member?: GroupMember;
  address?: string;
  label: string;
}

export function SendMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
}: SendMoneyModalProps) {
  const [step, setStep] = useState<SendStep>("form");
  const [amount, setAmount] = useState("");
  const [inputMode, setInputMode] = useState<"usdc" | "ngn">("ngn");
  const [recipientType, setRecipientType] = useState<"member" | "external">("member");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [externalAddress, setExternalAddress] = useState("");
  const [note, setNote] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );

  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const currentBalance = parseFloat(currentMember?.balance.usdc || "0");

  const usdcAmount = inputMode === "usdc" 
    ? parseFloat(amount) || 0 
    : ngnToUsdc(parseFloat(amount) || 0);
  
  const ngnAmount = inputMode === "ngn" 
    ? parseFloat(amount) || 0 
    : usdcToNgn(parseFloat(amount) || 0);

  const getRecipientLabel = (): string => {
    if (recipientType === "member" && selectedMemberId) {
      const member = otherMembers.find((m) => m.id === selectedMemberId);
      return member?.displayName || member?.email || `${member?.walletAddress.slice(0, 8)}...`;
    }
    if (recipientType === "external" && externalAddress) {
      return `${externalAddress.slice(0, 8)}...${externalAddress.slice(-6)}`;
    }
    return "Recipient";
  };

  const getRecipientAddress = (): string => {
    if (recipientType === "member" && selectedMemberId) {
      const member = otherMembers.find((m) => m.id === selectedMemberId);
      return member?.walletAddress || "";
    }
    return externalAddress;
  };

  const isValidForm = (): boolean => {
    if (usdcAmount <= 0) return false;
    if (usdcAmount > currentBalance) return false;
    if (recipientType === "member" && !selectedMemberId) return false;
    if (recipientType === "external" && !isValidAddress(externalAddress)) return false;
    return true;
  };

  const isValidAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(sanitized);
  };

  const handleContinue = () => {
    if (!isValidForm()) return;
    setStep("confirm");
  };

  const handleSend = async () => {
    setStep("sending");
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const txHash = generateMockTxHash();
      const recipientAddress = getRecipientAddress();
      
      const newTx = createTransaction({
        groupId: group.id,
        type: "send",
        fromAddress: currentUserWallet,
        toAddress: recipientAddress,
        amountUsdc: usdcAmount.toFixed(6),
        amountNgn: ngnAmount.toFixed(2),
        txHash,
        status: "confirmed",
        note: note || undefined,
      });

      const newSenderBalance = (currentBalance - usdcAmount).toFixed(6);
      updateMemberBalance(group.id, currentUserWallet, newSenderBalance);

      if (recipientType === "member" && selectedMemberId) {
        const recipientMember = otherMembers.find((m) => m.id === selectedMemberId);
        if (recipientMember) {
          const recipientBalance = parseFloat(recipientMember.balance.usdc || "0");
          const newRecipientBalance = (recipientBalance + usdcAmount).toFixed(6);
          updateMemberBalance(group.id, recipientMember.walletAddress, newRecipientBalance);
        }
      }

      setTransaction(newTx);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
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
    setExternalAddress("");
    setNote("");
    setTransaction(null);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setAmount("");
      setSelectedMemberId("");
      setExternalAddress("");
      setNote("");
      setTransaction(null);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {step === "form" && (
          <FormStep
            currentBalance={currentBalance}
            amount={amount}
            inputMode={inputMode}
            usdcAmount={usdcAmount}
            ngnAmount={ngnAmount}
            recipientType={recipientType}
            selectedMemberId={selectedMemberId}
            externalAddress={externalAddress}
            note={note}
            otherMembers={otherMembers}
            onAmountChange={handleAmountChange}
            onInputModeChange={setInputMode}
            onRecipientTypeChange={setRecipientType}
            onMemberSelect={setSelectedMemberId}
            onExternalAddressChange={setExternalAddress}
            onNoteChange={setNote}
            onContinue={handleContinue}
            onClose={handleClose}
            isValidForm={isValidForm()}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            usdcAmount={usdcAmount}
            ngnAmount={ngnAmount}
            recipientLabel={getRecipientLabel()}
            recipientAddress={getRecipientAddress()}
            note={note}
            onBack={() => setStep("form")}
            onConfirm={handleSend}
          />
        )}

        {step === "sending" && <SendingStep />}

        {step === "success" && transaction && (
          <SuccessStep
            transaction={transaction}
            recipientLabel={getRecipientLabel()}
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
  currentBalance,
  amount,
  inputMode,
  usdcAmount,
  ngnAmount,
  recipientType,
  selectedMemberId,
  externalAddress,
  note,
  otherMembers,
  onAmountChange,
  onInputModeChange,
  onRecipientTypeChange,
  onMemberSelect,
  onExternalAddressChange,
  onNoteChange,
  onContinue,
  onClose,
  isValidForm,
}: {
  currentBalance: number;
  amount: string;
  inputMode: "usdc" | "ngn";
  usdcAmount: number;
  ngnAmount: number;
  recipientType: "member" | "external";
  selectedMemberId: string;
  externalAddress: string;
  note: string;
  otherMembers: GroupMember[];
  onAmountChange: (value: string) => void;
  onInputModeChange: (mode: "usdc" | "ngn") => void;
  onRecipientTypeChange: (type: "member" | "external") => void;
  onMemberSelect: (id: string) => void;
  onExternalAddressChange: (addr: string) => void;
  onNoteChange: (note: string) => void;
  onContinue: () => void;
  onClose: () => void;
  isValidForm: boolean;
}) {
  const insufficientFunds = usdcAmount > currentBalance;

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Send Money</h2>
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
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => onInputModeChange("ngn")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  inputMode === "ngn"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ₦ NGN
              </button>
              <button
                onClick={() => onInputModeChange("usdc")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  inputMode === "usdc"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                $ USDC
              </button>
            </div>
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-gray-400">
              {inputMode === "ngn" ? "₦" : "$"}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-xl border-2 py-4 pl-12 pr-4 text-2xl font-semibold transition-colors ${
                insufficientFunds
                  ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500"
                  : "border-gray-200 text-gray-900 focus:border-primary-500"
              } focus:outline-none`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {inputMode === "ngn" ? (
                <>≈ ${usdcAmount.toFixed(2)} USDC</>
              ) : (
                <>≈ {formatNgn(ngnAmount)}</>
              )}
            </span>
            <span className={insufficientFunds ? "text-red-600" : "text-gray-500"}>
              Balance: ${currentBalance.toFixed(2)}
            </span>
          </div>

          {insufficientFunds && (
            <p className="mt-1 text-sm text-red-600">Insufficient funds</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Send to</label>
          
          <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => onRecipientTypeChange("member")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                recipientType === "member"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Group Member
            </button>
            <button
              onClick={() => onRecipientTypeChange("external")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                recipientType === "external"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              External Wallet
            </button>
          </div>

          {recipientType === "member" ? (
            <div className="space-y-2">
              {otherMembers.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                  No other members in this group yet
                </p>
              ) : (
                otherMembers.map((member) => (
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
                      {(member.displayName?.[0] || member.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">
                        {member.displayName || member.email || `${member.walletAddress.slice(0, 8)}...`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.walletAddress.slice(0, 10)}...{member.walletAddress.slice(-6)}
                      </p>
                    </div>
                    {selectedMemberId === member.id && (
                      <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <input
              type="text"
              value={externalAddress}
              onChange={(e) => onExternalAddressChange(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm font-mono focus:border-primary-500 focus:outline-none"
            />
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="What's this for?"
            maxLength={100}
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onContinue}
          disabled={!isValidForm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>

        <p className="text-center text-xs text-gray-400">
          USDC on Monad Testnet · Mock transaction (no real funds)
        </p>
      </div>
    </>
  );
}

function ConfirmStep({
  usdcAmount,
  ngnAmount,
  recipientLabel,
  recipientAddress,
  note,
  onBack,
  onConfirm,
}: {
  usdcAmount: number;
  ngnAmount: number;
  recipientLabel: string;
  recipientAddress: string;
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
        <h2 className="text-lg font-semibold text-gray-900">Confirm Send</h2>
      </div>

      <div className="p-4">
        <div className="mb-6 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-center text-white">
          <p className="text-sm font-medium text-primary-100">You&apos;re sending</p>
          <p className="mt-2 text-4xl font-bold">{formatNgn(ngnAmount)}</p>
          <p className="mt-1 text-sm text-primary-200">≈ ${usdcAmount.toFixed(2)} USDC</p>
        </div>

        <div className="mb-6 space-y-4 rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">To</span>
            <span className="text-sm font-medium text-gray-900">{recipientLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Address</span>
            <span className="font-mono text-xs text-gray-500">
              {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
            </span>
          </div>
          {note && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Note</span>
              <span className="text-sm text-gray-900">{note}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-4">
            <span className="text-sm text-gray-600">Network</span>
            <span className="text-sm font-medium text-gray-900">Monad Testnet</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Fee</span>
            <span className="text-sm text-primary-600">Free (mock)</span>
          </div>
        </div>

        <button
          onClick={onConfirm}
          className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Send {formatNgn(ngnAmount)}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">
          Mock transaction · No real funds will be transferred
        </p>
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
        Processing your transaction on Monad Testnet
      </p>
    </div>
  );
}

function SuccessStep({
  transaction,
  recipientLabel,
  onClose,
}: {
  transaction: Transaction;
  recipientLabel: string;
  onClose: () => void;
}) {
  const explorerUrl = getExplorerTxUrl(transaction.txHash);

  return (
    <div className="p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Money Sent!</h3>
        <p className="mt-1 text-sm text-gray-500">
          Successfully sent to {recipientLabel}
        </p>
      </div>

      <div className="mb-6 rounded-xl bg-gradient-to-br from-primary-50 to-green-50 p-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Amount sent</p>
          <p className="text-2xl font-bold text-gray-900">{formatNgn(parseFloat(transaction.amountNgn))}</p>
          <p className="text-sm text-gray-500">≈ ${parseFloat(transaction.amountUsdc).toFixed(2)} USDC</p>
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-lg bg-gray-50 p-4">
        <div>
          <p className="text-xs text-gray-500">Transaction Hash</p>
          <p className="font-mono text-xs text-gray-900 break-all">{transaction.txHash}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status</span>
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Confirmed (Mock)
          </span>
        </div>
      </div>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        View on Explorer
      </a>

      <button
        onClick={onClose}
        className="w-full rounded-xl bg-primary-600 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-700"
      >
        Done
      </button>

      <p className="mt-3 text-center text-xs text-gray-400">
        Mock transaction · Transaction hash is simulated
      </p>
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
      <h3 className="text-lg font-semibold text-gray-900">Transaction Failed</h3>
      <p className="mt-2 text-sm text-gray-500">{error}</p>

      <div className="mt-6 space-y-3">
        <button
          onClick={onRetry}
          className="w-full rounded-lg bg-primary-600 py-3 text-sm font-medium text-white hover:bg-primary-700"
        >
          Try Again
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
