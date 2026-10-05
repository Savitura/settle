CREATE TABLE IF NOT EXISTS "testnet_faucet_claims" (
  "id" text PRIMARY KEY NOT NULL,
  "wallet_address" varchar(42) NOT NULL,
  "amount_usdc" text NOT NULL,
  "tx_hash" varchar(66),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "testnet_faucet_claims_wallet_address_unique" UNIQUE("wallet_address")
);
CREATE INDEX IF NOT EXISTS "faucet_wallet_idx" ON "testnet_faucet_claims" ("wallet_address");
