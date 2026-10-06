import { desc, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";

/** Clean up a client-supplied display name so it fits the column. */
export function cleanDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 100);
  return trimmed || null;
}

/**
 * The name this wallet already uses in another family wallet, if any.
 * Lets a name set once carry over when the person starts or joins another wallet.
 */
export async function knownDisplayName(db: ReturnType<typeof getDb>, walletAddress: string): Promise<string | null> {
  const rows = await db.query.groupMembers.findMany({
    where: sql`LOWER(${schema.groupMembers.walletAddress}) = LOWER(${walletAddress}) AND ${schema.groupMembers.displayName} IS NOT NULL`,
    orderBy: [desc(schema.groupMembers.joinedAt)],
    limit: 1,
  });
  return rows[0]?.displayName ?? null;
}
