import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createWalletClient, encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getDb, schema } from "@/lib/db/connection";
import { monadTestnet } from "@/lib/monad";
import { ApiError, apiErrorResponse, authenticateRequest } from "@/lib/server/auth";
import { getMonadPublicClient, getMonadTransport } from "@/lib/server/rpc";

export async function POST(request: NextRequest) {
  let claimId: string | undefined;
  let submittedHash: `0x${string}` | undefined;
  try {
    if (process.env.ENABLE_TESTNET_FAUCET !== "true" || !monadTestnet.testnet) {
      throw new ApiError(404, "Demo funding is not available");
    }

    const auth = await authenticateRequest(request);
    const privateKey = process.env.TESTNET_FAUCET_PRIVATE_KEY as `0x${string}` | undefined;
    const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}` | undefined;
    const configuredAmount = Number(process.env.TESTNET_FAUCET_USDC_AMOUNT || "25");
    if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) throw new ApiError(503, "Demo funding wallet is not configured");
    if (!tokenAddress || /^0x0{40}$/i.test(tokenAddress)) throw new ApiError(503, "Demo funds aren't set up right now");
    if (!Number.isFinite(configuredAmount) || configuredAmount <= 0 || configuredAmount > 100) {
      throw new ApiError(503, "Demo funds aren't set up right now");
    }

    const db = getDb();
    const walletAddress = auth.walletAddress.toLowerCase();
    const existing = await db.query.testnetFaucetClaims.findFirst({
      where: eq(schema.testnetFaucetClaims.walletAddress, walletAddress),
    });
    if (existing) throw new ApiError(429, "This wallet has already received demo funds");

    claimId = randomUUID();
    await db.insert(schema.testnetFaucetClaims).values({
      id: claimId,
      walletAddress,
      amountUsdc: configuredAmount.toString(),
    });

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain: monadTestnet, transport: getMonadTransport() });
    const hash = await walletClient.sendTransaction({
      account,
      chain: monadTestnet,
      to: tokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [walletAddress as `0x${string}`, parseUnits(configuredAmount.toFixed(6), 6)],
      }),
    });
    submittedHash = hash;
    await db.update(schema.testnetFaucetClaims).set({ txHash: hash }).where(eq(schema.testnetFaucetClaims.id, claimId));

    const receipt = await getMonadPublicClient().waitForTransactionReceipt({ hash, confirmations: 1, timeout: 60_000 });
    if (receipt.status !== "success") throw new Error("Demo funding transaction failed");

    return NextResponse.json({ amountUsdc: configuredAmount.toString(), txHash: hash }, { status: 201 });
  } catch (error) {
    if (claimId && !submittedHash) {
      try {
        await getDb().delete(schema.testnetFaucetClaims).where(eq(schema.testnetFaucetClaims.id, claimId));
      } catch (cleanupError) {
        console.error("Failed to release faucet claim", cleanupError);
      }
    }
    return apiErrorResponse(error, "Demo funding failed");
  }
}
