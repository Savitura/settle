import { NextRequest, NextResponse } from "next/server";
import { eq, or, sql, desc } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const walletAddress = searchParams.get("wallet");
    const txHash = searchParams.get("txHash");

    const db = getDb();

    if (txHash) {
      const tx = await db.query.transactions.findFirst({
        where: eq(schema.transactions.txHash, txHash),
      });
      return NextResponse.json({ transaction: tx || null });
    }

    if (groupId) {
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
          sql`LOWER(${schema.transactions.fromAddress}) = LOWER(${walletAddress})`,
          sql`LOWER(${schema.transactions.toAddress}) = LOWER(${walletAddress})`
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
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, type, fromAddress, toAddress, amountUsdc, amountNgn, txHash, status, note } = body;

    if (!groupId || !type || !fromAddress || !toAddress || !amountUsdc || !amountNgn || !txHash || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date();

    await db.insert(schema.transactions).values({
      id,
      groupId,
      type,
      fromAddress,
      toAddress,
      amountUsdc,
      amountNgn,
      txHash,
      status,
      note: note || null,
      createdAt: now,
    });

    return NextResponse.json({
      transaction: {
        id,
        groupId,
        type,
        fromAddress,
        toAddress,
        amountUsdc,
        amountNgn,
        txHash,
        status,
        note: note || null,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
