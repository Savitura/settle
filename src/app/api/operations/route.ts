import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/connection";
import { ApiError, apiErrorResponse, authenticateRequest } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const admins = (process.env.ADMIN_WALLETS || "").toLowerCase().split(",").map((v) => v.trim()).filter(Boolean);
    if (!admins.includes(auth.walletAddress)) throw new ApiError(403, "Operations access required");
    const db = getDb();
    const [counts, recentAudit, recentFailures] = await Promise.all([
      db.execute(sql`SELECT
        (SELECT COUNT(*) FROM groups)::int AS groups,
        (SELECT COUNT(*) FROM group_members)::int AS members,
        (SELECT COUNT(*) FROM transactions)::int AS transactions,
        (SELECT COUNT(*) FROM money_requests WHERE status = 'pending')::int AS pending_requests`),
      db.query.auditEvents.findMany({ orderBy: [desc(schema.auditEvents.createdAt)], limit: 50 }),
      db.query.transactions.findMany({ where: sql`${schema.transactions.status} = 'failed'`, orderBy: [desc(schema.transactions.updatedAt)], limit: 25 }),
    ]);
    return NextResponse.json({ status: "ok", counts: counts.rows[0], recentAudit, recentFailures });
  } catch (error) { return apiErrorResponse(error, "Operations status failed"); }
}
