import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest, sameAddress } from "@/lib/server/auth";
import { notify, recordAudit } from "@/lib/server/operations";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rotate_invite"), groupId: z.string().min(1) }),
  z.object({ action: z.literal("remove_member"), groupId: z.string().min(1), memberId: z.string().min(1) }),
  z.object({ action: z.literal("leave"), groupId: z.string().min(1) }),
  z.object({ action: z.literal("rename"), groupId: z.string().min(1), name: z.string().trim().min(1).max(50) }),
]);

/** Members with unpaid requests (either way) would leave those requests stranded, so they must be cleared first. */
async function hasOpenRequests(db: ReturnType<typeof getDb>, groupId: string, walletAddress: string) {
  const open = await db.query.moneyRequests.findFirst({
    where: and(
      eq(schema.moneyRequests.groupId, groupId),
      eq(schema.moneyRequests.status, "pending"),
      sql`(LOWER(${schema.moneyRequests.fromAddress}) = LOWER(${walletAddress}) OR LOWER(${schema.moneyRequests.toAddress}) = LOWER(${walletAddress}))`
    ),
  });
  return !!open;
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const input = inputSchema.parse(await request.json());
    const db = getDb();
    const group = await db.query.groups.findFirst({ where: eq(schema.groups.id, input.groupId) });
    if (!group) throw new ApiError(404, "Family wallet not found");
    const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, input.groupId) });
    const actor = members.find((member) => sameAddress(member.walletAddress, auth.walletAddress));
    if (!actor) throw new ApiError(403, "You are not a member of this family wallet");
    const isOwner = sameAddress(group.createdBy, auth.walletAddress) || actor.role === "owner";

    if (input.action === "rotate_invite") {
      if (!isOwner) throw new ApiError(403, "Only the owner can replace the invite code");
      let code = inviteCode();
      for (let i = 0; i < 5; i++) {
        const used = await db.query.groups.findFirst({ where: sql`UPPER(${schema.groups.inviteCode}) = UPPER(${code})` });
        if (!used) break;
        code = inviteCode();
      }
      await db.update(schema.groups).set({ inviteCode: code }).where(eq(schema.groups.id, input.groupId));
      await recordAudit(auth.walletAddress, "group.invite_rotated", "group", input.groupId);
      return NextResponse.json({ inviteCode: code });
    }

    if (input.action === "rename") {
      if (!isOwner) throw new ApiError(403, "Only the owner can rename this family wallet");
      if (input.name === group.name) return NextResponse.json({ success: true, name: group.name });
      await db.update(schema.groups).set({ name: input.name }).where(eq(schema.groups.id, input.groupId));
      await Promise.all([
        recordAudit(auth.walletAddress, "group.renamed", "group", input.groupId, { from: group.name, to: input.name }),
        ...members
          .filter((member) => !sameAddress(member.walletAddress, auth.walletAddress))
          .map((member) => notify(member.walletAddress, "group_renamed", "Wallet renamed", `${group.name} is now called ${input.name}.`, input.groupId)),
      ]);
      return NextResponse.json({ success: true, name: input.name });
    }

    if (input.action === "remove_member") {
      if (!isOwner) throw new ApiError(403, "Only the owner can remove members");
      const target = members.find((member) => member.id === input.memberId);
      if (!target) throw new ApiError(404, "Member not found");
      if (sameAddress(target.walletAddress, group.createdBy)) throw new ApiError(409, "The owner cannot be removed");
      if (Number(target.balanceUsdc) !== 0) throw new ApiError(409, "Settle this member's balance before removing them");
      if (await hasOpenRequests(db, input.groupId, target.walletAddress)) {
        throw new ApiError(409, "Pay, decline or cancel their open requests before removing them");
      }
      await db.delete(schema.groupMembers).where(and(eq(schema.groupMembers.id, target.id), eq(schema.groupMembers.groupId, input.groupId)));
      await notify(target.walletAddress, "group_removed", "Removed from family wallet", `You were removed from ${group.name}.`);
      await recordAudit(auth.walletAddress, "group.member_removed", "group", input.groupId, { memberId: target.id });
      return NextResponse.json({ success: true });
    }

    if (isOwner) throw new ApiError(409, "Transfer ownership or remove the wallet before leaving");
    if (Number(actor.balanceUsdc) !== 0) throw new ApiError(409, "Settle your balance before leaving");
    if (await hasOpenRequests(db, input.groupId, actor.walletAddress)) {
      throw new ApiError(409, "Pay, decline or cancel your open requests before leaving");
    }
    await db.delete(schema.groupMembers).where(eq(schema.groupMembers.id, actor.id));
    await recordAudit(auth.walletAddress, "group.member_left", "group", input.groupId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid group action" }, { status: 400 });
    return apiErrorResponse(error, "Group action failed");
  }
}
