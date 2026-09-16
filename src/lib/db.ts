import {
  Group,
  GroupMember,
  Transaction,
  CreateTransactionRequest,
  MoneyRequest,
  CreateMoneyRequestInput,
  MoneyRequestStatus,
} from "./types";

const GROUPS_STORAGE_KEY = "settle_groups";
const TRANSACTIONS_STORAGE_KEY = "settle_transactions";
const REQUESTS_STORAGE_KEY = "settle_requests";
const MIGRATION_DONE_KEY = "settle_migration_done";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function migrateLocalStorageData(): Promise<{ migrated: boolean; imported?: { groups: number; members: number; transactions: number; requests: number } }> {
  if (typeof window === "undefined") {
    return { migrated: false };
  }

  if (localStorage.getItem(MIGRATION_DONE_KEY) === "true") {
    return { migrated: false };
  }

  try {
    const groupsStr = localStorage.getItem(GROUPS_STORAGE_KEY);
    const transactionsStr = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const requestsStr = localStorage.getItem(REQUESTS_STORAGE_KEY);

    const groups = groupsStr ? JSON.parse(groupsStr) : [];
    const transactions = transactionsStr ? JSON.parse(transactionsStr) : [];
    const requests = requestsStr ? JSON.parse(requestsStr) : [];

    if (groups.length === 0 && transactions.length === 0 && requests.length === 0) {
      localStorage.setItem(MIGRATION_DONE_KEY, "true");
      return { migrated: false };
    }

    const result = await fetchApi<{ success: boolean; imported: { groups: number; members: number; transactions: number; requests: number } }>("/api/migrate", {
      method: "POST",
      body: JSON.stringify({ groups, transactions, requests }),
    });

    if (result.success) {
      localStorage.setItem(MIGRATION_DONE_KEY, "true");
      return { migrated: true, imported: result.imported };
    }

    return { migrated: false };
  } catch (error) {
    console.error("Migration failed:", error);
    return { migrated: false };
  }
}

export async function createGroup(
  name: string,
  creatorWalletAddress: string,
  creatorDisplayName?: string,
  creatorEmail?: string,
  creatorPhone?: string
): Promise<Group> {
  const result = await fetchApi<{ group: Group }>("/api/groups", {
    method: "POST",
    body: JSON.stringify({
      name,
      creatorWalletAddress,
      creatorDisplayName,
      creatorEmail,
      creatorPhone,
    }),
  });
  return result.group;
}

export async function getGroupsByWallet(walletAddress: string): Promise<Group[]> {
  const result = await fetchApi<{ groups: Group[] }>(
    `/api/groups?wallet=${encodeURIComponent(walletAddress)}`
  );
  return result.groups;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    const result = await fetchApi<{ group: Group }>(
      `/api/groups?id=${encodeURIComponent(groupId)}`
    );
    return result.group;
  } catch {
    return null;
  }
}

export async function getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
  try {
    const result = await fetchApi<{ group: Group }>(
      `/api/groups?inviteCode=${encodeURIComponent(inviteCode)}`
    );
    return result.group;
  } catch {
    return null;
  }
}

export async function joinGroup(
  inviteCode: string,
  walletAddress: string,
  displayName?: string,
  email?: string,
  phone?: string
): Promise<Group | null> {
  try {
    const result = await fetchApi<{ group: Group }>("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({
        inviteCode,
        walletAddress,
        displayName,
        email,
        phone,
      }),
    });
    return result.group;
  } catch (error) {
    if (error instanceof Error && error.message.includes("full")) {
      throw error;
    }
    return null;
  }
}

export function getInviteUrl(inviteCode: string): string {
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join?code=${inviteCode}`;
  }
  return `${window.location.origin}/join?code=${inviteCode}`;
}

export async function updateMemberBalance(
  groupId: string,
  walletAddress: string,
  usdcBalance: string
): Promise<Group | null> {
  try {
    const result = await fetchApi<{ group: Group }>("/api/groups/balance", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        walletAddress,
        usdcBalance,
      }),
    });
    return result.group;
  } catch {
    return null;
  }
}

export async function seedMockBalances(groupId: string): Promise<Group | null> {
  try {
    const result = await fetchApi<{ group: Group }>("/api/groups/balance", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        seedMock: true,
      }),
    });
    return result.group;
  } catch {
    return null;
  }
}

export async function createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
  const result = await fetchApi<{ transaction: Transaction }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return result.transaction;
}

export async function getTransactionsByGroup(groupId: string): Promise<Transaction[]> {
  const result = await fetchApi<{ transactions: Transaction[] }>(
    `/api/transactions?groupId=${encodeURIComponent(groupId)}`
  );
  return result.transactions;
}

export async function getTransactionsByWallet(walletAddress: string): Promise<Transaction[]> {
  const result = await fetchApi<{ transactions: Transaction[] }>(
    `/api/transactions?wallet=${encodeURIComponent(walletAddress)}`
  );
  return result.transactions;
}

export async function getTransactionByHash(txHash: string): Promise<Transaction | null> {
  const result = await fetchApi<{ transaction: Transaction | null }>(
    `/api/transactions?txHash=${encodeURIComponent(txHash)}`
  );
  return result.transaction;
}

export async function createMoneyRequest(input: CreateMoneyRequestInput): Promise<MoneyRequest> {
  const result = await fetchApi<{ request: MoneyRequest }>("/api/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.request;
}

export async function getRequestsByGroup(groupId: string): Promise<MoneyRequest[]> {
  const result = await fetchApi<{ requests: MoneyRequest[] }>(
    `/api/requests?groupId=${encodeURIComponent(groupId)}`
  );
  return result.requests;
}

export async function getRequestsByWallet(walletAddress: string): Promise<MoneyRequest[]> {
  const result = await fetchApi<{ requests: MoneyRequest[] }>(
    `/api/requests?wallet=${encodeURIComponent(walletAddress)}`
  );
  return result.requests;
}

export async function getPendingRequestsForWallet(
  groupId: string,
  walletAddress: string
): Promise<MoneyRequest[]> {
  const result = await fetchApi<{ requests: MoneyRequest[] }>(
    `/api/requests?groupId=${encodeURIComponent(groupId)}&wallet=${encodeURIComponent(walletAddress)}&pendingOnly=true`
  );
  return result.requests;
}

export async function getRequestById(requestId: string): Promise<MoneyRequest | null> {
  const result = await fetchApi<{ request: MoneyRequest | null }>(
    `/api/requests?id=${encodeURIComponent(requestId)}`
  );
  return result.request;
}

export async function updateRequestStatus(
  requestId: string,
  status: MoneyRequestStatus,
  settledTxId?: string
): Promise<MoneyRequest | null> {
  try {
    const result = await fetchApi<{ request: MoneyRequest | null }>("/api/requests", {
      method: "PATCH",
      body: JSON.stringify({
        requestId,
        status,
        settledTxId,
      }),
    });
    return result.request;
  } catch {
    return null;
  }
}
