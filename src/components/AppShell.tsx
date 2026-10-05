"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

import {
  getGroupsByWallet,
  getGroupById,
  migrateLocalStorageData,
  getTransactionsByWallet,
  fundDemoWallet,
} from "@/lib/db";
import { Group, Transaction } from "@/lib/types";
import { formatNgn, usdcToNgn } from "@/lib/currency";
import { CreateGroupModal } from "./CreateGroupModal";
import { JoinGroupModal } from "./JoinGroupModal";
import { GroupCard } from "./GroupCard";
import { GroupDetail, GroupAction, ActivityList, buildActivity } from "./GroupDetail";
import { DemoBanner } from "./DemoBanner";
import { Avatar, friendlyFromEmail, memberName } from "./ui/Avatar";
import { IconButton } from "./ui/Sheet";
import { useCountUp } from "./ui/Status";
import {
  BoltIcon,
  HomeIcon,
  InviteIcon,
  LogoutIcon,
  PlusIcon,
  RequestIcon,
  SendIcon,
  SettleIcon,
  UsersIcon,
} from "./ui/Icons";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream">
      <Logo size="lg" />
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-full animate-shimmer bg-[linear-gradient(90deg,transparent,#0fb872,transparent)] bg-[length:200%_100%]" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-[18px] text-3xl" : "h-9 w-9 rounded-xl text-lg";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center bg-gradient-to-br from-primary-400 via-primary-600 to-primary-800 font-display font-extrabold text-white shadow-glow ${box}`}
    >
      ₦
    </span>
  );
}

