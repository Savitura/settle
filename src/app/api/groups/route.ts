import { NextRequest, NextResponse } from "next/server";
import { eq, or, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueInviteCode(db: ReturnType<typeof getDb>, maxRetries = 5): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateInviteCode();
    const existing = await db.query.groups.findFirst({
      where: sql`UPPER(${schema.groups.inviteCode}) = UPPER(${code})`,
    });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Failed to generate unique invite code after multiple attempts");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const inviteCode = searchParams.get("inviteCode");
    const groupId = searchParams.get("id");

    const db = getDb();

    if (groupId) {
      const group = await db.query.groups.findFirst({
        where: eq(schema.groups.id, groupId),
      });

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      const members = await db.query.groupMembers.findMany({
        where: eq(schema.groupMembers.groupId, groupId),
      });

      return NextResponse.json({
        group: {
          ...group,
          totalBalance: {
            usdc: group.totalBalanceUsdc,
            usdcFormatted: `$${parseFloat(group.totalBalanceUsdc).toFixed(2)}`,
          },
          members: members.map((m) => ({
            id: m.id,
            walletAddress: m.walletAddress,
            displayName: m.displayName,
            email: m.email,
            phone: m.phone,
            joinedAt: m.joinedAt.toISOString(),
            balance: {
              usdc: m.balanceUsdc,
              usdcFormatted: `$${parseFloat(m.balanceUsdc).toFixed(2)}`,
            },
          })),
        },
      });
    }

    if (inviteCode) {
      const group = await db.query.groups.findFirst({
        where: sql`UPPER(${schema.groups.inviteCode}) = UPPER(${inviteCode})`,
      });

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      const members = await db.query.groupMembers.findMany({
        where: eq(schema.groupMembers.groupId, group.id),
      });

      return NextResponse.json({
        group: {
          ...group,
          totalBalance: {
            usdc: group.totalBalanceUsdc,
            usdcFormatted: `$${parseFloat(group.totalBalanceUsdc).toFixed(2)}`,
          },
          members: members.map((m) => ({
            id: m.id,
            walletAddress: m.walletAddress,
            displayName: m.displayName,
            email: m.email,
            phone: m.phone,
            joinedAt: m.joinedAt.toISOString(),
            balance: {
              usdc: m.balanceUsdc,
              usdcFormatted: `$${parseFloat(m.balanceUsdc).toFixed(2)}`,
            },
          })),
        },
      });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address or invite code required" }, { status: 400 });
    }

    const memberRows = await db.query.groupMembers.findMany({
      where: sql`LOWER(${schema.groupMembers.walletAddress}) = LOWER(${walletAddress})`,
    });

    const groupIds = memberRows.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupsData = await db.query.groups.findMany({
      where: or(...groupIds.map((id) => eq(schema.groups.id, id))),
    });

    const groups = await Promise.all(
      groupsData.map(async (group) => {
        const members = await db.query.groupMembers.findMany({
          where: eq(schema.groupMembers.groupId, group.id),
        });
        return {
          ...group,
          totalBalance: {
            usdc: group.totalBalanceUsdc,
            usdcFormatted: `$${parseFloat(group.totalBalanceUsdc).toFixed(2)}`,
          },
          members: members.map((m) => ({
            id: m.id,
            walletAddress: m.walletAddress,
            displayName: m.displayName,
            email: m.email,
            phone: m.phone,
            joinedAt: m.joinedAt.toISOString(),
            balance: {
              usdc: m.balanceUsdc,
              usdcFormatted: `$${parseFloat(m.balanceUsdc).toFixed(2)}`,
            },
          })),
        };
      })
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, creatorWalletAddress, creatorDisplayName, creatorEmail, creatorPhone } = body;

    if (!name || !creatorWalletAddress) {
      return NextResponse.json(
        { error: "Name and creator wallet address required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const groupId = generateId();
    const memberId = generateId();
    const inviteCode = await generateUniqueInviteCode(db);
    const now = new Date();

    await db.insert(schema.groups).values({
      id: groupId,
      name,
      createdAt: now,
      createdBy: creatorWalletAddress,
      inviteCode,
      totalBalanceUsdc: "0",
    });

    await db.insert(schema.groupMembers).values({
      id: memberId,
      groupId,
      walletAddress: creatorWalletAddress,
      displayName: creatorDisplayName || null,
      email: creatorEmail || null,
      phone: creatorPhone || null,
      joinedAt: now,
      balanceUsdc: "0",
    });

    return NextResponse.json({
      group: {
        id: groupId,
        name,
        createdAt: now.toISOString(),
        createdBy: creatorWalletAddress,
        inviteCode,
        totalBalance: { usdc: "0", usdcFormatted: "$0.00" },
        members: [
          {
            id: memberId,
            walletAddress: creatorWalletAddress,
            displayName: creatorDisplayName || null,
            email: creatorEmail || null,
            phone: creatorPhone || null,
            joinedAt: now.toISOString(),
            balance: { usdc: "0", usdcFormatted: "$0.00" },
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
