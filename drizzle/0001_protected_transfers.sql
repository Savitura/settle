ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(80);
CREATE UNIQUE INDEX IF NOT EXISTS "tx_idempotency_key_unique" ON "transactions" ("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_tx_hash_unique" ON "transactions" ("tx_hash");
