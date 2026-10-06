import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest } from "@/lib/server/auth";
import { recordAudit } from "@/lib/server/operations";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(50),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().max(255).nullable().optional(),
});

const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,18}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Names and contact details live on each group_members row. A person is one wallet,
 * so editing the profile updates every membership for that wallet at once.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const input = profileSchema.parse(await request.json());

    const changes: { displayName: string; phone?: string | null; email?: string | null } = {
      displayName: input.displayName,
    };
    if (input.phone !== undefined) {
      const phone = input.phone || null;
      if (phone && !PHONE_PATTERN.test(phone)) throw new ApiError(400, "Enter a valid phone number");
      changes.phone = phone;
    }
    if (input.email !== undefined) {
      const email = input.email || null;
      if (email && !EMAIL_PATTERN.test(email)) throw new ApiError(400, "Enter a valid email address");
      changes.email = email;
    }

    const updated = await getDb()
      .update(schema.groupMembers)
      .set(changes)
      .where(sql`LOWER(${schema.groupMembers.walletAddress}) = LOWER(${auth.walletAddress})`)
      .returning({ id: schema.groupMembers.id });

    await recordAudit(auth.walletAddress, "profile.updated", "wallet", auth.walletAddress, {
      memberships: updated.length,
      fields: Object.keys(changes),
    });

    return NextResponse.json({
      profile: {
        displayName: changes.displayName,
        phone: changes.phone ?? null,
        email: changes.email ?? null,
      },
      updated: updated.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Please check your name and contact details" }, { status: 400 });
    }
    return apiErrorResponse(error, "Failed to update profile");
  }
}
