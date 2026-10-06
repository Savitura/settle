import { NextRequest, NextResponse } from "next/server";
import { eq, or, and, sql, desc } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@/lib/db/connection";
import { formatNgn } from "@/lib/currency";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";
import { notify, recordAudit } from "@/lib/server/operations";

const editSchema = z.object({
  action: z.literal("edit"),
  requestId: z.string().min(1).max(128),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountNgn: z.string().regex(/^\d{1,12}$/),
  note: z.string().trim().max(120).nullable().optional(),
});

function serializeRequest(r: typeof schema.moneyRequests.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    settledAt: r.settledAt?.toISOString() || null,
  };
}

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

    if (body?.action === "edit") {
      return await editRequest(auth.walletAddress, editSchema.parse(body));
    }

    const { requestId, status } = body;

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
    if (status !== "declined" && status !== "cancelled") throw new ApiError(400, "Unsupported request status");
    if (!sameAddress(existing.toAddress, auth.walletAddress) && !sameAddress(existing.fromAddress, auth.walletAddress)) {
      throw new ApiError(403, "You cannot update this request");
    }
    if (status === "declined" && !sameAddress(existing.toAddress, auth.walletAddress)) throw new ApiError(403, "Only the payer can decline");
    if (status === "cancelled" && !sameAddress(existing.fromAddress, auth.walletAddress)) throw new ApiError(403, "Only the requester can cancel");
    if (existing.status !== "pending") throw new ApiError(409, "This request has already been paid, declined or cancelled");

    // Only flip it while it is still pending, so a payment that lands at the same moment wins.
    const changed = await db
      .update(schema.moneyRequests)
      .set({ status })
      .where(and(eq(schema.moneyRequests.id, requestId), eq(schema.moneyRequests.status, "pending")))
      .returning({ id: schema.moneyRequests.id });
    if (changed.length === 0) throw new ApiError(409, "This request was just paid or closed");

    const otherWallet = sameAddress(existing.fromAddress, auth.walletAddress) ? existing.toAddress : existing.fromAddress;
    await Promise.all([
      notify(otherWallet, `request_${status}`, `Request ${status}`, `A money request was ${status}.`, existing.groupId),
      recordAudit(auth.walletAddress, `request.${status}`, "money_request", requestId),
    ]);

    const updated = await db.query.moneyRequests.findFirst({
      where: eq(schema.moneyRequests.id, requestId),
    });

    return NextResponse.json({
      request: updated ? serializeRequest(updated) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request details" }, { status: 400 });
    return apiErrorResponse(error, "Failed to update request");
  }
}

/** The requester can change amount, note or who it's for while the request is still pending. */
async function editRequest(walletAddress: string, input: z.infer<typeof editSchema>) {
  const db = getDb();
  const existing = await db.query.moneyRequests.findFirst({
    where: eq(schema.moneyRequests.id, input.requestId),
  });
  if (!existing) throw new ApiError(404, "Request not found");
  if (!sameAddress(existing.fromAddress, walletAddress)) throw new ApiError(403, "Only the person who asked can change this request");
  if (existing.status !== "pending") throw new ApiError(409, "This request has already been paid, declined or cancelled");
  if (BigInt(input.amountNgn) <= BigInt(0)) throw new ApiError(400, "Amount must be greater than zero");
  if (sameAddress(input.toAddress, walletAddress)) throw new ApiError(400, "You can't ask yourself for money");

  const configuredRate = Number(process.env.NGN_PER_USDC);
  if (!Number.isFinite(configuredRate) || configuredRate <= 0) throw new ApiError(503, "Settlement quote is not configured");

  const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, existing.groupId) });
  const recipient = members.find((m) => sameAddress(m.walletAddress, input.toAddress));
  if (!members.some((m) => sameAddress(m.walletAddress, walletAddress)) || !recipient) {
    throw new ApiError(403, "Both people must belong to this family wallet");
  }

  const amountUsdc = (Number(input.amountNgn) / configuredRate).toFixed(6);
  const note = input.note ? input.note : null;

  const rows = await db
    .update(schema.moneyRequests)
    .set({ toAddress: recipient.walletAddress, amountNgn: input.amountNgn, amountUsdc, note })
    .where(and(eq(schema.moneyRequests.id, existing.id), eq(schema.moneyRequests.status, "pending")))
    .returning();
  const updated = rows[0];
  if (!updated) throw new ApiError(409, "This request was just paid or closed");

  const amountLabel = formatNgn(Number(input.amountNgn));
  const recipientChanged = !sameAddress(existing.toAddress, recipient.walletAddress);
  const tasks: Promise<void>[] = [
    recordAudit(walletAddress, "request.edited", "money_request", existing.id, {
      groupId: existing.groupId,
      before: { toAddress: existing.toAddress, amountNgn: existing.amountNgn, note: existing.note },
      after: { toAddress: recipient.walletAddress, amountNgn: input.amountNgn, note },
    }),
  ];
  if (recipientChanged) {
    tasks.push(notify(existing.toAddress, "request_cancelled", "Request cancelled", "A money request to you was withdrawn. Nothing to pay.", existing.groupId));
    tasks.push(notify(recipient.walletAddress, "money_request", "New money request", `${amountLabel} was requested from you.`, existing.groupId));
  } else {
    tasks.push(notify(recipient.walletAddress, "request_edited", "Request updated", `A money request to you is now ${amountLabel}.`, existing.groupId));
  }
  await Promise.all(tasks);

  return NextResponse.json({ request: serializeRequest(updated) });
}
