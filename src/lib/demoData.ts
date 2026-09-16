import { Group, GroupMember, Transaction, MoneyRequest } from "./types";
import { generateMockTxHash } from "./currency";

const DEMO_LOADED_KEY = "settle_demo_loaded";

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  groupName: string;
  members: Array<{
    displayName: string;
    email: string;
    balanceUsdc: string;
  }>;
  transactions: Array<{
    fromIndex: number;
    toIndex: number;
    amountUsdc: string;
    note?: string;
    daysAgo: number;
  }>;
  requests: Array<{
    fromIndex: number;
    toIndex: number;
    amountUsdc: string;
    note?: string;
    status: "pending" | "paid" | "declined";
  }>;
}

export const LAGOS_FAMILY_SCENARIO: DemoScenario = {
  id: "lagos-family",
  name: "Adeyemi Family – Lagos",
  description: "A typical Lagos family sharing household expenses and receiving remittances",
  groupName: "Adeyemi Family",
  members: [
    {
      displayName: "Mama Funke",
      email: "funke.adeyemi@gmail.com",
      balanceUsdc: "125.50",
    },
    {
      displayName: "Chidi",
      email: "chidi.adeyemi@gmail.com",
      balanceUsdc: "78.25",
    },
    {
      displayName: "Ngozi",
      email: "ngozi.adeyemi@gmail.com",
      balanceUsdc: "210.00",
    },
  ],
  transactions: [
    {
      fromIndex: 2,
      toIndex: 0,
      amountUsdc: "50.00",
      note: "School fees contribution",
      daysAgo: 3,
    },
    {
      fromIndex: 1,
      toIndex: 0,
      amountUsdc: "25.00",
      note: "Light bill share",
      daysAgo: 5,
    },
    {
      fromIndex: 2,
      toIndex: 1,
      amountUsdc: "30.00",
      note: "Groceries reimbursement",
      daysAgo: 7,
    },
  ],
  requests: [
    {
      fromIndex: 1,
      toIndex: 0,
      amountUsdc: "40.00",
      note: "Generator fuel",
      status: "pending",
    },
    {
      fromIndex: 0,
      toIndex: 2,
      amountUsdc: "15.00",
      note: "Data bundle",
      status: "pending",
    },
  ],
};

export function isDemoLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_LOADED_KEY) === "true";
}

export async function checkDemoDataExists(walletAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/demo?wallet=${encodeURIComponent(walletAddress)}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.hasDemoGroups === true;
  } catch {
    return false;
  }
}

export async function clearDemoData(walletAddress: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch(`/api/demo?wallet=${encodeURIComponent(walletAddress)}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Failed to clear demo data from server:", error);
  }

  localStorage.removeItem(DEMO_LOADED_KEY);
}

function generateMockWalletAddress(): string {
  const chars = "0123456789abcdef";
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

function buildDemoData(
  scenario: DemoScenario,
  currentUserWallet: string,
  currentUserEmail?: string,
  currentUserPhone?: string
): { group: Group; transactions: Transaction[]; requests: MoneyRequest[] } {
  const now = new Date();

  const walletAddresses = scenario.members.map((_, index) =>
    index === 0 ? currentUserWallet : generateMockWalletAddress()
  );

  const members: GroupMember[] = scenario.members.map((member, index) => {
    const usdcNum = parseFloat(member.balanceUsdc);
    return {
      id: generateId(),
      walletAddress: walletAddresses[index],
      displayName: index === 0 ? (member.displayName) : member.displayName,
      email: index === 0 ? (currentUserEmail || member.email) : member.email,
      phone: index === 0 ? (currentUserPhone || null) : null,
      joinedAt: new Date(now.getTime() - (30 - index) * 24 * 60 * 60 * 1000).toISOString(),
      balance: {
        usdc: member.balanceUsdc,
        usdcFormatted: `$${usdcNum.toFixed(2)}`,
      },
    };
  });

  let totalUsdc = 0;
  for (const member of members) {
    totalUsdc += parseFloat(member.balance.usdc);
  }

  const group: Group = {
    id: generateId(),
    name: scenario.groupName,
    createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: currentUserWallet,
    inviteCode: generateInviteCode(),
    members,
    totalBalance: {
      usdc: totalUsdc.toString(),
      usdcFormatted: `$${totalUsdc.toFixed(2)}`,
    },
  };

  const ngnRate = 1580;

  const transactions: Transaction[] = scenario.transactions.map((tx) => {
    const usdcNum = parseFloat(tx.amountUsdc);
    const ngnAmount = usdcNum * ngnRate;
    return {
      id: generateId(),
      groupId: group.id,
      type: "send" as const,
      fromAddress: walletAddresses[tx.fromIndex],
      toAddress: walletAddresses[tx.toIndex],
      amountUsdc: tx.amountUsdc,
      amountNgn: ngnAmount.toString(),
      txHash: generateMockTxHash(),
      status: "confirmed" as const,
      note: tx.note,
      createdAt: new Date(now.getTime() - tx.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  const requests: MoneyRequest[] = scenario.requests.map((req) => {
    const usdcNum = parseFloat(req.amountUsdc);
    const ngnAmount = usdcNum * ngnRate;
    return {
      id: generateId(),
      groupId: group.id,
      fromAddress: walletAddresses[req.fromIndex],
      toAddress: walletAddresses[req.toIndex],
      amountUsdc: req.amountUsdc,
      amountNgn: ngnAmount.toString(),
      note: req.note,
      status: req.status,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  return { group, transactions, requests };
}

export async function loadDemoScenario(
  scenario: DemoScenario,
  currentUserWallet: string,
  currentUserEmail?: string,
  currentUserPhone?: string
): Promise<{ group: Group; assignedMemberIndex: number }> {
  const hasDemoData = await checkDemoDataExists(currentUserWallet);
  if (hasDemoData) {
    throw new Error("Demo data already exists. Reset first to load again.");
  }

  const { group, transactions, requests } = buildDemoData(
    scenario,
    currentUserWallet,
    currentUserEmail,
    currentUserPhone
  );

  try {
    const response = await fetch("/api/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groups: [group],
        transactions,
        requests,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to load demo data");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_LOADED_KEY, "true");
    }

    return { group, assignedMemberIndex: 0 };
  } catch (error) {
    console.error("Failed to load demo scenario:", error);
    throw error;
  }
}

export function getDemoScenarios(): DemoScenario[] {
  return [LAGOS_FAMILY_SCENARIO];
}
