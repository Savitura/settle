"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy, PrivyProvider } from "@privy-io/react-auth";

import { getGroupsByWallet, getGroupById } from "@/lib/db";
import { monadTestnet } from "@/lib/monad";
import { Group } from "@/lib/types";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import { GroupCard } from "@/components/GroupCard";
import { GroupDetail } from "@/components/GroupDetail";
import { DemoBanner } from "@/components/DemoBanner";

export default function Home() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Configuration Error
          </h2>
          <p className="text-sm text-red-600">
            Missing NEXT_PUBLIC_PRIVY_APP_ID environment variable. Please check
            your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "sms"],
        appearance: {
          theme: "light",
          accentColor: "#22c55e",
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <AuthenticatedApp />
      </Suspense>
    </PrivyProvider>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-gray-500">Loading...</div>
    </div>
  );
}

function AuthenticatedApp() {
  const { ready, authenticated, login, user, logout } = usePrivy();

  if (!ready) {
    return <LoadingSpinner />;
  }

  if (!authenticated) {
    return <LoginGate onLogin={login} />;
  }

  return <AppShell user={user} onLogout={logout} />;
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Settle
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Shared family wallets for Africa
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Send money home. Split expenses. Together.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onLogin}
            className="w-full rounded-lg bg-primary-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Get Started
          </button>
          <p className="text-xs text-gray-500">
            Sign in with email or phone number
          </p>
        </div>

        <div className="pt-8 text-xs text-gray-400">
          <p>Monad Metropolis · Track 02</p>
        </div>
      </div>
    </div>
  );
}

type Tab = "home" | "groups";

interface PrivyUser {
  wallet?: {
    address: string;
  };
  email?: {
    address: string;
  };
  phone?: {
    number: string;
  };
}

function AppShell({
  user,
  onLogout,
}: {
  user: PrivyUser | null;
  onLogout: () => void;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "groups" ? "groups" : "home";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const walletAddress = user?.wallet?.address || "";
  const userEmail = user?.email?.address;
  const userPhone = user?.phone?.number;

  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const loadGroups = useCallback(() => {
    if (!walletAddress) return;
    const userGroups = getGroupsByWallet(walletAddress);
    setGroups(userGroups);
  }, [walletAddress]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleGroupCreated = (group: Group) => {
    setGroups((prev) => [...prev, group]);
    setSelectedGroup(group);
  };

  const handleGroupJoined = (group: Group) => {
    loadGroups();
    setSelectedGroup(group);
  };

  const handleDemoLoaded = (group: Group) => {
    loadGroups();
    setSelectedGroup(group);
    setActiveTab("groups");
  };

  const handleDemoCleared = () => {
    setGroups([]);
    setSelectedGroup(null);
  };

  const handleRefreshGroup = () => {
    if (!selectedGroup) return;

    const refreshed = getGroupById(selectedGroup.id);
    if (refreshed) {
      setSelectedGroup(refreshed);
      setGroups((prev) =>
        prev.map((g) => (g.id === refreshed.id ? refreshed : g))
      );
    }
  };

  const totalBalance = groups.reduce(
    (sum, g) => sum + parseFloat(g.totalBalance.usdc),
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settle</h1>
          <div className="flex items-center gap-3">
            {displayAddress && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {displayAddress}
              </span>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg">
          {activeTab === "home" && (
            <HomeView
              totalBalance={totalBalance}
              groupCount={groups.length}
              onGoToGroups={() => setActiveTab("groups")}
              walletAddress={walletAddress}
              userEmail={userEmail}
              userPhone={userPhone}
              onDemoLoaded={handleDemoLoaded}
              onDemoCleared={handleDemoCleared}
            />
          )}
          {activeTab === "groups" && (
            <>
              {selectedGroup ? (
                <GroupDetail
                  group={selectedGroup}
                  onBack={() => setSelectedGroup(null)}
                  onRefresh={handleRefreshGroup}
                  currentUserWallet={walletAddress}
                />
              ) : (
                <GroupsView
                  groups={groups}
                  onCreateGroup={() => setShowCreateModal(true)}
                  onJoinGroup={() => setShowJoinModal(true)}
                  onSelectGroup={setSelectedGroup}
                  currentUserWallet={walletAddress}
                />
              )}
            </>
          )}
        </div>
      </main>

      <nav className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <TabButton
            label="Home"
            active={activeTab === "home"}
            onClick={() => {
              setActiveTab("home");
              setSelectedGroup(null);
            }}
          />
          <TabButton
            label="Groups"
            active={activeTab === "groups"}
            onClick={() => setActiveTab("groups")}
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
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 text-sm font-medium transition-colors ${
        active
          ? "border-t-2 border-primary-600 text-primary-600"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function HomeView({
  totalBalance,
  groupCount,
  onGoToGroups,
  walletAddress,
  userEmail,
  userPhone,
  onDemoLoaded,
  onDemoCleared,
}: {
  totalBalance: number;
  groupCount: number;
  onGoToGroups: () => void;
  walletAddress: string;
  userEmail?: string;
  userPhone?: string;
  onDemoLoaded: (group: Group) => void;
  onDemoCleared: () => void;
}) {
  const ngnRate = 1580;
  const ngnBalance = totalBalance * ngnRate;

  return (
    <div className="space-y-6">
      {groupCount === 0 && (
        <DemoBanner
          walletAddress={walletAddress}
          userEmail={userEmail}
          userPhone={userPhone}
          onDemoLoaded={onDemoLoaded}
          onDemoCleared={onDemoCleared}
        />
      )}

      <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white shadow-lg">
        <p className="text-sm font-medium text-primary-100">Total Balance</p>
        <p className="mt-1 text-3xl font-bold">
          ₦{ngnBalance.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
        </p>
        {groupCount > 0 && (
          <p className="mt-2 text-xs text-primary-200">
            Across {groupCount} family wallet{groupCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionButton label="Send" disabled />
          <ActionButton label="Request" disabled />
          <ActionButton label="Add Money" disabled />
          <ActionButton label="Cash Out" disabled />
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          Coming soon
        </p>
      </div>

      {groupCount === 0 ? (
        <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50 p-6 text-center">
          <h3 className="font-medium text-primary-800">
            Create Your First Family Wallet
          </h3>
          <p className="mt-1 text-sm text-primary-600">
            Start managing shared expenses with your family
          </p>
          <button
            onClick={onGoToGroups}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Go to Groups
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <p className="mt-4 text-center text-sm text-gray-500">
            No transactions yet
          </p>
        </div>
      )}
    </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Family Wallets</h2>
        <div className="flex gap-2">
          <button
            onClick={onJoinGroup}
            className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100"
          >
            Join
          </button>
          <button
            onClick={onCreateGroup}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900">No family wallets yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a shared wallet or join one with an invite code
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={onJoinGroup}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Join with Code
            </button>
            <button
              onClick={onCreateGroup}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Create Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={() => onSelectGroup(group)}
              currentUserWallet={currentUserWallet}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 opacity-50"
    >
      {label}
    </button>
  );
}
