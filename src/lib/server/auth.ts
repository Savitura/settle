import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let client: PrivyClient | null = null;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(request: NextRequest, limit = 120, windowMs = 60_000) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || "unknown";
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new ApiError(429, "Too many requests. Try again shortly.");
  if (attempts.size > 10_000) for (const [entry, value] of Array.from(attempts.entries())) if (value.resetAt <= now) attempts.delete(entry);
}

function getPrivyClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new ApiError(503, "Authentication service is not configured");
  client ??= new PrivyClient(appId, appSecret);
  return client;
}

export async function authenticateRequest(request: NextRequest) {
  enforceRateLimit(request);
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new ApiError(401, "Sign in required");
  try {
    const privy = getPrivyClient();
    const claims = await privy.verifyAuthToken(authorization);
    const user = await privy.getUserById(claims.userId);
    const wallet = user.wallet ?? user.linkedAccounts.find(
      (account) => account.type === "wallet" && account.chainType === "ethereum"
    );
    if (!wallet || !("address" in wallet)) throw new ApiError(403, "An embedded Ethereum wallet is required");
    return { userId: claims.userId, walletAddress: wallet.address.toLowerCase() };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Session expired or invalid");
  }
}

export function apiErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  const incidentId = crypto.randomUUID();
  console.error(JSON.stringify({ level: "error", event: "api_error", incidentId, message: fallback, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() }));
  return NextResponse.json({ error: fallback, incidentId }, { status: 500, headers: { "x-incident-id": incidentId } });
}

export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
