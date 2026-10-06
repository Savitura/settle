"use client";

import { useState, useEffect } from "react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

import { Group, Transaction } from "@/lib/types";
import { transferMoney } from "@/lib/db";
import { formatNgn, getNgnRate } from "@/lib/currency";
import { Sheet, SheetHeader, StepPanel } from "./ui/Sheet";
import { AmountInput } from "./ui/AmountInput";
import { MemberPicker } from "./ui/MemberPicker";
import { Avatar, memberName } from "./ui/Avatar";
import { ProcessingView, SuccessView, ErrorView } from "./ui/Status";
import { BoltIcon } from "./ui/Icons";
import { monadTestnet } from "@/lib/monad";

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type SendStep = "form" | "confirm" | "submitting" | "confirming" | "success" | "error";

export function SendMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
}: SendMoneyModalProps) {
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const rate = getNgnRate();
  const [step, setStep] = useState<SendStep>("form");
  const [amount, setAmount] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [showCashOut, setShowCashOut] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );
  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const currentBalanceUsdc = parseFloat(currentMember?.balance.usdc || "0");
  const currentBalanceNgn = currentBalanceUsdc * rate;
  const ngnAmount = parseFloat(amount) || 0;
  const usdcAmount = ngnAmount / rate;
  const selectedMember = otherMembers.find((m) => m.id === selectedMemberId);
  const recipientName = selectedMember ? memberName(selectedMember) : "them";
  const myName = memberName(currentMember);

  const overBalance = ngnAmount > 0 && usdcAmount > currentBalanceUsdc;
  const isValidForm = ngnAmount > 0 && !overBalance && !!selectedMemberId;

  const handleContinue = () => {
    if (!selectedMemberId) {
      setError("Pick who you're sending to");
      return;
    }
    if (!isValidForm) return;
    setError("");
    setStep("confirm");
  };

  const handleSend = async () => {
    setStep(pendingTxHash ? "confirming" : "submitting");
    setError("");

    try {
      const recipientAddress = selectedMember?.walletAddress || "";
      let txHash: `0x${string}` | undefined = pendingTxHash || undefined;
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== "true") {
        const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
        const wallet = wallets.find((candidate) => candidate.address.toLowerCase() === currentUserWallet.toLowerCase());
        if (!wallet || !tokenAddress || /^0x0{40}$/i.test(tokenAddress)) {
          throw new Error("Payments aren't available right now. Please try again a little later.");
        }
        if (!txHash) {
          await wallet.switchChain(monadTestnet.id);
          const result = await sendTransaction({
            to: tokenAddress,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [recipientAddress as `0x${string}`, parseUnits(usdcAmount.toFixed(6), 6)],
            }),
            chainId: monadTestnet.id,
          }, {
            address: currentUserWallet,
            sponsor: process.env.NEXT_PUBLIC_SPONSOR_GAS === "true",
          });
          txHash = result.hash;
          setPendingTxHash(txHash);
          setPaymentSubmitted(true);
        }
        setStep("confirming");
      }
      const newTx = await transferMoney({
        groupId: group.id,
        toAddress: recipientAddress,
        amountNgn: ngnAmount.toFixed(0),
        txHash,
      });

      setTransaction(newTx);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("form");
    setAmount("");
    setSelectedMemberId("");
    setTransaction(null);
    setError("");
    setShowCashOut(false);
    setPendingTxHash(null);
    setPaymentSubmitted(false);
  };

  const handleClose = () => {
    if (step === "success") onSuccess();
    reset();
    onClose();
  };

  const sendAnother = () => {
    onSuccess();
    reset();
  };

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen]);

  // Auto-select when there's only one person to send to
  useEffect(() => {
    if (isOpen && otherMembers.length === 1 && !selectedMemberId) {
      setSelectedMemberId(otherMembers[0].id);
    }
  }, [isOpen, otherMembers, selectedMemberId]);

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} label="Send money" locked={step === "submitting" || step === "confirming"}>
      {step === "form" && (
        <StepPanel stepKey="form">
          <SheetHeader title="Send money" onClose={handleClose} step={1} totalSteps={2} />
          <div className="space-y-6 px-5 pb-5 pt-3">
            <AmountInput
              label="How much?"
              value={amount}
              onChange={setAmount}
              error={overBalance ? `You only have ${formatNgn(currentBalanceNgn)} available` : null}
              hint={
                <>
                  Available <span className="tabular font-semibold text-ink">{formatNgn(currentBalanceNgn)}</span>
                </>
              }
            />

            <MemberPicker
              label="Send to"
              members={otherMembers}
              selectedId={selectedMemberId}
              onSelect={(id) => {
                setSelectedMemberId(id);
                setError("");
              }}
              error={error}
            />

            {process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" && <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream p-4">
              <input
                type="checkbox"
                checked={showCashOut}
                onChange={(e) => setShowCashOut(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-ink/20 text-primary-600 accent-primary-600 focus:ring-primary-500"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Cash out to their bank (demo)</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  In the full product this lands in a bank account or mobile money. In the demo, it updates their balance.
                </span>
              </span>
            </label>}

            <button type="button" onClick={handleContinue} disabled={!isValidForm} className="btn-primary">
              {ngnAmount > 0 && selectedMember
                ? `Continue · ${formatNgn(ngnAmount)} to ${recipientName}`
                : "Continue"}
            </button>
          </div>
        </StepPanel>
      )}

      {step === "confirm" && (
        <StepPanel stepKey="confirm">
          <SheetHeader title="Check and send" onBack={() => setStep("form")} step={2} totalSteps={2} />
          <div className="px-5 pb-5 pt-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-6 text-center text-white shadow-glow">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sun-300/30 blur-2xl" />
              <div className="relative flex items-center justify-center gap-3">
                <Avatar name={myName} seed={currentUserWallet} size="md" ring />
                <div className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white [animation-delay:300ms]" />
                </div>
                <Avatar name={recipientName} seed={selectedMember?.walletAddress} size="md" ring />
              </div>
              <p className="relative mt-4 text-sm font-medium text-primary-100">You&apos;re sending</p>
              <p className="tabular relative mt-1 font-display text-5xl font-extrabold tracking-tight">
                {formatNgn(ngnAmount)}
              </p>
              <p className="relative mt-2 text-base font-semibold">to {recipientName}</p>
            </div>

            <dl className="mt-5 divide-y divide-ink/5 rounded-2xl bg-cream px-4">
              <Row label={`${recipientName} gets`} value={formatNgn(ngnAmount)} strong />
              <Row
                label="Network fee"
                value={process.env.NEXT_PUBLIC_SPONSOR_GAS === "true" ? "Covered by Settle" : "Small network fee"}
              />
              <Row label="Settlement" value={<span className="inline-flex items-center gap-1"><BoltIcon size={14} className="text-sun-500" /> After confirmation</span>} />
              {showCashOut && <Row label="Cash out" value="To bank (demo)" />}
              <Row label="Your balance after" value={formatNgn(currentBalanceNgn - ngnAmount)} />
            </dl>

            <button type="button" onClick={handleSend} className="btn-primary mt-5">
              {showCashOut ? `Send & cash out ${formatNgn(ngnAmount)}` : `Send ${formatNgn(ngnAmount)}`}
            </button>
          </div>
        </StepPanel>
      )}

      {(step === "submitting" || step === "confirming") && (
        <StepPanel stepKey={step}>
          <ProcessingView
            title={step === "submitting" ? "Preparing payment" : "Confirming payment"}
            subtitle={step === "submitting"
              ? `Authorizing ${formatNgn(ngnAmount)} to ${recipientName}…`
              : "Payment sent. Confirming can take a little longer when things are busy."}
            from={<Avatar name={myName} seed={currentUserWallet} size="lg" />}
            to={<Avatar name={recipientName} seed={selectedMember?.walletAddress} size="lg" />}
          />
        </StepPanel>
      )}

      {step === "success" && transaction && (
        <StepPanel stepKey="success">
          <SuccessView
            title="Sent!"
            actions={
              <>
                <button type="button" onClick={handleClose} className="btn-primary">
                  Back to {group.name}
                </button>
                <button type="button" onClick={sendAnother} className="btn-ghost">
                  Send more money
                </button>
              </>
            }
          >
            <span className="tabular font-bold text-ink">{formatNgn(ngnAmount)}</span> is with {recipientName}.
            <br />
            <span className="text-sm text-ink-muted">
              {showCashOut ? "Cash out started (demo)." : "Payment confirmed."}
            </span>
          </SuccessView>
        </StepPanel>
      )}

      {step === "error" && (
        <StepPanel stepKey="error">
          <ErrorView
            message={error}
            onRetry={paymentSubmitted ? handleSend : () => setStep("confirm")}
            onClose={handleClose}
            fundsMayHaveMoved={paymentSubmitted}
          />
        </StepPanel>
      )}
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tabular ${strong ? "font-bold text-ink" : "font-semibold text-ink-soft"}`}>{value}</dd>
    </div>
  );
}
