import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inviteCode, walletAddress, displayName, email, phone } = body;

    if (!inviteCode || !walletAddress) {
      return NextResponse.json(
        { error: "Invite code and wallet address required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const group = await db.query.groups.findFirst({
      where: sql`UPPER(${schema.groups.inviteCode}) = UPPER(${inviteCode})`,
    });

    if (!group) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    const members = await db.query.groupMembers.findMany({
      where: eq(schema.groupMembers.groupId, group.id),
    });

    const existingMember = members.find(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (existingMember) {
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

    if (members.length >= 3) {
      return NextResponse.json(
        { error: "Group is full (maximum 3 members)" },
        { status: 400 }
      );
    }

    const memberId = generateId();
    const now = new Date();

    await db.insert(schema.groupMembers).values({
      id: memberId,
      groupId: group.id,
      walletAddress,
      displayName: displayName || null,
      email: email || null,
      phone: phone || null,
      joinedAt: now,
      balanceUsdc: "0",
    });

    const updatedMembers = [...members, {
      id: memberId,
      groupId: group.id,
      walletAddress,
      displayName: displayName || null,
      email: email || null,
      phone: phone || null,
      joinedAt: now,
      balanceUsdc: "0",
    }];

    return NextResponse.json({
      group: {
        ...group,
        totalBalance: {
          usdc: group.totalBalanceUsdc,
          usdcFormatted: `$${parseFloat(group.totalBalanceUsdc).toFixed(2)}`,
        },
        members: updatedMembers.map((m) => ({
          id: m.id,
          walletAddress: m.walletAddress,
          displayName: m.displayName,
          email: m.email,
          phone: m.phone,
          joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
          balance: {
            usdc: m.balanceUsdc,
            usdcFormatted: `$${parseFloat(m.balanceUsdc).toFixed(2)}`,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
