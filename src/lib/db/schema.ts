import { pgTable, text, timestamp, integer, varchar, index, unique } from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 42 }).notNull(),
  inviteCode: varchar("invite_code", { length: 6 }).notNull().unique(),
  totalBalanceUsdc: text("total_balance_usdc").default("0").notNull(),
}, (table) => [
  index("groups_created_by_idx").on(table.createdBy),
  index("groups_invite_code_idx").on(table.inviteCode),
]);

export const groupMembers = pgTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  balanceUsdc: text("balance_usdc").default("0").notNull(),
}, (table) => [
  index("members_group_idx").on(table.groupId),
  index("members_wallet_idx").on(table.walletAddress),
  unique("members_group_wallet_unique").on(table.groupId, table.walletAddress),
]);

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  amountNgn: text("amount_ngn").notNull(),
  txHash: varchar("tx_hash", { length: 66 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("tx_group_idx").on(table.groupId),
  index("tx_from_idx").on(table.fromAddress),
  index("tx_to_idx").on(table.toAddress),
]);

export const moneyRequests = pgTable("money_requests", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  fromAddress: varchar("from_address", { length: 42 }).notNull(),
  toAddress: varchar("to_address", { length: 42 }).notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  amountNgn: text("amount_ngn").notNull(),
  note: text("note"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  settledTxId: text("settled_tx_id"),
}, (table) => [
  index("req_group_idx").on(table.groupId),
  index("req_from_idx").on(table.fromAddress),
  index("req_to_idx").on(table.toAddress),
  index("req_status_idx").on(table.status),
]);
