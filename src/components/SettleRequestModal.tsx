"use client";

import { useState, useEffect } from "react";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

import { Group, MoneyRequest, Transaction } from "@/lib/types";
import { getRequestById, updateRequestStatus, transferMoney } from "@/lib/db";
import { formatNgn, getNgnRate } from "@/lib/currency";
import { Sheet, SheetHeader, StepPanel } from "./ui/Sheet";
import { Avatar, memberName } from "./ui/Avatar";
import { ProcessingView, SuccessView, ErrorView } from "./ui/Status";
import { monadTestnet } from "@/lib/monad";

interface SettleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MoneyRequest;
  group: Group;
  currentUserWallet: string;
  onSuccess: () => void;
}

type SettleStep = "confirm" | "submitting" | "confirming" | "success" | "error";

export function SettleRequestModal({
  isOpen,
  onClose,
  request,
  group,
  currentUserWallet,
  onSuccess,
}: SettleRequestModalProps) {
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const rate = getNgnRate();
  const [step, setStep] = useState<SettleStep>("confirm");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const requester = group.members.find(
    (m) => m.walletAddress.toLowerCase() === request.fromAddress.toLowerCase()
  );
  const requesterName = requester ? memberName(requester) : "them";

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );
  const myName = memberName(currentMember);
  const currentBalanceUsdc = parseFloat(currentMember?.balance.usdc || "0");
  const currentBalanceNgn = currentBalanceUsdc * rate;

  const requestAmountUsdc = parseFloat(request.amountUsdc);
  const requestAmountNgn = parseFloat(request.amountNgn);
  const hasEnoughBalance = currentBalanceUsdc >= requestAmountUsdc;

  const handlePay = async () => {
    if (!hasEnoughBalance) {
      setError("Not enough balance to pay this request");
      setStep("error");
      return;
    }

    setStep(pendingTxHash ? "confirming" : "submitting");
    setError("");

    try {
      let txHash: `0x${string}` | undefined = pendingTxHash || undefined;
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== "true") {
        const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
        const wallet = wallets.find((candidate) => candidate.address.toLowerCase() === currentUserWallet.toLowerCase());
        if (!wallet || !tokenAddress || /^0x0{40}$/i.test(tokenAddress)) throw new Error("Payments aren't available right now. Please try again a little later.");
        if (!txHash) {
          // The requester can change or cancel a request while it's open, so check it's still the same before paying
          const latest = await getRequestById(request.id).catch(() => null);
          if (
            !latest ||
            latest.status !== "pending" ||
            latest.amountNgn !== request.amountNgn ||
            latest.toAddress.toLowerCase() !== currentUserWallet.toLowerCase()
          ) {
            throw new Error(`${requesterName} changed or cancelled this request. Close this and check the latest before paying.`);
          }
          await wallet.switchChain(monadTestnet.id);
          const result = await sendTransaction({
            to: tokenAddress,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [request.fromAddress as `0x${string}`, parseUnits(request.amountUsdc, 6)],
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
        toAddress: request.fromAddress,
        amountNgn: request.amountNgn,
        note: request.note,
        requestId: request.id,
        txHash,
      });

      setTransaction(newTx);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const handleDecline = async () => {
    await updateRequestStatus(request.id, "declined");
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    if (step === "success") onSuccess();
    setStep("confirm");
    setTransaction(null);
    setError("");
    setPendingTxHash(null);
    setPaymentSubmitted(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setTransaction(null);
      setError("");
      setPendingTxHash(null);
      setPaymentSubmitted(false);
    }
  }, [isOpen]);

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} label="Settle up" locked={step === "submitting" || step === "confirming"}>
      {step === "confirm" && (
        <StepPanel stepKey="confirm">
          <SheetHeader title="Settle up" onClose={handleClose} />
          <div className="px-5 pb-5 pt-3">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coral-400 via-coral-500 to-fuchsia-600 p-6 text-center text-white shadow-glow-coral">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-sun-300/40 blur-2xl" />
              <div className="relative mx-auto w-fit">
                <Avatar name={requesterName} seed={requester?.walletAddress} size="lg" ring />
              </div>
              <p className="relative mt-4 text-sm font-medium text-white/85">{requesterName} asked you for</p>
              <p className="tabular relative mt-1 font-display text-5xl font-extrabold tracking-tight">
                {formatNgn(requestAmountNgn)}
              </p>
              {request.note && (
                <p className="relative mx-auto mt-3 w-fit rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                  {request.note}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm">
              <span className="text-ink-muted">Your balance</span>
              <span className={`tabular font-bold ${hasEnoughBalance ? "text-ink" : "text-coral-700"}`}>
                {formatNgn(currentBalanceNgn)}
              </span>
            </div>

            {!hasEnoughBalance && (
              <p className="mt-3 text-center text-sm font-medium text-coral-700" role="alert">
                You need {formatNgn(requestAmountNgn - currentBalanceNgn)} more to pay this.
              </p>
            )}

            <div className="mt-5 space-y-3">
              <button type="button" onClick={handlePay} disabled={!hasEnoughBalance} className="btn-primary">
                Pay {requesterName} {formatNgn(requestAmountNgn)}
              </button>
              <button type="button" onClick={handleDecline} className="btn-ghost">
                Not now — decline
              </button>
            </div>
          </div>
        </StepPanel>
      )}

      {(step === "submitting" || step === "confirming") && (
        <StepPanel stepKey={step}>
          <ProcessingView
            title={step === "submitting" ? "Preparing payment" : "Confirming payment"}
            subtitle={step === "submitting"
              ? `Authorizing ${formatNgn(requestAmountNgn)} to ${requesterName}…`
              : "Payment sent. Confirming can take a little longer when things are busy."}
            from={<Avatar name={myName} seed={currentUserWallet} size="lg" />}
            to={<Avatar name={requesterName} seed={requester?.walletAddress} size="lg" />}
          />
        </StepPanel>
      )}

      {step === "success" && transaction && (
        <StepPanel stepKey="success">
          <SuccessView
            title="All settled!"
            actions={
              <button type="button" onClick={handleClose} className="btn-primary">
                Back to {group.name}
              </button>
            }
          >
            You paid {requesterName} <span className="tabular font-bold text-ink">{formatNgn(requestAmountNgn)}</span>
            {request.note ? ` for ${request.note.toLowerCase()}` : ""}.
          </SuccessView>
        </StepPanel>
      )}

      {step === "error" && (
        <StepPanel stepKey="error">
          <ErrorView
            message={error}
            onRetry={paymentSubmitted ? handlePay : () => setStep("confirm")}
            onClose={handleClose}
            fundsMayHaveMoved={paymentSubmitted}
          />
        </StepPanel>
      )}
    </Sheet>
  );
}
