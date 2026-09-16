import { Group, GroupMember } from "./types";

const GROUPS_STORAGE_KEY = "settle_groups";

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
