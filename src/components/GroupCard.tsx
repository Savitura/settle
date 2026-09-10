"use client";

import { Group } from "@/lib/types";

interface GroupCardProps {
  group: Group;
  onClick: () => void;
  currentUserWallet: string;
}

export function GroupCard({ group, onClick, currentUserWallet }: GroupCardProps) {
  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{group.name}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Group Total</p>
          <p className="text-lg font-semibold text-gray-900">
            {group.totalBalance.usdcFormatted}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Your Balance</p>
          <p className="text-lg font-semibold text-primary-600">
            {currentMember?.balance.usdcFormatted || "$0.00"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex -space-x-2">
        {group.members.map((member, idx) => (
          <div
            key={member.id}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-medium text-white"
            title={
              member.displayName ||
              member.email ||
              `${member.walletAddress.slice(0, 6)}...`
            }
            style={{ zIndex: group.members.length - idx }}
          >
            {(member.displayName?.[0] || member.email?.[0] || "?").toUpperCase()}
          </div>
        ))}
        {group.members.length < 3 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
            +
          </div>
        )}
      </div>
    </button>
  );
}
