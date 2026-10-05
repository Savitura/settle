"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrivy, PrivyProvider } from "@privy-io/react-auth";

import { monadTestnet } from "@/lib/monad";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import { LoadingScreen } from "@/components/AppShell";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";

  const { ready, authenticated, login, user } = usePrivy();

  if (!ready) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-primary-950 px-5 text-white">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-float rounded-full bg-primary-500/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 animate-float rounded-full bg-coral-500/40 blur-3xl [animation-delay:-3s]" />
        <div className="relative w-full max-w-md animate-rise-in text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-200">You&apos;re invited</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Join your family wallet</h1>
          {code && (
            <p className="mx-auto mt-6 w-fit rounded-2xl bg-white/10 px-5 py-3 font-mono text-3xl font-bold tracking-[0.3em] ring-1 ring-white/20">
              {code}
            </p>
          )}
          <button
            type="button"
            onClick={login}
            className="focus-ring mt-8 w-full rounded-2xl bg-white py-4 font-display text-lg font-bold text-primary-800 shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Sign in to join
          </button>
          <p className="mt-3 text-sm text-white/70">Email or phone number — no passwords</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 text-sm font-semibold text-white/70 hover:text-white"
          >
            Go to home
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
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
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
      fallback={<LoadingScreen />}
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
        loginMethods: ["email", "sms", "google", "passkey"],
        appearance: {
          theme: "light",
          accentColor: "#04955c",
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
