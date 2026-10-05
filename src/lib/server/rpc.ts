import { createPublicClient, fallback, http } from "viem";

import { monadTestnet } from "@/lib/monad";
import { ApiError } from "./auth";

function configuredRpcUrls(): string[] {
  const urls = [
    process.env.MONAD_RPC_URL,
    process.env.NEXT_PUBLIC_MONAD_RPC_URL,
    ...(process.env.MONAD_RPC_FALLBACK_URLS || "").split(","),
  ]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

export function getMonadTransport() {
  const urls = configuredRpcUrls();
  if (urls.length === 0) throw new ApiError(503, "Monad RPC service is not configured");

  const transports = urls.map((url) => http(url, {
    timeout: 15_000,
    retryCount: 2,
    retryDelay: 250,
  }));

  return transports.length === 1 ? transports[0] : fallback(transports);
}

export function getMonadPublicClient() {
  return createPublicClient({ chain: monadTestnet, transport: getMonadTransport() });
}
