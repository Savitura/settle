"use client";

import { useState } from "react";

import {
  seedMockBalances,
  getTransactionsByGroup,
  getRequestsByGroup,
  getPendingRequestsForWallet,
} from "@/lib/db";
import { Group, Transaction, MoneyRequest } from "@/lib/types";
import { formatNgn, usdcToNgn } from "@/lib/currency";
import { InviteModal } from "./InviteModal";
import { SendMoneyModal } from "./SendMoneyModal";
import { RequestMoneyModal } from "./RequestMoneyModal";
import { SettleRequestModal } from "./SettleRequestModal";

interface GroupDetailProps {
  group: Group;
  onBack: () => void;
  onRefresh: () => void;
  currentUserWallet: string;
}

export function GroupDetail({
  group,
  onBack,
  onRefresh,
  currentUserWallet,
}: GroupDetailProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showRequestMoney, setShowRequestMoney] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getTransactionsByGroup(group.id)
  );
  const [requests, setRequests] = useState<MoneyRequest[]>(() =>
    getRequestsByGroup(group.id)
  );
  const [pendingRequests, setPendingRequests] = useState<MoneyRequest[]>(() =>
    getPendingRequestsForWallet(group.id, currentUserWallet)
  );

  const isCreator =
    group.createdBy.toLowerCase() === currentUserWallet.toLowerCase();

  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );
  const currentBalance = parseFloat(currentMember?.balance.usdc || "0");
  const canSend = currentBalance > 0;

  const handleSeedBalances = () => {
    seedMockBalances(group.id);
    onRefresh();
  };

  const handleSendSuccess = () => {
    onRefresh();
    setTransactions(getTransactionsByGroup(group.id));
    setRequests(getRequestsByGroup(group.id));
    setPendingRequests(getPendingRequestsForWallet(group.id, currentUserWallet));
  };

  const handleRequestSuccess = () => {
    setRequests(getRequestsByGroup(group.id));
    setPendingRequests(getPendingRequestsForWallet(group.id, currentUserWallet));
  };

  const handleSettleSuccess = () => {
    onRefresh();
    setTransactions(getTransactionsByGroup(group.id));
    setRequests(getRequestsByGroup(group.id));
    setPendingRequests(getPendingRequestsForWallet(group.id, currentUserWallet));
    setSelectedRequest(null);
  };

  const hasOtherMembers = group.members.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-lg">
        <p className="text-sm font-medium text-primary-100">Group Balance</p>
        <p className="mt-1 text-3xl font-bold">
          {formatNgn(usdcToNgn(parseFloat(group.totalBalance.usdc)))}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs text-primary-200">
          <span>
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </span>
          <span className="rounded bg-primary-500/30 px-2 py-0.5">
            {parseFloat(group.totalBalance.usdc) === 0 ? "Demo balances available" : ""}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Members</h3>
          {group.members.length < 3 && (
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100"
            >
              Invite
            </button>
          )}
        </div>

        <div className="space-y-3">
          {group.members.map((member) => {
            const isCurrentUser =
              member.walletAddress.toLowerCase() ===
              currentUserWallet.toLowerCase();
            const displayName =
              member.displayName ||
              member.email ||
              `${member.walletAddress.slice(0, 6)}...${member.walletAddress.slice(-4)}`;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-medium text-white">
                    {(
                      member.displayName?.[0] ||
                      member.email?.[0] ||
                      "?"
                    ).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {displayName}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs text-gray-500">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.walletAddress.slice(0, 10)}...
                      {member.walletAddress.slice(-6)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatNgn(usdcToNgn(parseFloat(member.balance.usdc)))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {group.members.length < 3 && (
          <p className="mt-3 text-center text-xs text-gray-400">
            {3 - group.members.length} spot{3 - group.members.length !== 1 ? "s" : ""}{" "}
            remaining
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-medium text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowSendMoney(true)}
            disabled={!canSend}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              canSend
                ? "border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
                : "border border-gray-200 bg-gray-50 text-gray-700 opacity-50"
            } disabled:cursor-not-allowed`}
          >
            Send Money
          </button>
          <button
            onClick={() => setShowRequestMoney(true)}
            disabled={!hasOtherMembers}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              hasOtherMembers
                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border border-gray-200 bg-gray-50 text-gray-700 opacity-50"
            } disabled:cursor-not-allowed`}
          >
            Request
          </button>
          <button
            onClick={() => {
              if (pendingRequests.length > 0) {
                setSelectedRequest(pendingRequests[0]);
              }
            }}
            disabled={pendingRequests.length === 0}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pendingRequests.length > 0
                ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border border-gray-200 bg-gray-50 text-gray-700 opacity-50"
            } disabled:cursor-not-allowed`}
          >
            Settle Up{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
          </button>
          <button
            onClick={() => setShowInvite(true)}
            disabled={group.members.length >= 3}
            className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        {!canSend && !hasOtherMembers && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Invite members and add demo balance to get started
          </p>
        )}
        {!canSend && hasOtherMembers && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Add demo balance below to enable Send
          </p>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-3 font-medium text-amber-800">
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((req) => {
              const requester = group.members.find(
                (m) => m.walletAddress.toLowerCase() === req.fromAddress.toLowerCase()
              );
              const requesterName =
                requester?.displayName ||
                requester?.email ||
                `${req.fromAddress.slice(0, 6)}...${req.fromAddress.slice(-4)}`;

              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="flex w-full items-center justify-between rounded-lg bg-white p-3 text-left transition-colors hover:bg-amber-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                      <svg
                        className="h-5 w-5 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {requesterName} requested {formatNgn(parseFloat(req.amountNgn))}
                      </p>
                      {req.note && (
                        <p className="text-xs text-gray-500">{req.note}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-amber-600">Pay</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isCreator && parseFloat(group.totalBalance.usdc) === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">Demo Mode</p>
          <p className="mb-3 text-xs text-amber-700">
            Add demo balances to try sending money within your group.
          </p>
          <button
            onClick={handleSeedBalances}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Add Demo Balance
          </button>
          <p className="mt-2 text-center text-xs text-amber-600">
            Demo uses test dollars under the hood.
          </p>
        </div>
      )}

      <ActivityFeed
        transactions={transactions}
        requests={requests}
        group={group}
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
        onSuccess={handleSendSuccess}
      />

      <RequestMoneyModal
        isOpen={showRequestMoney}
        onClose={() => setShowRequestMoney(false)}
        group={group}
        currentUserWallet={currentUserWallet}
        onSuccess={handleRequestSuccess}
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

interface ActivityItem {
  id: string;
  type: "send" | "receive" | "request" | "settle" | "request_sent" | "request_received";
  amount: string;
  otherPartyName: string;
  note?: string;
  status?: string;
  createdAt: string;
}

function ActivityFeed({
  transactions,
  requests,
  group,
  currentUserWallet,
}: {
  transactions: Transaction[];
  requests: MoneyRequest[];
  group: Group;
  currentUserWallet: string;
}) {
  const activities: ActivityItem[] = [];

  for (const tx of transactions) {
    const isSender = tx.fromAddress.toLowerCase() === currentUserWallet.toLowerCase();
    const otherAddress = isSender ? tx.toAddress : tx.fromAddress;
    const otherMember = group.members.find(
      (m) => m.walletAddress.toLowerCase() === otherAddress.toLowerCase()
    );
    const otherName =
      otherMember?.displayName ||
      otherMember?.email ||
      `${otherAddress.slice(0, 6)}...${otherAddress.slice(-4)}`;

    let activityType: ActivityItem["type"];
    switch (tx.type) {
      case "send":
        activityType = isSender ? "send" : "receive";
        break;
      case "settle":
        activityType = "settle";
        break;
      case "request":
        activityType = isSender ? "request_sent" : "request_received";
        break;
      case "receive":
        activityType = "receive";
        break;
      default: {
        const _exhaustive: never = tx.type;
        throw new Error(`Unknown transaction type: ${_exhaustive}`);
      }
    }

    activities.push({
      id: tx.id,
      type: activityType,
      amount: tx.amountNgn,
      otherPartyName: otherName,
      note: tx.note,
      createdAt: tx.createdAt,
    });
  }

  for (const req of requests) {
    const isRequester = req.fromAddress.toLowerCase() === currentUserWallet.toLowerCase();
    const otherAddress = isRequester ? req.toAddress : req.fromAddress;
    const otherMember = group.members.find(
      (m) => m.walletAddress.toLowerCase() === otherAddress.toLowerCase()
    );
    const otherName =
      otherMember?.displayName ||
      otherMember?.email ||
      `${otherAddress.slice(0, 6)}...${otherAddress.slice(-4)}`;

    if (req.status !== "paid") {
      activities.push({
        id: `req-${req.id}`,
        type: isRequester ? "request_sent" : "request_received",
        amount: req.amountNgn,
        otherPartyName: otherName,
        note: req.note,
        status: req.status,
        createdAt: req.createdAt,
      });
    }
  }

  activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (activities.length === 0) {
    return null;
  }

  const getActivityLabel = (activity: ActivityItem): string => {
    switch (activity.type) {
      case "send":
        return `Sent to ${activity.otherPartyName}`;
      case "receive":
        return `Received from ${activity.otherPartyName}`;
      case "settle":
        return `Paid ${activity.otherPartyName}`;
      case "request_sent":
        return `Requested from ${activity.otherPartyName}`;
      case "request_received":
        return `${activity.otherPartyName} requested`;
      default:
        return "";
    }
  };

  const getActivityColor = (activity: ActivityItem) => {
    switch (activity.type) {
      case "send":
      case "settle":
        return { bg: "bg-red-100", text: "text-red-600", sign: "-" };
      case "receive":
        return { bg: "bg-green-100", text: "text-green-600", sign: "+" };
      case "request_sent":
      case "request_received":
        return { bg: "bg-amber-100", text: "text-amber-600", sign: "" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600", sign: "" };
    }
  };

  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case "send":
      case "settle":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11l5-5m0 0l5 5m-5-5v12"
          />
        );
      case "receive":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 13l-5 5m0 0l-5-5m5 5V6"
          />
        );
      case "request_sent":
      case "request_received":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Activity</h3>
      <div className="space-y-3">
        {activities.slice(0, 10).map((activity) => {
          const colors = getActivityColor(activity);
          const statusLabel =
            activity.status === "pending"
              ? " · Pending"
              : activity.status === "declined"
                ? " · Declined"
                : activity.status === "cancelled"
                  ? " · Cancelled"
                  : "";

          return (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${colors.bg}`}
                >
                  <svg
                    className={`h-5 w-5 ${colors.text}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {getActivityIcon(activity)}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityLabel(activity)}
                    {statusLabel && (
                      <span className="text-gray-500">{statusLabel}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {activity.note && ` · ${activity.note}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${colors.text}`}>
                  {colors.sign}
                  {formatNgn(parseFloat(activity.amount))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {activities.length > 10 && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Showing 10 of {activities.length} activities
        </p>
      )}
    </div>
  );
}
