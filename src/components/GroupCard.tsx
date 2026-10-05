"use client";

import { Group } from "@/lib/types";
import { formatNgn, usdcToNgn } from "@/lib/currency";
import { Avatar, memberName } from "./ui/Avatar";
import { ChevronRightIcon } from "./ui/Icons";

interface GroupCardProps {
  group: Group;
  onClick: () => void;
  currentUserWallet: string;
  index?: number;
}

export function GroupCard({ group, onClick, currentUserWallet, index = 0 }: GroupCardProps) {
  const currentMember = group.members.find(
    (m) => m.walletAddress.toLowerCase() === currentUserWallet.toLowerCase()
  );

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${index * 70}ms` }}
      className="focus-ring card group w-full animate-rise-in text-left hover:bg-[#fcfcf4] active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-3">
          {group.members.map((member, idx) => (
            <div key={member.id} style={{ zIndex: group.members.length - idx }}>
              <Avatar name={memberName(member)} seed={member.walletAddress} size="md" ring />
            </div>
          ))}
          {group.members.length < 3 && (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-ink/15 bg-cream text-lg font-semibold text-ink-muted ring-[3px] ring-white">
              +
            </div>
          )}
        </div>
        <ChevronRightIcon className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-4 font-display text-xl font-bold text-ink">{group.name}</h3>
      <p className="text-sm text-ink-muted">
        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cream px-3 py-2.5">
          <p className="text-xs font-medium text-ink-muted">Wallet total</p>
          <p className="tabular font-display text-lg font-bold text-ink">
            {formatNgn(usdcToNgn(parseFloat(group.totalBalance.usdc)))}
          </p>
        </div>
        <div className="rounded-2xl bg-primary-50 px-3 py-2.5">
          <p className="text-xs font-medium text-primary-800">Your share</p>
          <p className="tabular font-display text-lg font-bold text-primary-700">
            {formatNgn(usdcToNgn(parseFloat(currentMember?.balance.usdc || "0")))}
          </p>
        </div>
      </div>
    </button>
  );
}
