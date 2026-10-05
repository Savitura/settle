import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/connection";
import { apiErrorResponse, authenticateRequest } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";
    const where = unreadOnly
      ? and(sql`LOWER(${schema.notifications.walletAddress}) = LOWER(${auth.walletAddress})`, isNull(schema.notifications.readAt))
      : sql`LOWER(${schema.notifications.walletAddress}) = LOWER(${auth.walletAddress})`;
    const rows = await getDb().query.notifications.findMany({ where, orderBy: [desc(schema.notifications.createdAt)], limit: 50 });
    return NextResponse.json({ notifications: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null })) });
  } catch (error) { return apiErrorResponse(error, "Failed to fetch notifications"); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { id } = z.object({ id: z.string().min(1).optional() }).parse(await request.json());
    const where = id
      ? and(eq(schema.notifications.id, id), sql`LOWER(${schema.notifications.walletAddress}) = LOWER(${auth.walletAddress})`)
      : sql`LOWER(${schema.notifications.walletAddress}) = LOWER(${auth.walletAddress})`;
    await getDb().update(schema.notifications).set({ readAt: new Date() }).where(where);
    return NextResponse.json({ success: true });
  } catch (error) { return apiErrorResponse(error, "Failed to update notifications"); }
}
