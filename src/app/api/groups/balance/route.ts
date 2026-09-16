import { NextRequest, NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, walletAddress, usdcBalance, seedMock } = body;

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    const db = getDb();

    const group = await db.query.groups.findFirst({
      where: eq(schema.groups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const members = await db.query.groupMembers.findMany({
      where: eq(schema.groupMembers.groupId, groupId),
    });

    if (seedMock) {
      const mockBalances = ["125.50", "78.25", "210.00"];
      
      for (let i = 0; i < members.length; i++) {
        const balance = mockBalances[i % mockBalances.length];
        await db
          .update(schema.groupMembers)
          .set({ balanceUsdc: balance })
          .where(eq(schema.groupMembers.id, members[i].id));
        members[i].balanceUsdc = balance;
      }

      let totalUsdc = 0;
      for (const member of members) {
        totalUsdc += parseFloat(member.balanceUsdc) || 0;
      }

      await db
        .update(schema.groups)
        .set({ totalBalanceUsdc: totalUsdc.toString() })
        .where(eq(schema.groups.id, groupId));

      return NextResponse.json({
        group: {
          ...group,
          totalBalanceUsdc: totalUsdc.toString(),
          totalBalance: {
            usdc: totalUsdc.toString(),
            usdcFormatted: `$${totalUsdc.toFixed(2)}`,
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

    if (!walletAddress || usdcBalance === undefined) {
      return NextResponse.json(
        { error: "Wallet address and balance required" },
        { status: 400 }
      );
    }

    const memberIndex = members.findIndex(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );

    if (memberIndex === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await db
      .update(schema.groupMembers)
      .set({ balanceUsdc: usdcBalance })
      .where(
        and(
          eq(schema.groupMembers.groupId, groupId),
          sql`LOWER(${schema.groupMembers.walletAddress}) = LOWER(${walletAddress})`
        )
      );

    members[memberIndex].balanceUsdc = usdcBalance;

    let totalUsdc = 0;
    for (const member of members) {
      totalUsdc += parseFloat(member.balanceUsdc) || 0;
    }

    await db
      .update(schema.groups)
      .set({ totalBalanceUsdc: totalUsdc.toString() })
      .where(eq(schema.groups.id, groupId));

    return NextResponse.json({
      group: {
        ...group,
        totalBalanceUsdc: totalUsdc.toString(),
        totalBalance: {
          usdc: totalUsdc.toString(),
          usdcFormatted: `$${totalUsdc.toFixed(2)}`,
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
  } catch (error) {
    console.error("Error updating balance:", error);
    return NextResponse.json(
      { error: "Failed to update balance" },
      { status: 500 }
    );
  }
}
