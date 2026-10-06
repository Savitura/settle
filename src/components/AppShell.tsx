"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import {
  getGroupsByWallet,
  getGroupById,
  migrateLocalStorageData,
  getTransactionsByWallet,
  getRequestsByWallet,
  getSavedProfile,
  getNotifications,
  markNotificationsRead,
} from "@/lib/db";
import { Group, Transaction, Notification, MoneyRequest, ProfileInput } from "@/lib/types";
import { formatNgn, usdcToNgn } from "@/lib/currency";
import { DEMO_FUNDS_ENABLED, useDemoFunds } from "@/lib/useDemoFunds";
import { CreateGroupModal } from "./CreateGroupModal";
import { JoinGroupModal } from "./JoinGroupModal";
import { GroupCard } from "./GroupCard";
import { GroupDetail, GroupAction, ActivityList, buildActivity } from "./GroupDetail";
import { DemoBanner } from "./DemoBanner";
import { ProfileModal } from "./ProfileModal";
import { Avatar, friendlyFromEmail, memberName } from "./ui/Avatar";
import { IconButton } from "./ui/Sheet";
import { useCountUp } from "./ui/Status";
import { StartAction, StartStep } from "./ui/StartSteps";
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

// Square Up horizontal logo (light variant, for cream/white backgrounds). viewBox is 683x185.
function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const height = size === "lg" ? 40 : 30;
  return (
    <Image
      src="/brand/settle-logo-light.svg"
      alt="Settle"
      width={Math.round((height * 683) / 185)}
      height={height}
      priority
      unoptimized
      style={{ height, width: "auto" }}
    />
  );
}