export function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-primary-950 px-5 pb-8 pt-10 text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-float rounded-full bg-primary-500/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-52 h-72 w-72 animate-float rounded-full bg-coral-500/40 blur-3xl [animation-delay:-3s]" />
      <div className="pointer-events-none absolute bottom-10 left-10 h-60 w-60 animate-float rounded-full bg-sun-400/30 blur-3xl [animation-delay:-6s]" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl font-bold">Settle</span>
        </div>

        <div className="mt-12 animate-rise-in">
          <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-tight text-balance">
            Family money,{" "}
            <span className="bg-gradient-to-r from-sun-300 via-coral-300 to-primary-300 bg-clip-text text-transparent">
              sorted.
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/80">
            One shared wallet for the whole family. Send, request and settle up in naira — in seconds.
          </p>
        </div>

        {/* Product preview */}
        <div className="relative mt-10 animate-rise-in [animation-delay:150ms]">
          <div className="rotate-[-2deg] rounded-[28px] bg-gradient-to-br from-primary-400 via-primary-600 to-primary-800 p-5 shadow-2xl ring-1 ring-white/10">
            <p className="text-sm font-semibold text-primary-100">Adeyemi Family</p>
            <p className="tabular mt-1 font-display text-4xl font-extrabold">₦653,725</p>
            <div className="mt-4 flex -space-x-2.5">
              {["Mama Funke", "Chidi", "Ngozi"].map((n, i) => (
                <Avatar key={n} name={n} size="sm" ring tone={i} />
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 right-2 flex rotate-[3deg] items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink shadow-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white">
              <SettleIcon size={16} />
            </span>
            <div>
              <p className="text-xs font-medium text-ink-muted">Chidi paid you</p>
              <p className="tabular font-display text-sm font-bold text-primary-700">+₦15,000</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-16">
          <ul className="mb-6 flex flex-wrap gap-2 text-sm font-medium text-white/85">
            {["No seed phrases", "Balances in ₦", "Settles in seconds"].map((t) => (
              <li key={t} className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                {t}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onLogin}
            className="focus-ring w-full rounded-2xl bg-white py-4 font-display text-lg font-bold text-primary-800 shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Get started
          </button>
          <p className="mt-3 text-center text-sm text-white/70">Continue with phone, email, Google or a passkey</p>
          <p className="mt-2 text-center text-xs text-white/55">Your secure wallet is created automatically.</p>
          <p className="mt-6 text-center text-xs text-white/60">Monad Metropolis · Track 02</p>
        </div>
      </div>
    </div>
  );
}

type Tab = "home" | "groups";

export interface ShellUser {
  wallet?: { address: string };
  email?: { address: string };
  phone?: { number: string };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function AppShell({ user, onLogout }: { user: ShellUser | null; onLogout: () => void }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "groups" ? "groups" : "home";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [pendingAction, setPendingAction] = useState<GroupAction | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [recent, setRecent] = useState<Transaction[]>([]);

  const walletAddress = user?.wallet?.address || "";
  const userEmail = user?.email?.address;
  const userPhone = user?.phone?.number;

  const loadGroups = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [userGroups, txs] = await Promise.all([
        getGroupsByWallet(walletAddress),
        getTransactionsByWallet(walletAddress).catch(() => [] as Transaction[]),
      ]);
      setGroups(userGroups);
      setRecent(txs);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }, [walletAddress]);

  useEffect(() => {
    const initAndLoad = async () => {
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true") {
        await migrateLocalStorageData();
      }
      loadGroups();
    };
    initAndLoad();
  }, [loadGroups]);

  const openGroup = (group: Group, action: GroupAction | null = null) => {
    setSelectedGroup(group);
    setPendingAction(action);
    setActiveTab("groups");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGroupCreated = (group: Group) => {
    setGroups((prev) => [...prev, group]);
    openGroup(group);
  };

  const handleGroupJoined = (group: Group) => {
    loadGroups();
    openGroup(group);
  };

  const handleDemoLoaded = (group: Group) => {
    loadGroups();
    openGroup(group);
  };

  const handleDemoCleared = () => {
    setGroups([]);
    setRecent([]);
    setSelectedGroup(null);
  };

  const handleRefreshGroup = async () => {
    if (!selectedGroup) return;
    const refreshed = await getGroupById(selectedGroup.id);
    if (refreshed) {
      setSelectedGroup(refreshed);
      setGroups((prev) => prev.map((g) => (g.id === refreshed.id ? refreshed : g)));
    }
    getTransactionsByWallet(walletAddress).then(setRecent).catch(() => undefined);
  };

  const me = groups
    .flatMap((g) => g.members)
    .find((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  const myName = me
    ? memberName(me)
    : userEmail
      ? friendlyFromEmail(userEmail)
      : userPhone || "there";

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/85 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-xl font-bold text-ink">Settle</span>
          </div>
          <div className="flex items-center gap-1">
            <Avatar name={myName} seed={walletAddress} size="sm" />
            <IconButton label="Sign out" onClick={onLogout}>
              <LogoutIcon size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5">
        <div className="mx-auto max-w-lg">
          {activeTab === "home" && (
            <HomeView
              key="home"
              name={myName}
              groups={groups}
              recent={recent}
              walletAddress={walletAddress}
              userEmail={userEmail}
              userPhone={userPhone}
              onOpenGroup={openGroup}
              onCreateGroup={() => setShowCreateModal(true)}
              onJoinGroup={() => setShowJoinModal(true)}
              onDemoLoaded={handleDemoLoaded}
              onDemoCleared={handleDemoCleared}
              onRefresh={loadGroups}
            />
          )}
          {activeTab === "groups" &&
            (selectedGroup ? (
              <div key={selectedGroup.id} className="animate-step-in">
                <GroupDetail
                  group={selectedGroup}
                  onBack={() => setSelectedGroup(null)}
                  onRefresh={handleRefreshGroup}
                  currentUserWallet={walletAddress}
                  initialAction={pendingAction}
                  onActionHandled={() => setPendingAction(null)}
                />
              </div>
            ) : (
              <GroupsView
                groups={groups}
                onCreateGroup={() => setShowCreateModal(true)}
                onJoinGroup={() => setShowJoinModal(true)}
                onSelectGroup={(g) => openGroup(g)}
                currentUserWallet={walletAddress}
              />
            ))}
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/5 bg-white/90 pb-safe backdrop-blur-lg"
      >
        <div className="mx-auto flex max-w-lg px-6">
          <TabButton
            label="Home"
            icon={<HomeIcon size={22} />}
            active={activeTab === "home"}
            onClick={() => {
              setActiveTab("home");
              setSelectedGroup(null);
            }}
          />
          <TabButton
            label="Wallets"
            icon={<UsersIcon size={22} />}
            active={activeTab === "groups"}
            onClick={() => {
              setActiveTab("groups");
              setSelectedGroup(null);
            }}
          />
        </div>
      </nav>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
        walletAddress={walletAddress}
        userEmail={userEmail}
        userPhone={userPhone}
      />

      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleGroupJoined}
        walletAddress={walletAddress}
        userEmail={userEmail}
        userPhone={userPhone}
      />
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="focus-ring flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ${
          active ? "bg-primary-100 text-primary-700" : "text-ink-muted"
        }`}
      >
        {icon}
      </span>
      <span className={`text-xs font-bold ${active ? "text-primary-800" : "text-ink-muted"}`}>{label}</span>
    </button>
  );
}

function HomeView({
  name,
  groups,
  recent,
  walletAddress,
  userEmail,
  userPhone,
  onOpenGroup,
  onCreateGroup,
  onJoinGroup,
  onDemoLoaded,
  onDemoCleared,
  onRefresh,
}: {
  name: string;
  groups: Group[];
  recent: Transaction[];
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
  onOpenGroup: (group: Group, action?: GroupAction | null) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onDemoLoaded: (group: Group) => void;
  onDemoCleared: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [fundingState, setFundingState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fundingMessage, setFundingMessage] = useState("");
  const hasGroups = groups.length > 0;
  const myBalanceUsdc = groups.reduce((sum, g) => {
    const me = g.members.find((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    return sum + parseFloat(me?.balance.usdc || "0");
  }, 0);
  const animatedBalance = useCountUp(usdcToNgn(myBalanceUsdc));
  const primaryGroup = groups[0];

  const allMembers = groups.flatMap((g) => g.members);
  const nameFor = (address: string) =>
    memberName(allMembers.find((m) => m.walletAddress.toLowerCase() === address.toLowerCase()));
  const activity = buildActivity(recent, [], nameFor, walletAddress);

  const quickAll: Array<{ key: GroupAction; label: string; icon: React.ReactNode; style: string }> = [
    { key: "send", label: "Send", icon: <SendIcon size={24} />, style: "from-primary-400 to-primary-600 shadow-glow" },
    { key: "request", label: "Request", icon: <RequestIcon size={24} />, style: "from-coral-300 to-coral-500 shadow-glow-coral" },
    { key: "settle", label: "Settle up", icon: <SettleIcon size={24} />, style: "from-sun-300 to-sun-500 shadow-[0_18px_40px_-16px_rgba(249,168,6,0.6)]" },
    { key: "invite", label: "Invite", icon: <InviteIcon size={24} />, style: "from-fuchsia-400 to-fuchsia-600 shadow-[0_18px_40px_-16px_rgba(192,38,211,0.5)]" },
  ];

  // Only offer actions that will actually do something in the wallet they open
  const quick = quickAll.filter((a) => a.key !== "invite" || (primaryGroup && primaryGroup.members.length < 3));

  const handleDemoFunding = async () => {
    setFundingState("loading");
    setFundingMessage("");
    try {
      const result = await fundDemoWallet();
      setFundingState("success");
      setFundingMessage(`${result.amountUsdc} demo USDC added`);
      await onRefresh();
    } catch (error) {
      setFundingState("error");
      setFundingMessage(error instanceof Error ? error.message : "Demo funding failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-rise-in">
        <p className="text-sm font-medium text-ink-muted">{greeting()},</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{name}</h1>
      </div>

      {process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" && (
        <DemoBanner
          walletAddress={walletAddress}
          userEmail={userEmail}
          userPhone={userPhone}
          onDemoLoaded={onDemoLoaded}
          onDemoCleared={onDemoCleared}
          hasGroups={hasGroups}
        />
      )}

      <section className="relative animate-rise-in overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-500 via-primary-600 to-primary-900 p-6 text-white shadow-glow [animation-delay:80ms]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-float rounded-full bg-sun-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 animate-float rounded-full bg-coral-400/30 blur-3xl [animation-delay:-4s]" />
        <div className="relative">
          <p className="text-sm font-semibold text-primary-100">Your money</p>
          <p className="tabular mt-1 font-display text-[44px] font-extrabold leading-none tracking-tight">
            {formatNgn(animatedBalance)}
          </p>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="font-medium text-primary-100">
              {hasGroups
                ? `Across ${groups.length} family wallet${groups.length !== 1 ? "s" : ""}`
                : "No family wallets yet"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">
              <BoltIcon size={12} className="text-sun-300" /> On-chain
            </span>
          </div>
          {process.env.NEXT_PUBLIC_ENABLE_TESTNET_FAUCET === "true" && (
            <div className="mt-4 border-t border-white/15 pt-4">
              <button
                type="button"
                onClick={handleDemoFunding}
                disabled={fundingState === "loading" || fundingState === "success"}
                className="focus-ring w-full rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {fundingState === "loading"
                  ? "Adding demo funds…"
                  : fundingState === "success"
                    ? "Demo funds added"
                    : "Get demo funds"}
              </button>
              {fundingMessage && (
                <p className={`mt-2 text-center text-xs ${fundingState === "error" ? "text-coral-100" : "text-primary-100"}`} role="status">
                  {fundingMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {hasGroups && (
        <section aria-label="Quick actions" className="animate-rise-in [animation-delay:140ms]">
          <div className={`grid gap-2 ${quick.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {quick.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => onOpenGroup(primaryGroup, a.key)}
                className="focus-ring group flex flex-col items-center gap-2 rounded-2xl py-1"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br text-white transition-all group-hover:-translate-y-0.5 group-active:scale-90 ${a.style}`}
                >
                  {a.icon}
                </span>
                <span className="text-sm font-semibold text-ink-soft">{a.label}</span>
              </button>
            ))}
          </div>
          {groups.length > 1 && (
            <p className="mt-2 text-center text-xs text-ink-muted">Opens in {primaryGroup.name}</p>
          )}
        </section>
      )}

      {hasGroups ? (
        <section className="animate-rise-in [animation-delay:200ms]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Family wallets</h2>
            <button
              type="button"
              onClick={onCreateGroup}
              className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              <PlusIcon size={16} /> New
            </button>
          </div>
          <div className="space-y-3">
            {groups.slice(0, 2).map((g, i) => (
              <GroupCard key={g.id} group={g} index={i} onClick={() => onOpenGroup(g)} currentUserWallet={walletAddress} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyWallets onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
      )}

      {hasGroups && (
        <section className="card animate-rise-in [animation-delay:260ms]">
          <h2 className="mb-2 font-display text-lg font-bold text-ink">Recent activity</h2>
          {activity.length > 0 ? (
            <ActivityList items={activity} limit={5} />
          ) : (
            <p className="py-4 text-center text-sm text-ink-muted">
              Nothing yet — send or request money to get things moving.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function EmptyWallets({ onCreateGroup, onJoinGroup }: { onCreateGroup: () => void; onJoinGroup: () => void }) {
  return (
    <section className="card animate-rise-in text-center [animation-delay:200ms]">
      <div className="mx-auto flex w-fit -space-x-3">
        {["Mama", "Chidi", "Ngozi"].map((n, i) => (
          <Avatar key={n} name={n} size="md" ring tone={i} />
        ))}
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-ink">Start a family wallet</h3>
      <p className="mt-1 text-sm text-ink-muted">Create one and invite up to 2 people, or join with a code.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onJoinGroup} className="btn-ghost">
          Join with code
        </button>
        <button type="button" onClick={onCreateGroup} className="btn-primary !py-3.5 !text-sm">
          Create wallet
        </button>
      </div>
    </section>
  );
}

function GroupsView({
  groups,
  onCreateGroup,
  onJoinGroup,
  onSelectGroup,
  currentUserWallet,
}: {
  groups: Group[];
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onSelectGroup: (group: Group) => void;
  currentUserWallet: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Wallets</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onJoinGroup}
            className="focus-ring rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-soft shadow-card ring-1 ring-ink/5 hover:text-ink active:scale-95"
          >
            Join
          </button>
          <button
            type="button"
            onClick={onCreateGroup}
            className="focus-ring inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-sm font-bold text-white shadow-glow active:scale-95"
          >
            <PlusIcon size={16} /> New
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyWallets onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <GroupCard
              key={group.id}
              group={group}
              index={i}
              onClick={() => onSelectGroup(group)}
              currentUserWallet={currentUserWallet}
            />
          ))}
        </div>
      )}
    </div>
  );
}
