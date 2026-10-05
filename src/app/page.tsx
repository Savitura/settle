"use client";

import { Suspense } from "react";
import { usePrivy, PrivyProvider } from "@privy-io/react-auth";

import { monadTestnet } from "@/lib/monad";
import { AppShell, LoginGate, LoadingScreen } from "@/components/AppShell";

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
      <Suspense fallback={<LoadingScreen />}>
        <AuthenticatedApp />
      </Suspense>
    </PrivyProvider>
  );
}

function AuthenticatedApp() {
  const { ready, authenticated, login, user, logout } = usePrivy();

  if (!ready) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return <LoginGate onLogin={login} />;
  }

  return <AppShell user={user} onLogout={logout} />;
}
