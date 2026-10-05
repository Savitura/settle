import { randomUUID } from "crypto";
import { getDb, schema } from "@/lib/db/connection";

export async function recordAudit(actorWallet: string, action: string, targetType: string, targetId: string, metadata?: unknown) {
  await getDb().insert(schema.auditEvents).values({
    id: randomUUID(), actorWallet, action, targetType, targetId,
    metadata: metadata === undefined ? null : JSON.stringify(metadata),
  });
}

export async function notify(walletAddress: string, type: string, title: string, body: string, groupId?: string) {
  await getDb().insert(schema.notifications).values({
    id: randomUUID(), walletAddress: walletAddress.toLowerCase(), type, title, body, groupId: groupId ?? null,
  });
}
