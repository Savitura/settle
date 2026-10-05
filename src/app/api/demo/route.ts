import { NextRequest, NextResponse } from "next/server";
import { eq, like, and, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (process.env.ENABLE_DEMO_MODE !== "true") throw new ApiError(404, "Demo mode is disabled");
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }
    if (!sameAddress(walletAddress, auth.walletAddress)) throw new ApiError(403, "Invalid wallet");

    const db = getDb();

    const demoGroups = await db.query.groups.findMany({
      where: and(
        like(schema.groups.id, "demo-%"),
        sql`EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = groups.id 
          AND LOWER(group_members.wallet_address) = LOWER(${walletAddress})
        )`
      ),
    });

    if (demoGroups.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: { groups: 0, transactions: 0, requests: 0 },
      });
    }

    const groupIds = demoGroups.map((g) => g.id);

    let deletedTransactions = 0;
    let deletedRequests = 0;

    for (const groupId of groupIds) {
      const txResult = await db
        .delete(schema.transactions)
        .where(eq(schema.transactions.groupId, groupId));
      deletedTransactions += txResult.rowCount ?? 0;

      const reqResult = await db
        .delete(schema.moneyRequests)
        .where(eq(schema.moneyRequests.groupId, groupId));
      deletedRequests += reqResult.rowCount ?? 0;

      await db
        .delete(schema.groupMembers)
        .where(eq(schema.groupMembers.groupId, groupId));

      await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
    }

    return NextResponse.json({
      success: true,
      deleted: {
        groups: groupIds.length,
        transactions: deletedTransactions,
        requests: deletedRequests,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete demo data");
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (process.env.ENABLE_DEMO_MODE !== "true") throw new ApiError(404, "Demo mode is disabled");
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }
    if (!sameAddress(walletAddress, auth.walletAddress)) throw new ApiError(403, "Invalid wallet");

    const db = getDb();

    const demoGroups = await db.query.groups.findMany({
      where: and(
        like(schema.groups.id, "demo-%"),
        sql`EXISTS (
          SELECT 1 FROM group_members 
          WHERE group_members.group_id = groups.id 
          AND LOWER(group_members.wallet_address) = LOWER(${walletAddress})
        )`
      ),
    });

    return NextResponse.json({
      hasDemoGroups: demoGroups.length > 0,
      demoGroupCount: demoGroups.length,
    });
  } catch (error) {
    return apiErrorResponse(error, "Failed to check demo data");
  }
}
