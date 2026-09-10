"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrivy, PrivyProvider } from "@privy-io/react-auth";

import { monadTestnet } from "@/lib/monad";
import { JoinGroupModal } from "@/components/JoinGroupModal";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";

  const { ready, authenticated, login, user } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Join Family Wallet
            </h1>
            <p className="mt-2 text-gray-600">
              Sign in to join with code: <span className="font-mono font-bold">{code}</span>
            </p>
          </div>

          <button
            onClick={login}
            className="w-full rounded-lg bg-primary-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            Sign In to Join
          </button>

          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const walletAddress = user?.wallet?.address || "";
  const userEmail = user?.email?.address || undefined;
  const userPhone = user?.phone?.number || undefined;

  const handleJoined = () => {
    router.push("/?tab=groups");
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <JoinGroupModal
        isOpen={true}
        onClose={handleClose}
        onJoined={handleJoined}
        walletAddress={walletAddress}
        userEmail={userEmail}
        userPhone={userPhone}
        initialCode={code}
      />
    </div>
  );
}

function JoinPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}

export default function JoinPage() {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Configuration Error
          </h2>
          <p className="text-sm text-red-600">
            Missing NEXT_PUBLIC_PRIVY_APP_ID environment variable.
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
      <JoinPageWrapper />
    </PrivyProvider>
  );
}
