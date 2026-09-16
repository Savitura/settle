import { Group, GroupMember, Transaction, CreateTransactionRequest } from "./types";

const GROUPS_STORAGE_KEY = "settle_groups";
const TRANSACTIONS_STORAGE_KEY = "settle_transactions";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getGroups(): Group[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGroups(groups: Group[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

export function createGroup(
  name: string,
  creatorWalletAddress: string,
  creatorDisplayName?: string,
  creatorEmail?: string,
  creatorPhone?: string
): Group {
  const groups = getGroups();
  const now = new Date().toISOString();

  const creatorMember: GroupMember = {
    id: generateId(),
    walletAddress: creatorWalletAddress,
    displayName: creatorDisplayName || null,
    email: creatorEmail || null,
    phone: creatorPhone || null,
    joinedAt: now,
    balance: {
      usdc: "0",
      usdcFormatted: "$0.00",
    },
  };

  const group: Group = {
    id: generateId(),
    name,
    createdAt: now,
    createdBy: creatorWalletAddress,
    inviteCode: generateInviteCode(),
    members: [creatorMember],
    totalBalance: {
      usdc: "0",
      usdcFormatted: "$0.00",
    },
  };

  groups.push(group);
  saveGroups(groups);
  return group;
}

export function getGroupsByWallet(walletAddress: string): Group[] {
  const groups = getGroups();
  return groups.filter((g) =>
    g.members.some(
      (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    )
  );
}

export function getGroupById(groupId: string): Group | null {
  const groups = getGroups();
  return groups.find((g) => g.id === groupId) || null;
}

export function getGroupByInviteCode(inviteCode: string): Group | null {
  const groups = getGroups();
  return (
    groups.find((g) => g.inviteCode.toUpperCase() === inviteCode.toUpperCase()) ||
    null
  );
}

export function joinGroup(
  inviteCode: string,
  walletAddress: string,
  displayName?: string,
  email?: string,
  phone?: string
): Group | null {
  const groups = getGroups();
  const groupIndex = groups.findIndex(
    (g) => g.inviteCode.toUpperCase() === inviteCode.toUpperCase()
  );

  if (groupIndex === -1) {
    return null;
  }

  const group = groups[groupIndex];

  const alreadyMember = group.members.some(
    (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  if (alreadyMember) {
    return group;
  }

  if (group.members.length >= 3) {
    throw new Error("Group is full (maximum 3 members)");
  }

  const newMember: GroupMember = {
    id: generateId(),
    walletAddress,
    displayName: displayName || null,
    email: email || null,
    phone: phone || null,
    joinedAt: new Date().toISOString(),
    balance: {
      usdc: "0",
      usdcFormatted: "$0.00",
    },
  };

  group.members.push(newMember);
  groups[groupIndex] = group;
  saveGroups(groups);
  return group;
}

export function getInviteUrl(inviteCode: string): string {
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join?code=${inviteCode}`;
  }
  return `${window.location.origin}/join?code=${inviteCode}`;
}

export function updateMemberBalance(
  groupId: string,
  walletAddress: string,
  usdcBalance: string
): Group | null {
  const groups = getGroups();
  const groupIndex = groups.findIndex((g) => g.id === groupId);

  if (groupIndex === -1) {
    return null;
  }

  const group = groups[groupIndex];
  const memberIndex = group.members.findIndex(
    (m) => m.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  if (memberIndex === -1) {
    return null;
  }

  const usdcNum = parseFloat(usdcBalance) || 0;
  group.members[memberIndex].balance = {
    usdc: usdcBalance,
    usdcFormatted: `$${usdcNum.toFixed(2)}`,
  };

  let totalUsdc = 0;
  for (const member of group.members) {
    totalUsdc += parseFloat(member.balance.usdc) || 0;
  }

  group.totalBalance = {
    usdc: totalUsdc.toString(),
    usdcFormatted: `$${totalUsdc.toFixed(2)}`,
  };

  groups[groupIndex] = group;
  saveGroups(groups);
  return group;
}

export function seedMockBalances(groupId: string): Group | null {
  const groups = getGroups();
  const groupIndex = groups.findIndex((g) => g.id === groupId);

  if (groupIndex === -1) {
    return null;
  }

  const group = groups[groupIndex];
  const mockBalances = ["125.50", "78.25", "210.00"];

  group.members.forEach((member, index) => {
    const balance = mockBalances[index % mockBalances.length];
    const usdcNum = parseFloat(balance);
    member.balance = {
      usdc: balance,
      usdcFormatted: `$${usdcNum.toFixed(2)}`,
    };
  });

  let totalUsdc = 0;
  for (const member of group.members) {
    totalUsdc += parseFloat(member.balance.usdc) || 0;
  }

  group.totalBalance = {
    usdc: totalUsdc.toString(),
    usdcFormatted: `$${totalUsdc.toFixed(2)}`,
  };

  groups[groupIndex] = group;
  saveGroups(groups);
  return group;
}

function getTransactions(): Transaction[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
}

export function createTransaction(request: CreateTransactionRequest): Transaction {
  const transactions = getTransactions();

  const transaction: Transaction = {
    id: generateId(),
    groupId: request.groupId,
    type: request.type,
    fromAddress: request.fromAddress,
    toAddress: request.toAddress,
    amountUsdc: request.amountUsdc,
    amountNgn: request.amountNgn,
    txHash: request.txHash,
    status: request.status,
    note: request.note,
    createdAt: new Date().toISOString(),
  };

  transactions.push(transaction);
  saveTransactions(transactions);
  return transaction;
}

export function getTransactionsByGroup(groupId: string): Transaction[] {
  const transactions = getTransactions();
  return transactions
    .filter((t) => t.groupId === groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransactionsByWallet(walletAddress: string): Transaction[] {
  const transactions = getTransactions();
  const addr = walletAddress.toLowerCase();
  return transactions
    .filter(
      (t) =>
        t.fromAddress.toLowerCase() === addr ||
        t.toAddress.toLowerCase() === addr
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransactionByHash(txHash: string): Transaction | null {
  const transactions = getTransactions();
  return transactions.find((t) => t.txHash === txHash) || null;
}
