import { NextRequest, NextResponse } from "next/server";
import { eq, or, and, sql, desc } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const walletAddress = searchParams.get("wallet");
    const requestId = searchParams.get("id");
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const db = getDb();

    if (requestId) {
      const req = await db.query.moneyRequests.findFirst({
        where: eq(schema.moneyRequests.id, requestId),
      });
      return NextResponse.json({
        request: req
          ? {
              ...req,
              createdAt: req.createdAt.toISOString(),
              settledAt: req.settledAt?.toISOString() || null,
            }
          : null,
      });
    }

    if (groupId && walletAddress && pendingOnly) {
      const requests = await db.query.moneyRequests.findMany({
        where: and(
          eq(schema.moneyRequests.groupId, groupId),
          eq(schema.moneyRequests.status, "pending"),
          sql`LOWER(${schema.moneyRequests.toAddress}) = LOWER(${walletAddress})`
        ),
        orderBy: [desc(schema.moneyRequests.createdAt)],
      });
      return NextResponse.json({
        requests: requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          settledAt: r.settledAt?.toISOString() || null,
        })),
      });
    }

    if (groupId) {
      const requests = await db.query.moneyRequests.findMany({
        where: eq(schema.moneyRequests.groupId, groupId),
        orderBy: [desc(schema.moneyRequests.createdAt)],
      });
      return NextResponse.json({
        requests: requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          settledAt: r.settledAt?.toISOString() || null,
        })),
      });
    }

    if (walletAddress) {
      const requests = await db.query.moneyRequests.findMany({
        where: or(
          sql`LOWER(${schema.moneyRequests.fromAddress}) = LOWER(${walletAddress})`,
          sql`LOWER(${schema.moneyRequests.toAddress}) = LOWER(${walletAddress})`
        ),
        orderBy: [desc(schema.moneyRequests.createdAt)],
      });
      return NextResponse.json({
        requests: requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          settledAt: r.settledAt?.toISOString() || null,
        })),
      });
    }

    return NextResponse.json(
      { error: "Group ID or wallet address required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, fromAddress, toAddress, amountUsdc, amountNgn, note } = body;

    if (!groupId || !fromAddress || !toAddress || !amountUsdc || !amountNgn) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date();

    await db.insert(schema.moneyRequests).values({
      id,
      groupId,
      fromAddress,
      toAddress,
      amountUsdc,
      amountNgn,
      note: note || null,
      status: "pending",
      createdAt: now,
    });

    return NextResponse.json({
      request: {
        id,
        groupId,
        fromAddress,
        toAddress,
        amountUsdc,
        amountNgn,
        note: note || null,
        status: "pending",
        createdAt: now.toISOString(),
        settledAt: null,
        settledTxId: null,
      },
    });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, settledTxId } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const existing = await db.query.moneyRequests.findFirst({
      where: eq(schema.moneyRequests.id, requestId),
    });

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updateData: { status: string; settledAt?: Date; settledTxId?: string } = { status };

    if (status === "paid" && settledTxId) {
      updateData.settledAt = new Date();
      updateData.settledTxId = settledTxId;
    }

    await db
      .update(schema.moneyRequests)
      .set(updateData)
      .where(eq(schema.moneyRequests.id, requestId));

    const updated = await db.query.moneyRequests.findFirst({
      where: eq(schema.moneyRequests.id, requestId),
    });

    return NextResponse.json({
      request: updated
        ? {
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            settledAt: updated.settledAt?.toISOString() || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}
