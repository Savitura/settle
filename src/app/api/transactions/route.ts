import { NextRequest, NextResponse } from "next/server";
import { eq, or, sql, desc } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const walletAddress = searchParams.get("wallet");
    const txHash = searchParams.get("txHash");

    const db = getDb();

    if (txHash) {
      const tx = await db.query.transactions.findFirst({
        where: eq(schema.transactions.txHash, txHash),
      });
      if (tx && !sameAddress(tx.fromAddress, auth.walletAddress) && !sameAddress(tx.toAddress, auth.walletAddress)) {
        throw new ApiError(403, "You cannot view this transaction");
      }
      return NextResponse.json({ transaction: tx || null });
    }

    if (groupId) {
      const member = await db.query.groupMembers.findFirst({
        where: sql`${schema.groupMembers.groupId} = ${groupId} AND LOWER(${schema.groupMembers.walletAddress}) = LOWER(${auth.walletAddress})`,
      });
      if (!member) throw new ApiError(403, "You are not a member of this family wallet");
      const transactions = await db.query.transactions.findMany({
        where: eq(schema.transactions.groupId, groupId),
        orderBy: [desc(schema.transactions.createdAt)],
      });
      return NextResponse.json({
        transactions: transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    }

    if (walletAddress) {
      const transactions = await db.query.transactions.findMany({
        where: or(
          sql`LOWER(${schema.transactions.fromAddress}) = LOWER(${auth.walletAddress})`,
          sql`LOWER(${schema.transactions.toAddress}) = LOWER(${auth.walletAddress})`
        ),
        orderBy: [desc(schema.transactions.createdAt)],
      });
      return NextResponse.json({
        transactions: transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    }

    return NextResponse.json(
      { error: "Group ID or wallet address required" },
      { status: 400 }
    );
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch transactions");
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
    return NextResponse.json({ error: "Use the protected transfer endpoint" }, { status: 405 });
  } catch (error) {
    return apiErrorResponse(error, "Authentication failed");
  }
}
