"use client";

import { useState } from "react";

import { seedMockBalances } from "@/lib/db";
import { Group } from "@/lib/types";
import { InviteModal } from "./InviteModal";

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

  const isCreator =
    group.createdBy.toLowerCase() === currentUserWallet.toLowerCase();

  const handleSeedBalances = () => {
    seedMockBalances(group.id);
    onRefresh();
  };

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
        <p className="mt-1 text-3xl font-bold">{group.totalBalance.usdcFormatted}</p>
        <p className="mt-1 text-sm text-primary-200">USDC on Monad Testnet</p>

        <div className="mt-4 flex items-center justify-between text-xs text-primary-200">
          <span>
            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
          </span>
          <span className="rounded bg-primary-500/30 px-2 py-0.5">
            {parseFloat(group.totalBalance.usdc) === 0 ? "Mock balances available" : ""}
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
                    {member.balance.usdcFormatted}
                  </p>
                  <p className="text-xs text-gray-500">USDC</p>
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
            disabled
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 opacity-50"
          >
            Send Money
          </button>
          <button
            disabled
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 opacity-50"
          >
            Request
          </button>
          <button
            disabled
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 opacity-50"
          >
            Settle Up
          </button>
          <button
            onClick={() => setShowInvite(true)}
            disabled={group.members.length >= 3}
            className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          Send, Request, and Settle Up coming in Issues #3 and #4
        </p>
      </div>

      {isCreator && parseFloat(group.totalBalance.usdc) === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-800">Demo Mode</p>
          <p className="mb-3 text-xs text-amber-700">
            Since RPC balance fetching is not yet wired, you can seed mock USDC
            balances for demo purposes.
          </p>
          <button
            onClick={handleSeedBalances}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Seed Mock Balances
          </button>
        </div>
      )}

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        inviteCode={group.inviteCode}
        groupName={group.name}
      />
    </div>
  );
}
