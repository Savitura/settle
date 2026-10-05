import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { decodeEventLog, erc20Abi, parseUnits } from "viem";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";
import { getMonadPublicClient } from "@/lib/server/rpc";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const transferSchema = z.object({
  groupId: z.string().min(1).max(128),
  toAddress: address,
  amountNgn: z.string().regex(/^\d{1,12}$/),
  note: z.string().trim().max(120).optional(),
  requestId: z.string().min(1).max(128).optional(),
  idempotencyKey: z.string().min(16).max(80).optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const input = transferSchema.parse(await request.json());
    if (sameAddress(auth.walletAddress, input.toAddress)) throw new ApiError(400, "You cannot send money to yourself");

    const amountNgn = BigInt(input.amountNgn);
    if (amountNgn <= BigInt(0)) throw new ApiError(400, "Amount must be greater than zero");
    const configuredRate = Number(process.env.NGN_PER_USDC);
    if (!Number.isFinite(configuredRate) || configuredRate <= 0) throw new ApiError(503, "Settlement quote is not configured");
    const amountUsdc = (Number(amountNgn) / configuredRate).toFixed(6);
    const id = randomUUID();
    const idempotencyKey = input.idempotencyKey ?? input.txHash ?? request.headers.get("idempotency-key") ?? randomUUID();
    const isDemo = process.env.ENABLE_DEMO_MODE === "true";
    if (!input.txHash && !isDemo) throw new ApiError(400, "A confirmed USDC transaction is required");
    if (input.txHash) await verifyUsdcTransfer(input.txHash as `0x${string}`, auth.walletAddress, input.toAddress, amountUsdc);
    const txHash = input.txHash ?? `demo-ledger:${id}`;
    const now = new Date();
    const db = getDb();

    const existing = await db.query.transactions.findFirst({
      where: eq(schema.transactions.idempotencyKey, idempotencyKey),
    });
    if (existing) return NextResponse.json({ transaction: serialize(existing) });

    const members = await db.query.groupMembers.findMany({
      where: eq(schema.groupMembers.groupId, input.groupId),
    });
    const sender = members.find((m) => sameAddress(m.walletAddress, auth.walletAddress));
    const recipient = members.find((m) => sameAddress(m.walletAddress, input.toAddress));
    if (!sender || !recipient) throw new ApiError(403, "Both people must belong to this family wallet");

    if (input.requestId) {
      const moneyRequest = await db.query.moneyRequests.findFirst({
          where: and(eq(schema.moneyRequests.id, input.requestId), eq(schema.moneyRequests.groupId, input.groupId)),
      });
      if (!moneyRequest || moneyRequest.status !== "pending") throw new ApiError(409, "This request is no longer payable");
      if (!sameAddress(moneyRequest.toAddress, auth.walletAddress) || !sameAddress(moneyRequest.fromAddress, input.toAddress)) {
        throw new ApiError(403, "This request is not assigned to you");
      }
      if (moneyRequest.amountNgn !== input.amountNgn) throw new ApiError(409, "The request amount has changed");
    }

    await db.execute(sql`
      WITH debit AS (
        UPDATE group_members
        SET balance_usdc = (CAST(balance_usdc AS numeric) - CAST(${amountUsdc} AS numeric))::text
        WHERE id = ${sender.id}
          AND CAST(balance_usdc AS numeric) >= CAST(${amountUsdc} AS numeric)
          AND NOT EXISTS (SELECT 1 FROM transactions WHERE idempotency_key = ${idempotencyKey})
        RETURNING id
      ), credit AS (
        UPDATE group_members
        SET balance_usdc = (CAST(balance_usdc AS numeric) + CAST(${amountUsdc} AS numeric))::text
        WHERE id = ${recipient.id} AND EXISTS (SELECT 1 FROM debit)
        RETURNING id
      ), created AS (
        INSERT INTO transactions (id, group_id, type, from_address, to_address, amount_usdc, amount_ngn, tx_hash, status, idempotency_key, note, created_at)
        SELECT ${id}, ${input.groupId}, ${input.requestId ? "settle" : "send"}, ${auth.walletAddress}, ${recipient.walletAddress},
               ${amountUsdc}, ${input.amountNgn}, ${txHash}, 'confirmed', ${idempotencyKey}, ${input.note || null}, ${now}
        WHERE EXISTS (SELECT 1 FROM debit) AND EXISTS (SELECT 1 FROM credit)
          AND (${input.requestId ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM money_requests
            WHERE id = ${input.requestId ?? null} AND status = 'pending'
          ))
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      )
      UPDATE money_requests
      SET status = 'paid', settled_at = ${now}, settled_tx_id = ${id}
      WHERE id = ${input.requestId ?? null} AND status = 'pending' AND EXISTS (SELECT 1 FROM created)
    `);

    const transaction = await db.query.transactions.findFirst({ where: eq(schema.transactions.idempotencyKey, idempotencyKey) });
    if (!transaction) throw new ApiError(409, "Insufficient balance or duplicate transfer");

    return NextResponse.json({ transaction: serialize(transaction) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid transfer details" }, { status: 400 });
    return apiErrorResponse(error, "Transfer failed");
  }
}

function serialize(transaction: typeof schema.transactions.$inferSelect) {
  return { ...transaction, createdAt: transaction.createdAt.toISOString() };
}

async function verifyUsdcTransfer(txHash: `0x${string}`, from: string, to: string, amountUsdc: string) {
  const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!tokenAddress || /^0x0{40}$/i.test(tokenAddress)) throw new ApiError(503, "USDC settlement is not configured");
  const client = getMonadPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, confirmations: 1, timeout: 60_000 });
  if (receipt.status !== "success") throw new ApiError(409, "The USDC transaction failed");

  const expected = parseUnits(amountUsdc, 6);
  const matched = receipt.logs.some((log) => {
    if (!sameAddress(log.address, tokenAddress)) return false;
    try {
      const decoded = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: log.data, topics: log.topics });
      return sameAddress(decoded.args.from, from) && sameAddress(decoded.args.to, to) && decoded.args.value === expected;
    } catch {
      return false;
    }
  });
  if (!matched) throw new ApiError(409, "The transaction does not match this transfer");
}
