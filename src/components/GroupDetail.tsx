"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  seedMockBalances,
  getTransactionsByGroup,
  getRequestsByGroup,
  getPendingRequestsForWallet,
  manageGroup,
} from "@/lib/db";
import { Group, Transaction, MoneyRequest } from "@/lib/types";
import { formatNgn, usdcToNgn } from "@/lib/currency";
import { InviteModal } from "./InviteModal";
import { SendMoneyModal } from "./SendMoneyModal";
import { RequestMoneyModal } from "./RequestMoneyModal";
import { SettleRequestModal } from "./SettleRequestModal";
import { Avatar, memberContact, memberName } from "./ui/Avatar";
import { IconButton } from "./ui/Sheet";
import { useCountUp } from "./ui/Status";
import { BackIcon, InviteIcon, RequestIcon, SendIcon, SettleIcon, SparkIcon } from "./ui/Icons";

export type GroupAction = "send" | "request" | "settle" | "invite";

interface GroupDetailProps {
  group: Group;
  onBack: () => void;
  onRefresh: () => void;
  currentUserWallet: string;
  /** Open a flow straight away (e.g. from Home quick actions). */
  initialAction?: GroupAction | null;
  onActionHandled?: () => void;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function GroupDetail({
  group,
  onBack,
  onRefresh,
  currentUserWallet,
  initialAction,
  onActionHandled,
}: GroupDetailProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MoneyRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [highlightPending, setHighlightPending] = useState(false);
  const [managementMessage, setManagementMessage] = useState("");
  const [managing, setManaging] = useState(false);
  const pendingRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [txs, reqs, pending] = await Promise.all([
        getTransactionsByGroup(group.id),
        getRequestsByGroup(group.id),
        getPendingRequestsForWallet(group.id, currentUserWallet),
      ]);
      setTransactions(txs);
      setRequests(reqs);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Failed to load group data:", error);
    } finally {
      setLoaded(true);
    }
  }, [group.id, currentUserWallet]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCreator = same(group.createdBy, currentUserWallet);
  const currentMember = group.members.find((m) => same(m.walletAddress, currentUserWallet));
  const currentBalance = parseFloat(currentMember?.balance.usdc || "0");
  const groupTotal = parseFloat(group.totalBalance.usdc);
  const canSend = currentBalance > 0;
  const hasOtherMembers = group.members.length > 1;
  const canInvite = group.members.length < 3;
  const outboundOpen = requests.filter(
    (r) => r.status === "pending" && same(r.fromAddress, currentUserWallet)
  );
  const allEven = loaded && pendingRequests.length === 0 && outboundOpen.length === 0 && hasOtherMembers;

  const myBalanceNgn = useCountUp(usdcToNgn(currentBalance));
  const groupTotalNgn = useCountUp(usdcToNgn(groupTotal));

  const openSettle = useCallback(() => {
    if (pendingRequests.length === 1) {
      setSelectedRequest(pendingRequests[0]);
    } else if (pendingRequests.length > 1) {
      pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightPending(true);
      setTimeout(() => setHighlightPending(false), 1200);
    }
  }, [pendingRequests]);

  // Run a quick action handed over from the Home screen once data is ready
  useEffect(() => {
    if (!initialAction || !loaded) return;
    if (initialAction === "send" && canSend && hasOtherMembers) setShowSendMoney(true);
    if (initialAction === "request" && hasOtherMembers) setShowRequestMoney(true);
    if (initialAction === "settle") openSettle();
    if (initialAction === "invite" && canInvite) setShowInvite(true);
    onActionHandled?.();
  }, [initialAction, loaded, canSend, hasOtherMembers, canInvite, openSettle, onActionHandled]);

  const handleSeedBalances = async () => {
    await seedMockBalances(group.id);
    onRefresh();
  };

  const refreshAll = async () => {
    onRefresh();
    await loadData();
  };

  const handleSettleSuccess = async () => {
    await refreshAll();
    setSelectedRequest(null);
  };

  const runGroupAction = async (action: "rotate_invite" | "remove_member" | "leave", memberId?: string) => {
    setManaging(true);
    setManagementMessage("");
    try {
      const result = await manageGroup({ action, groupId: group.id, memberId });
      if (action === "rotate_invite") setManagementMessage(`New invite code: ${result.inviteCode}`);
      else if (action === "leave") { onBack(); return; }
      else setManagementMessage("Member removed");
      await onRefresh();
    } catch (error) {
      setManagementMessage(error instanceof Error ? error.message : "Group action failed");
    } finally {
      setManaging(false);
    }
  };

  const nameFor = (address: string) =>
    memberName(group.members.find((m) => same(m.walletAddress, address)));

  const actions: Array<{
    key: GroupAction;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
    style: string;
    badge?: number;
  }> = [
    {
      key: "send",
      label: "Send",
      icon: <SendIcon size={24} />,
      onClick: () => setShowSendMoney(true),
      disabled: !canSend || !hasOtherMembers,
      style: "from-primary-400 to-primary-600 shadow-glow",
    },
    {
      key: "request",
      label: "Request",
      icon: <RequestIcon size={24} />,
      onClick: () => setShowRequestMoney(true),
      disabled: !hasOtherMembers,
      style: "from-coral-300 to-coral-500 shadow-glow-coral",
    },
    {
      key: "settle",
      label: "Settle up",
      icon: <SettleIcon size={24} />,
      onClick: openSettle,
      disabled: pendingRequests.length === 0,
      style: "from-sun-300 to-sun-500 shadow-[0_18px_40px_-16px_rgba(249,168,6,0.6)]",
      badge: pendingRequests.length,
    },
    {
      key: "invite",
      label: "Invite",
      icon: <InviteIcon size={24} />,
      onClick: () => setShowInvite(true),
      disabled: !canInvite,
      style: "from-fuchsia-400 to-fuchsia-600 shadow-[0_18px_40px_-16px_rgba(192,38,211,0.5)]",
    },
  ];

  let helper: string | null = null;
  if (!hasOtherMembers) helper = "Invite family to start sending and requesting";
  else if (!canSend) helper = "Add demo balance below to start sending";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <IconButton label="Back to wallets" onClick={onBack} className="bg-white shadow-card">
          <BackIcon />
        </IconButton>
        <h2 className="flex-1 truncate font-display text-2xl font-bold text-ink">{group.name}</h2>
      </div>

      {/* Hero balance */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-500 via-primary-600 to-primary-900 p-6 text-white shadow-glow">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-float rounded-full bg-sun-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 animate-float rounded-full bg-coral-400/30 blur-3xl [animation-delay:-4s]" />
        <div className="relative">
          <p className="text-sm font-semibold text-primary-100">Your balance</p>
          <p className="tabular mt-1 font-display text-[44px] font-extrabold leading-none tracking-tight">
            {formatNgn(myBalanceNgn)}
          </p>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-primary-100">Whole wallet</p>
              <p className="tabular font-display text-lg font-bold">{formatNgn(groupTotalNgn)}</p>
            </div>
            <div className="flex -space-x-2.5">
              {group.members.map((m, i) => (
                <div key={m.id} style={{ zIndex: 10 - i }}>
                  <Avatar name={memberName(m)} seed={m.walletAddress} size="sm" ring />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section aria-label="Quick actions">
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a, i) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              style={{ animationDelay: `${80 + i * 60}ms` }}
              className="focus-ring group flex animate-rise-in flex-col items-center gap-2 rounded-2xl py-1 disabled:cursor-not-allowed"
            >
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br text-white transition-all group-hover:-translate-y-0.5 group-active:scale-90 group-disabled:translate-y-0 group-disabled:scale-100 group-disabled:from-gray-200 group-disabled:to-gray-200 group-disabled:text-gray-500 group-disabled:shadow-none ${a.style}`}
              >
                {a.icon}
                {!!a.badge && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 animate-pop items-center justify-center rounded-full border-2 border-cream bg-coral-500 px-1.5 text-xs font-bold text-white">
                    {a.badge}
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold text-ink-soft group-disabled:text-ink-muted">{a.label}</span>
            </button>
          ))}
        </div>
        {helper && <p className="mt-3 text-center text-sm font-medium text-ink-muted">{helper}</p>}
      </section>

      {/* Waiting on you */}
      {pendingRequests.length > 0 && (
        <section
          ref={pendingRef}
          className={`animate-rise-in rounded-[28px] bg-gradient-to-br from-coral-50 to-sun-100 p-5 ring-1 ring-coral-200 transition-shadow ${
            highlightPending ? "ring-4 ring-coral-400" : ""
          }`}
        >
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-coral-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral-500" />
            </span>
            Waiting on you
          </h3>
          <div className="mt-3 space-y-2.5">
            {pendingRequests.map((req) => {
              const name = nameFor(req.fromAddress);
              return (
                <button
                  type="button"
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="focus-ring flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card transition-all hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <Avatar name={name} seed={req.fromAddress} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {name} asked for <span className="tabular">{formatNgn(parseFloat(req.amountNgn))}</span>
                    </p>
                    {req.note && <p className="truncate text-xs text-ink-muted">{req.note}</p>}
                  </div>
                  <span className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-bold text-white">
                    Pay
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {allEven && (
        <div className="flex animate-rise-in items-center gap-3 rounded-[28px] bg-primary-50 p-4 ring-1 ring-primary-200">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white">
            <SettleIcon size={20} />
          </span>
          <div>
            <p className="font-display font-bold text-primary-900">You&apos;re all even</p>
            <p className="text-sm text-primary-800">Nobody owes anybody in this wallet</p>
          </div>
        </div>
      )}

      {/* Demo balance */}
      {isCreator && groupTotal === 0 && (
        <section className="relative overflow-hidden rounded-[28px] border-2 border-dashed border-sun-400 bg-sun-100/60 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sun-300 to-sun-500 text-ink">
              <SparkIcon size={20} />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg font-bold text-ink">Try it with demo money</p>
              <p className="mt-0.5 text-sm text-ink-soft">Top up everyone in this wallet so you can send and settle.</p>
            </div>
          </div>
          <button type="button" onClick={handleSeedBalances} className="btn-primary mt-4">
            Add demo balance
          </button>
        </section>
      )}

      {/* Members */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Family</h3>
          {canInvite && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="focus-ring rounded-full bg-fuchsia-50 px-3.5 py-1.5 text-sm font-semibold text-fuchsia-700 transition-colors hover:bg-fuchsia-100"
            >
              + Invite
            </button>
          )}
        </div>
        <ul className="divide-y divide-ink/5">
          {group.members.map((member) => {
            const isMe = same(member.walletAddress, currentUserWallet);
            const name = memberName(member);
            const contact = memberContact(member);
            return (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar name={name} seed={member.walletAddress} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-800">
                        You
                      </span>
                    )}
                  </p>
                  {contact && <p className="truncate text-xs text-ink-muted">{contact}</p>}
                </div>
                <p className="tabular font-display font-bold text-ink">
                  {formatNgn(usdcToNgn(parseFloat(member.balance.usdc)))}
                </p>
                {isCreator && !isMe && parseFloat(member.balance.usdc) === 0 && (
                  <button type="button" disabled={managing} onClick={() => runGroupAction("remove_member", member.id)} className="text-xs font-bold text-coral-700 disabled:opacity-50">
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {canInvite && (
          <p className="mt-2 text-center text-sm text-ink-muted">
            {3 - group.members.length} spot{3 - group.members.length !== 1 ? "s" : ""} left
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
          {isCreator ? (
            <button type="button" disabled={managing} onClick={() => runGroupAction("rotate_invite")} className="rounded-full border border-ink/15 px-3 py-2 text-xs font-bold text-ink-soft disabled:opacity-50">
              Replace invite code
            </button>
          ) : (
            <button type="button" disabled={managing || currentBalance !== 0} onClick={() => runGroupAction("leave")} className="rounded-full border border-coral-200 px-3 py-2 text-xs font-bold text-coral-700 disabled:opacity-50">
              Leave wallet
            </button>
          )}
          {managementMessage && <p className="w-full text-xs text-ink-muted" role="status">{managementMessage}</p>}
        </div>
      </section>

      <ActivityFeed
        transactions={transactions}
        requests={requests}
        nameFor={nameFor}
        currentUserWallet={currentUserWallet}
      />

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        inviteCode={group.inviteCode}
        groupName={group.name}
      />

      <SendMoneyModal
        isOpen={showSendMoney}
        onClose={() => setShowSendMoney(false)}
        group={group}
        currentUserWallet={currentUserWallet}
        onSuccess={refreshAll}
      />

      <RequestMoneyModal
        isOpen={showRequestMoney}
        onClose={() => setShowRequestMoney(false)}
        group={group}
        currentUserWallet={currentUserWallet}
        onSuccess={loadData}
      />

      {selectedRequest && (
        <SettleRequestModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          group={group}
          currentUserWallet={currentUserWallet}
          onSuccess={handleSettleSuccess}
        />
      )}
    </div>
  );
}

export interface ActivityItem {
  id: string;
  kind: "out" | "in" | "request";
  label: string;
  amount: string;
  note?: string;
  status?: string;
  createdAt: string;
  otherAddress: string;
  otherName: string;
}

export function buildActivity(
  transactions: Transaction[],
  requests: MoneyRequest[],
  nameFor: (address: string) => string,
  currentUserWallet: string
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const tx of transactions) {
    const isSender = same(tx.fromAddress, currentUserWallet);
    const otherAddress = isSender ? tx.toAddress : tx.fromAddress;
    const otherName = nameFor(otherAddress);
    let kind: ActivityItem["kind"] = isSender ? "out" : "in";
    let label = isSender ? `Sent to ${otherName}` : `From ${otherName}`;
    if (tx.type === "settle") label = isSender ? `Paid ${otherName}` : `${otherName} paid you`;
    if (tx.type === "request") {
      kind = "request";
      label = isSender ? `Asked ${otherName}` : `${otherName} asked you`;
    }
    items.push({
      id: tx.id,
      kind,
      label,
      amount: tx.amountNgn,
      note: tx.note,
      createdAt: tx.createdAt,
      otherAddress,
      otherName,
    });
  }

  for (const req of requests) {
    if (req.status === "paid") continue;
    const isRequester = same(req.fromAddress, currentUserWallet);
    const otherAddress = isRequester ? req.toAddress : req.fromAddress;
    const otherName = nameFor(otherAddress);
    items.push({
      id: `req-${req.id}`,
      kind: "request",
      label: isRequester ? `Asked ${otherName}` : `${otherName} asked you`,
      amount: req.amountNgn,
      note: req.note,
      status: req.status,
      createdAt: req.createdAt,
      otherAddress,
      otherName,
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function ActivityList({ items, limit = 10 }: { items: ActivityItem[]; limit?: number }) {
  return (
    <ul className="space-y-1">
      {items.slice(0, limit).map((a, i) => {
        const tone =
          a.kind === "in"
            ? { text: "text-primary-700", chip: "bg-primary-100 text-primary-700", sign: "+", icon: <RequestIcon size={14} /> }
            : a.kind === "out"
              ? { text: "text-ink", chip: "bg-ink/5 text-ink-soft", sign: "−", icon: <SendIcon size={14} /> }
              : { text: "text-coral-700", chip: "bg-coral-100 text-coral-700", sign: "", icon: <SparkIcon size={14} /> };
        return (
          <li
            key={a.id}
            style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
            className="flex animate-rise-in items-center gap-3 rounded-2xl px-1 py-2.5"
          >
            <div className="relative">
              <Avatar name={a.otherName} seed={a.otherAddress} />
              <span
                className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${tone.chip}`}
              >
                {tone.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{a.label}</p>
              <p className="truncate text-xs text-ink-muted">
                {new Date(a.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                {a.note && ` · ${a.note}`}
              </p>
            </div>
            <div className="text-right">
              <p className={`tabular font-display font-bold ${tone.text}`}>
                {tone.sign}
                {formatNgn(parseFloat(a.amount))}
              </p>
              {a.status && STATUS_LABEL[a.status] && (
                <p className="text-xs font-semibold text-ink-muted">{STATUS_LABEL[a.status]}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ActivityFeed({
  transactions,
  requests,
  nameFor,
  currentUserWallet,
}: {
  transactions: Transaction[];
  requests: MoneyRequest[];
  nameFor: (address: string) => string;
  currentUserWallet: string;
}) {
  const items = buildActivity(transactions, requests, nameFor, currentUserWallet);
  if (items.length === 0) return null;

  return (
    <section className="card">
      <h3 className="mb-2 font-display text-lg font-bold text-ink">Activity</h3>
      <ActivityList items={items} />
      {items.length > 10 && (
        <p className="mt-2 text-center text-sm text-ink-muted">Showing latest 10 of {items.length}</p>
      )}
    </section>
  );
}
