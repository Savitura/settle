"use client";

import { useState, useEffect } from "react";

import { Group, MoneyRequest } from "@/lib/types";
import { cancelMoneyRequest, createMoneyRequest, editMoneyRequest } from "@/lib/db";
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
  /** An unpaid request you made. With mode "edit" or "cancel" the sheet changes it instead of creating a new one. */
  editRequest?: MoneyRequest | null;
  mode?: "create" | "edit" | "cancel";
}

type RequestStep = "form" | "confirm" | "cancel" | "success" | "error";
type RequestOutcome = "created" | "updated" | "cancelled";

const NOTE_IDEAS = ["Market money", "Rent", "School fees", "Light bill", "Fuel"];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function RequestMoneyModal({
  isOpen,
  onClose,
  group,
  currentUserWallet,
  onSuccess,
  editRequest = null,
  mode = "create",
}: RequestMoneyModalProps) {
  const rate = getNgnRate();
  const [step, setStep] = useState<RequestStep>("form");
  const [amount, setAmount] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [note, setNote] = useState("");
  const [request, setRequest] = useState<MoneyRequest | null>(null);
  const [outcome, setOutcome] = useState<RequestOutcome>("created");
  const [lastAction, setLastAction] = useState<"save" | "cancel">("save");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const editing = !!editRequest && mode !== "create";

  const otherMembers = group.members.filter(
    (m) => m.walletAddress.toLowerCase() !== currentUserWallet.toLowerCase()
  );

  const ngnAmount = parseFloat(amount) || 0;
  const usdcAmount = ngnAmount / rate;
  const selectedMember = otherMembers.find((m) => m.id === selectedMemberId);
  const recipientName = selectedMember ? memberName(selectedMember) : "them";

  // The person the request was originally for (may differ from the current pick while editing)
  const originalMember = editRequest
    ? group.members.find((m) => same(m.walletAddress, editRequest.toAddress))
    : undefined;
  const originalName = originalMember ? memberName(originalMember) : "them";
  const recipientChanged =
    editing && !!editRequest && !!selectedMember && !same(selectedMember.walletAddress, editRequest.toAddress);
  const unchanged =
    editing &&
    !!editRequest &&
    amount === editRequest.amountNgn &&
    note.trim() === (editRequest.note ?? "").trim() &&
    !!selectedMember &&
    same(selectedMember.walletAddress, editRequest.toAddress);
  const isValidForm = ngnAmount > 0 && !!selectedMemberId && !unchanged;

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
    setLastAction("save");
    try {
      if (editing && editRequest) {
        const updated = await editMoneyRequest({
          requestId: editRequest.id,
          toAddress: recipientAddress,
          amountNgn: ngnAmount.toFixed(0),
          note: note.trim(),
        });
        setRequest(updated);
        setOutcome("updated");
      } else {
        const newRequest = await createMoneyRequest({
          groupId: group.id,
          fromAddress: currentUserWallet,
          toAddress: recipientAddress,
          amountUsdc: usdcAmount.toFixed(6),
          amountNgn: ngnAmount.toFixed(0),
          note: note || undefined,
        });
        setRequest(newRequest);
        setOutcome("created");
      }

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!editRequest) return;
    setSubmitting(true);
    setLastAction("cancel");
    try {
      const updated = await cancelMoneyRequest(editRequest.id);
      if (updated) setRequest(updated);
      setOutcome("cancelled");
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    const target = editRequest && mode !== "create" ? editRequest : null;
    setStep(target && mode === "cancel" ? "cancel" : "form");
    setAmount(target ? target.amountNgn : "");
    setSelectedMemberId(
      target ? otherMembers.find((m) => same(m.walletAddress, target.toAddress))?.id ?? "" : ""
    );
    setNote(target?.note ?? "");
    setRequest(null);
    setOutcome("created");
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

  let continueLabel = "Continue";
  if (unchanged) continueLabel = "No changes yet";
  else if (ngnAmount > 0 && selectedMember) continueLabel = `Continue · ask ${recipientName} for ${formatNgn(ngnAmount)}`;

  return (
    <Sheet isOpen={isOpen} onClose={handleClose} label={editing ? "Change request" : "Request money"}>
      {step === "form" && (
        <StepPanel stepKey="form">
          <SheetHeader title={editing ? "Change request" : "Request money"} onClose={handleClose} step={1} totalSteps={2} />
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

            <div className="space-y-3">
              <button type="button" onClick={handleContinue} disabled={!isValidForm} className="btn-coral">
                {continueLabel}
              </button>
              {editing && (
                <button type="button" onClick={() => setStep("cancel")} className="btn-ghost">
                  Cancel this request
                </button>
              )}
            </div>
          </div>
        </StepPanel>
      )}

      {step === "confirm" && (
        <StepPanel stepKey="confirm">
          <SheetHeader
            title={editing ? "Check your changes" : "Check your request"}
            onBack={() => setStep("form")}
            step={2}
            totalSteps={2}
          />
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
              {note.trim() && (
                <p className="relative mx-auto mt-3 w-fit rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                  {note.trim()}
                </p>
              )}
            </div>

            <button type="button" onClick={handleRequest} disabled={submitting} className="btn-coral mt-5">
              {editing
                ? submitting
                  ? "Saving changes…"
                  : "Save changes"
                : submitting
                  ? "Sending request…"
                  : `Send request to ${recipientName}`}
            </button>
            <p className="mt-3 text-center text-sm text-ink-muted">
              {editing
                ? recipientChanged
                  ? `${originalName} won't be asked anymore. ${recipientName} will see it in the wallet.`
                  : `${recipientName} will see the updated request straight away.`
                : `${recipientName} will see it in the wallet and can pay in one tap.`}
            </p>
          </div>
        </StepPanel>
      )}

      {step === "cancel" && editRequest && (
        <StepPanel stepKey="cancel">
          <SheetHeader
            title="Cancel this request?"
            onClose={mode === "cancel" ? handleClose : undefined}
            onBack={mode === "cancel" ? undefined : () => setStep("form")}
          />
          <div className="px-5 pb-5 pt-3">
            <div className="rounded-3xl bg-cream p-6 text-center">
              <div className="mx-auto w-fit">
                <Avatar name={originalName} seed={editRequest.toAddress} size="lg" />
              </div>
              <p className="mt-4 text-sm font-medium text-ink-muted">You asked {originalName} for</p>
              <p className="tabular mt-1 font-display text-4xl font-extrabold tracking-tight text-ink">
                {formatNgn(parseFloat(editRequest.amountNgn))}
              </p>
              {editRequest.note && (
                <p className="mx-auto mt-3 w-fit rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink-soft">
                  {editRequest.note}
                </p>
              )}
            </div>
            <p className="mt-4 text-center text-sm text-ink-muted">
              {originalName} won&apos;t need to pay this anymore. You can always ask again later.
            </p>
            <div className="mt-5 space-y-3">
              <button type="button" onClick={handleCancelRequest} disabled={submitting} className="btn-coral">
                {submitting ? "Cancelling…" : "Yes, cancel request"}
              </button>
              <button
                type="button"
                onClick={mode === "cancel" ? handleClose : () => setStep("form")}
                disabled={submitting}
                className="btn-ghost"
              >
                Keep it
              </button>
            </div>
          </div>
        </StepPanel>
      )}

      {step === "success" && (request || outcome === "cancelled") && (
        <StepPanel stepKey="success">
          <SuccessView
            title={outcome === "cancelled" ? "Request cancelled" : outcome === "updated" ? "Request updated" : "Request sent"}
            tone="coral"
            celebrate={false}
            actions={
              <button type="button" onClick={handleClose} className="btn-coral">
                Back to {group.name}
              </button>
            }
          >
            {outcome === "cancelled" && editRequest ? (
              <>
                {originalName} won&apos;t be asked for{" "}
                <span className="tabular font-bold text-ink">{formatNgn(parseFloat(editRequest.amountNgn))}</span> anymore.
              </>
            ) : (
              <>
                {outcome === "updated" ? "You're now asking" : "You asked"} {recipientName} for{" "}
                <span className="tabular font-bold text-ink">{formatNgn(ngnAmount)}</span>
                {note.trim() ? ` for ${note.trim().toLowerCase()}` : ""}.
              </>
            )}
          </SuccessView>
        </StepPanel>
      )}

      {step === "error" && (
        <StepPanel stepKey="error">
          <ErrorView
            message={error}
            onRetry={() => setStep(lastAction === "cancel" ? "cancel" : "confirm")}
            onClose={handleClose}
          />
        </StepPanel>
      )}
    </Sheet>
  );
}
