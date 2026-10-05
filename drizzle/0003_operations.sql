ALTER TABLE "group_members" ADD COLUMN IF NOT EXISTS "role" varchar(20) NOT NULL DEFAULT 'member';
UPDATE "group_members" m SET "role" = 'owner' FROM "groups" g
WHERE m."group_id" = g."id" AND LOWER(m."wallet_address") = LOWER(g."created_by");

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "failure_reason" text;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY,
  "wallet_address" varchar(42) NOT NULL,
  "group_id" text REFERENCES "groups"("id") ON DELETE CASCADE,
  "type" varchar(40) NOT NULL,
  "title" varchar(120) NOT NULL,
  "body" text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notifications_wallet_idx" ON "notifications"("wallet_address");
CREATE INDEX IF NOT EXISTS "notifications_group_idx" ON "notifications"("group_id");

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" text PRIMARY KEY,
  "actor_wallet" varchar(42) NOT NULL,
  "action" varchar(80) NOT NULL,
  "target_type" varchar(40) NOT NULL,
  "target_id" text NOT NULL,
  "metadata" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_events"("actor_wallet");
CREATE INDEX IF NOT EXISTS "audit_target_idx" ON "audit_events"("target_type", "target_id");