export function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-white px-4 py-4 text-ink sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2.5">
          <Logo />
          </div>
          <span className="hidden text-sm font-semibold text-ink-muted sm:block">Built for Nigerian families</span>
        </div>

        <main className="mt-5 grid flex-1 overflow-hidden rounded-[34px] border border-ink/15 bg-cream lg:grid-cols-[1.05fr_.95fr]">
          <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
            <span className="w-fit rounded-full border border-ink/15 bg-white/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em]">
              Money, made familiar
            </span>
            <h1 className="mt-6 max-w-2xl font-display text-[48px] font-extrabold leading-[.96] tracking-[-0.045em] text-balance sm:text-[68px] lg:text-[78px]">
              Family money, <span className="text-primary-600">finally simple.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
              One shared wallet for the people you trust. Send, request and settle up in naira—without the crypto jargon.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={onLogin} className="focus-ring rounded-full bg-primary-500 px-7 py-4 font-display text-base font-bold text-ink shadow-glow active:scale-[0.98]">
                Get started
              </button>
              <p className="text-sm text-ink-muted">Phone, email, Google or passkey</p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-ink-muted">
              <div className="flex -space-x-2">
                {["Mama Funke", "Chidi", "Ngozi"].map((n, i) => <Avatar key={n} name={n} size="sm" ring tone={i} />)}
              </div>
              <span>Built in Lagos, for families everywhere.</span>
            </div>
          </section>
          <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-primary-500 p-8 lg:min-h-0">
            <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[40px] border-[#dfff00]" />
            <div className="absolute -bottom-20 -left-16 h-72 w-72 rotate-12 rounded-[64px] bg-[#dfff00]" />
            <div className="relative w-full max-w-sm rounded-[32px] border border-white/25 bg-ink p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/60">Adeyemi Family</p>
                <span className="rounded-full bg-primary-400/20 px-2.5 py-1 text-xs font-bold text-primary-300">Live</span>
              </div>
              <p className="tabular mt-3 font-display text-4xl font-extrabold tracking-tight">₦653,725</p>
              <p className="mt-1 text-sm text-white/50">Available across 3 members</p>
              <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center text-xs font-semibold text-white/70">
                <span>Send</span><span>Request</span><span>Settle</span>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-[20px] bg-white p-3 text-ink">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700"><SettleIcon size={18} /></span>
                <div className="flex-1"><p className="text-xs text-ink-muted">Chidi paid you</p><p className="tabular font-display font-bold">+₦15,000</p></div>
                <span className="text-xs font-bold text-primary-700">Now</span>
              </div>
            </div>
          </section>
        </main>
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
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfileInput | null>(null);

  const walletAddress = user?.wallet?.address || "";
  const userEmail = user?.email?.address;
  const userPhone = user?.phone?.number;

  const loadGroups = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [userGroups, txs, reqs] = await Promise.all([
        getGroupsByWallet(walletAddress),
        getTransactionsByWallet(walletAddress).catch(() => [] as Transaction[]),
        getRequestsByWallet(walletAddress).catch(() => [] as MoneyRequest[]),
      ]);
      setGroups(userGroups);
      setRecent(txs);
      setRequests(reqs);
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

  useEffect(() => {
    if (!walletAddress) return;
    getNotifications().then(setNotifications).catch(() => undefined);
  }, [walletAddress]);

  useEffect(() => {
    setSavedProfile(getSavedProfile(walletAddress));
  }, [walletAddress]);

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
    setRequests([]);
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
    getRequestsByWallet(walletAddress).then(setRequests).catch(() => undefined);
  };

  const myMemberships = groups
    .flatMap((g) => g.members)
    .filter((m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  // Prefer a membership that already has a name set
  const me = myMemberships.find((m) => m.displayName) ?? myMemberships[0];
  const profileName = me?.displayName || savedProfile?.displayName || undefined;
  const myName = profileName
    ? profileName
    : me
      ? memberName(me)
      : userEmail
        ? friendlyFromEmail(userEmail)
        : userPhone || "there";

  // Contact details used for new memberships and as the profile form's starting values
  const profileEmail = me ? me.email || undefined : savedProfile?.email || userEmail;
  const profilePhone = me ? me.phone || undefined : savedProfile?.phone || userPhone;

  const handleProfileSaved = async (profile: ProfileInput) => {
    setSavedProfile(profile);
    await loadGroups();
    if (selectedGroup) await handleRefreshGroup();
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/90 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button type="button" aria-label="Notifications" onClick={async () => {
                setShowNotifications((value) => !value);
                if (notifications.some((item) => !item.readAt)) {
                  await markNotificationsRead().catch(() => undefined);
                  setNotifications((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() })));
                }
              }} className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink-muted hover:bg-ink/5">
                <span aria-hidden="true">♢</span>
                {notifications.some((item) => !item.readAt) && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral-500" />}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-ink/10">
                  <p className="px-2 pb-2 font-display font-bold text-ink">Notifications</p>
                  {notifications.length === 0 ? <p className="px-2 py-4 text-sm text-ink-muted">You&apos;re all caught up.</p> : (
                    <ul className="max-h-72 divide-y divide-ink/5 overflow-auto">
                      {notifications.slice(0, 8).map((item) => <li key={item.id} className="px-2 py-3"><p className="text-sm font-bold text-ink">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-ink-muted">{item.body}</p></li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              aria-label="Edit your profile"
              title="Your profile"
              className="focus-ring rounded-full transition active:scale-95"
            >
              <Avatar name={myName} seed={walletAddress} size="sm" />
            </button>
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
              hasName={!!profileName}
              groups={groups}
              recent={recent}
              requests={requests}
              walletAddress={walletAddress}
              userEmail={userEmail}
              userPhone={userPhone}
              onOpenGroup={openGroup}
              onCreateGroup={() => setShowCreateModal(true)}
              onJoinGroup={() => setShowJoinModal(true)}
              onEditProfile={() => setShowProfile(true)}
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 pb-safe backdrop-blur-lg"
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
        displayName={profileName}
        userEmail={profileEmail}
        userPhone={profilePhone}
      />

      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleGroupJoined}
        walletAddress={walletAddress}
        displayName={profileName}
        userEmail={profileEmail}
        userPhone={profilePhone}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onSaved={handleProfileSaved}
        initial={{
          displayName: profileName ?? "",
          phone: profilePhone ?? "",
          email: profileEmail ?? "",
        }}
        seed={walletAddress}
        walletCount={groups.length}
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
        className={`flex h-8 w-14 items-center justify-center rounded-full ${
          active ? "bg-ink text-primary-400" : "text-ink-muted"
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
  hasName,
  groups,
  recent,
  requests,
  walletAddress,
  userEmail,
  userPhone,
  onOpenGroup,
  onCreateGroup,
  onJoinGroup,
  onEditProfile,
  onDemoLoaded,
  onDemoCleared,
  onRefresh,
}: {
  name: string;
  hasName: boolean;
  groups: Group[];
  recent: Transaction[];
  requests: MoneyRequest[];
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
  onOpenGroup: (group: Group, action?: GroupAction | null) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onEditProfile: () => void;
  onDemoLoaded: (group: Group) => void;
  onDemoCleared: () => void;
  onRefresh: () => Promise<void>;
}) {
  const demoFunds = useDemoFunds(onRefresh);
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
  const activity = buildActivity(recent, requests, nameFor, walletAddress);

  // First-time / empty users get a getting-started checklist instead of an empty dashboard
  const hasActivity = recent.length > 0 || requests.length > 0;
  const familyGroup = groups.find((g) => g.members.length > 1);
  const inviteGroup = groups.find((g) => g.members.length < 3);
  const hasMoney = myBalanceUsdc > 0 || demoFunds.state === "success";
  const showGettingStarted = !hasGroups || !hasActivity;

  const quickAll: Array<{ key: GroupAction; label: string; icon: React.ReactNode; style: string }> = [
    { key: "send", label: "Send", icon: <SendIcon size={24} />, style: "from-primary-400 to-primary-600 shadow-glow" },
    { key: "request", label: "Request", icon: <RequestIcon size={24} />, style: "from-coral-300 to-coral-500 shadow-glow-coral" },
    { key: "settle", label: "Settle up", icon: <SettleIcon size={24} />, style: "from-sun-300 to-sun-500 shadow-[0_18px_40px_-16px_rgba(249,168,6,0.6)]" },
    { key: "invite", label: "Invite", icon: <InviteIcon size={24} />, style: "from-fuchsia-400 to-fuchsia-600 shadow-[0_18px_40px_-16px_rgba(192,38,211,0.5)]" },
  ];

  // Only offer actions that will actually do something in the wallet they open
  const quick = quickAll.filter((a) => a.key !== "invite" || (primaryGroup && primaryGroup.members.length < 3));

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

      <section className="relative animate-rise-in overflow-hidden rounded-[28px] bg-ink p-6 text-white shadow-card [animation-delay:80ms]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[32px] border-primary-500/90" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rotate-12 rounded-[48px] bg-[#dfff00]/90" />
        <div className="relative">
          <p className="text-sm font-semibold text-white/60">Your money</p>
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
              <BoltIcon size={12} className="text-primary-300" /> Protected
            </span>
          </div>
          {DEMO_FUNDS_ENABLED && (
            <div className="mt-4 border-t border-white/15 pt-4">
              <button
                type="button"
                onClick={demoFunds.claim}
                disabled={demoFunds.busy || demoFunds.done}
                className="focus-ring w-full rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {demoFunds.busy
                  ? "Adding demo funds…"
                  : demoFunds.state === "success"
                    ? "Demo funds added"
                    : demoFunds.state === "claimed"
                      ? "Demo funds already added"
                      : "Get demo funds"}
              </button>
              {demoFunds.message && (
                <p className={`mt-2 text-center text-xs ${demoFunds.state === "error" ? "text-coral-100" : "text-primary-100"}`} role="status">
                  {demoFunds.message}
                  {!hasGroups && demoFunds.state === "success" && " It shows up here once you start or join a family wallet."}
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

      {showGettingStarted && (
        <section className="card animate-rise-in [animation-delay:200ms]">
          <p className="eyebrow">Getting started</p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink">
            {hasGroups ? "You're nearly set up" : "Let's get your family set up"}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            A few quick steps and your family can send, ask for and settle money together.
          </p>
          <ol className="mt-1 divide-y divide-ink/5">
            <StartStep index={1} title="Add your name" body="So your family knows it's you." done={hasName}>
              <StartAction onClick={onEditProfile}>Add your name</StartAction>
            </StartStep>
            <StartStep
              index={2}
              title="Bring your family in"
              body={
                hasGroups
                  ? "Invite up to 2 people to your family wallet."
                  : "Start a family wallet and invite up to 2 people, or join one with a code."
              }
              done={!!familyGroup}
            >
              {hasGroups ? (
                inviteGroup && (
                  <StartAction primary onClick={() => onOpenGroup(inviteGroup, "invite")}>
                    Invite family
                  </StartAction>
                )
              ) : (
                <>
                  <StartAction primary onClick={onCreateGroup}>
                    Create wallet
                  </StartAction>
                  <StartAction onClick={onJoinGroup}>Join with code</StartAction>
                </>
              )}
            </StartStep>
            <StartStep
              index={3}
              title="Add some money"
              body={
                DEMO_FUNDS_ENABLED
                  ? "Get demo funds to try things out. No rush, the button stays on your balance card."
                  : "Top up your balance so you can send."
              }
              done={hasMoney}
            >
              {DEMO_FUNDS_ENABLED && !demoFunds.done && (
                <StartAction onClick={demoFunds.claim} disabled={demoFunds.busy}>
                  {demoFunds.busy ? "Adding demo funds…" : "Get demo funds"}
                </StartAction>
              )}
            </StartStep>
            <StartStep
              index={4}
              title="Send or ask for money"
              body={
                familyGroup
                  ? "Send money to family, or ask for what you need."
                  : "Once family has joined you can send and ask for money."
              }
              done={hasActivity}
            >
              {familyGroup && (
                <>
                  {myBalanceUsdc > 0 && (
                    <StartAction primary onClick={() => onOpenGroup(familyGroup, "send")}>
                      Send money
                    </StartAction>
                  )}
                  <StartAction onClick={() => onOpenGroup(familyGroup, "request")}>Ask for money</StartAction>
                </>
              )}
            </StartStep>
          </ol>
        </section>
      )}

      {hasGroups && (
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
      )}

      {hasGroups && activity.length > 0 && (
        <section className="card animate-rise-in [animation-delay:260ms]">
          <h2 className="mb-2 font-display text-lg font-bold text-ink">Recent activity</h2>
          <ActivityList items={activity} limit={5} />
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
