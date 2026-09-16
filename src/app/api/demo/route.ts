import { NextRequest, NextResponse } from "next/server";
import { eq, like, and, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

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
    console.error("Error deleting demo data:", error);
    return NextResponse.json(
      { error: "Failed to delete demo data" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

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
    console.error("Error checking demo data:", error);
    return NextResponse.json(
      { error: "Failed to check demo data" },
      { status: 500 }
    );
  }
}
