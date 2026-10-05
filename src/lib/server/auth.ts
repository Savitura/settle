import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest, NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let client: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new ApiError(503, "Authentication service is not configured");
  client ??= new PrivyClient(appId, appSecret);
  return client;
}

export async function authenticateRequest(request: NextRequest) {
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
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
