import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

interface MigrationGroup {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  inviteCode: string;
  members: Array<{
    id: string;
    walletAddress: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    joinedAt: string;
    balance: {
      usdc: string;
      usdcFormatted: string;
    };
  }>;
  totalBalance: {
    usdc: string;
    usdcFormatted: string;
  };
}

interface MigrationTransaction {
  id: string;
  groupId: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  amountUsdc: string;
  amountNgn: string;
  txHash: string;
  status: string;
  note?: string;
  createdAt: string;
}

interface MigrationRequest {
  id: string;
  groupId: string;
  fromAddress: string;
  toAddress: string;
  amountUsdc: string;
  amountNgn: string;
  note?: string;
  status: string;
  createdAt: string;
  settledAt?: string;
  settledTxId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groups, transactions, requests } = body as {
      groups?: MigrationGroup[];
      transactions?: MigrationTransaction[];
      requests?: MigrationRequest[];
    };

    const db = getDb();
    const imported = {
      groups: 0,
      members: 0,
      transactions: 0,
      requests: 0,
    };
    const skipped = {
      groups: 0,
      transactions: 0,
      requests: 0,
    };

    if (groups && groups.length > 0) {
      for (const group of groups) {
        const existing = await db.query.groups.findFirst({
          where: eq(schema.groups.id, group.id),
        });

        if (existing) {
          skipped.groups++;
          continue;
        }

        await db.insert(schema.groups).values({
          id: group.id,
          name: group.name,
          createdAt: new Date(group.createdAt),
          createdBy: group.createdBy,
          inviteCode: group.inviteCode,
          totalBalanceUsdc: group.totalBalance.usdc,
        });
        imported.groups++;

        for (const member of group.members) {
          const existingMember = await db.query.groupMembers.findFirst({
            where: eq(schema.groupMembers.id, member.id),
          });

          if (existingMember) {
            continue;
          }

          await db.insert(schema.groupMembers).values({
            id: member.id,
            groupId: group.id,
            walletAddress: member.walletAddress,
            displayName: member.displayName,
            email: member.email,
            phone: member.phone,
            joinedAt: new Date(member.joinedAt),
            balanceUsdc: member.balance.usdc,
          });
          imported.members++;
        }
      }
    }

    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        const existing = await db.query.transactions.findFirst({
          where: eq(schema.transactions.id, tx.id),
        });

        if (existing) {
          skipped.transactions++;
          continue;
        }

        await db.insert(schema.transactions).values({
          id: tx.id,
          groupId: tx.groupId,
          type: tx.type,
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          amountUsdc: tx.amountUsdc,
          amountNgn: tx.amountNgn,
          txHash: tx.txHash,
          status: tx.status,
          note: tx.note || null,
          createdAt: new Date(tx.createdAt),
        });
        imported.transactions++;
      }
    }

    if (requests && requests.length > 0) {
      for (const req of requests) {
        const existing = await db.query.moneyRequests.findFirst({
          where: eq(schema.moneyRequests.id, req.id),
        });

        if (existing) {
          skipped.requests++;
          continue;
        }

        await db.insert(schema.moneyRequests).values({
          id: req.id,
          groupId: req.groupId,
          fromAddress: req.fromAddress,
          toAddress: req.toAddress,
          amountUsdc: req.amountUsdc,
          amountNgn: req.amountNgn,
          note: req.note || null,
          status: req.status,
          createdAt: new Date(req.createdAt),
          settledAt: req.settledAt ? new Date(req.settledAt) : null,
          settledTxId: req.settledTxId || null,
        });
        imported.requests++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
    });
  } catch (error) {
    console.error("Error migrating data:", error);
    return NextResponse.json(
      { error: "Failed to migrate data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
