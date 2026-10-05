import { NextRequest, NextResponse } from "next/server";
import { eq, or, and, sql, desc } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";
import { notify, recordAudit } from "@/lib/server/operations";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
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
      if (req && !sameAddress(req.fromAddress, auth.walletAddress) && !sameAddress(req.toAddress, auth.walletAddress)) {
        throw new ApiError(403, "You cannot view this request");
      }
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
          sql`LOWER(${schema.moneyRequests.toAddress}) = LOWER(${auth.walletAddress})`
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
      const member = await db.query.groupMembers.findFirst({
        where: sql`${schema.groupMembers.groupId} = ${groupId} AND LOWER(${schema.groupMembers.walletAddress}) = LOWER(${auth.walletAddress})`,
      });
      if (!member) throw new ApiError(403, "You are not a member of this family wallet");
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
          sql`LOWER(${schema.moneyRequests.fromAddress}) = LOWER(${auth.walletAddress})`,
          sql`LOWER(${schema.moneyRequests.toAddress}) = LOWER(${auth.walletAddress})`
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
    return apiErrorResponse(error, "Failed to fetch requests");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body = await request.json();
    const { groupId, toAddress, amountUsdc, amountNgn, note } = body;
    const fromAddress = auth.walletAddress;

    if (!groupId || !fromAddress || !toAddress || !amountUsdc || !amountNgn) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress) || !/^\d{1,12}$/.test(amountNgn)) {
      throw new ApiError(400, "Invalid request details");
    }
    const configuredRate = Number(process.env.NGN_PER_USDC);
    if (!Number.isFinite(configuredRate) || configuredRate <= 0) throw new ApiError(503, "Settlement quote is not configured");
    const authoritativeUsdc = (Number(amountNgn) / configuredRate).toFixed(6);

    const db = getDb();
    const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, groupId) });
    if (!members.some((m) => sameAddress(m.walletAddress, fromAddress)) || !members.some((m) => sameAddress(m.walletAddress, toAddress))) {
      throw new ApiError(403, "Both people must belong to this family wallet");
    }
    const id = generateId();
    const now = new Date();

    await db.insert(schema.moneyRequests).values({
      id,
      groupId,
      fromAddress,
      toAddress,
      amountUsdc: authoritativeUsdc,
      amountNgn,
      note: note || null,
      status: "pending",
      createdAt: now,
    });

    await Promise.all([
      notify(toAddress, "money_request", "New money request", `${amountNgn} NGN was requested from you.`, groupId),
      recordAudit(auth.walletAddress, "request.created", "money_request", id, { groupId, toAddress, amountNgn }),
    ]);

    return NextResponse.json({
      request: {
        id,
        groupId,
        fromAddress,
        toAddress,
        amountUsdc: authoritativeUsdc,
        amountNgn,
        note: note || null,
        status: "pending",
        createdAt: now.toISOString(),
        settledAt: null,
        settledTxId: null,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to create request");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
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
    if (status === "paid") throw new ApiError(400, "Pay requests through the transfer flow");
    if (!sameAddress(existing.toAddress, auth.walletAddress) && !sameAddress(existing.fromAddress, auth.walletAddress)) {
      throw new ApiError(403, "You cannot update this request");
    }
    if (status === "declined" && !sameAddress(existing.toAddress, auth.walletAddress)) throw new ApiError(403, "Only the payer can decline");
    if (status === "cancelled" && !sameAddress(existing.fromAddress, auth.walletAddress)) throw new ApiError(403, "Only the requester can cancel");

    const updateData: { status: string; settledAt?: Date; settledTxId?: string } = { status };

    if (status === "paid" && settledTxId) {
      updateData.settledAt = new Date();
      updateData.settledTxId = settledTxId;
    }

    await db
      .update(schema.moneyRequests)
      .set(updateData)
      .where(eq(schema.moneyRequests.id, requestId));

    const otherWallet = sameAddress(existing.fromAddress, auth.walletAddress) ? existing.toAddress : existing.fromAddress;
    await Promise.all([
      notify(otherWallet, `request_${status}`, `Request ${status}`, `A money request was ${status}.`, existing.groupId),
      recordAudit(auth.walletAddress, `request.${status}`, "money_request", requestId),
    ]);

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
    return apiErrorResponse(error, "Failed to update request");
  }
}
