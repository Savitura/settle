import { Group, GroupMember, Transaction, MoneyRequest } from "./types";
import { generateMockTxHash } from "./currency";

const GROUPS_STORAGE_KEY = "settle_groups";
const TRANSACTIONS_STORAGE_KEY = "settle_transactions";
const REQUESTS_STORAGE_KEY = "settle_requests";
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

export function clearDemoData(): void {
  if (typeof window === "undefined") return;

  try {
    const groupsStr = localStorage.getItem(GROUPS_STORAGE_KEY);
    const txStr = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const reqStr = localStorage.getItem(REQUESTS_STORAGE_KEY);

    if (groupsStr) {
      const groups = JSON.parse(groupsStr) as { id: string }[];
      const nonDemoGroups = groups.filter((g) => !g.id.startsWith("demo-"));
      if (nonDemoGroups.length > 0) {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(nonDemoGroups));
      } else {
        localStorage.removeItem(GROUPS_STORAGE_KEY);
      }

      const demoGroupIds = new Set(
        groups.filter((g) => g.id.startsWith("demo-")).map((g) => g.id)
      );

      if (txStr) {
        const transactions = JSON.parse(txStr) as { groupId: string }[];
        const nonDemoTx = transactions.filter((t) => !demoGroupIds.has(t.groupId));
        if (nonDemoTx.length > 0) {
          localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(nonDemoTx));
        } else {
          localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
        }
      }

      if (reqStr) {
        const requests = JSON.parse(reqStr) as { groupId: string }[];
        const nonDemoReq = requests.filter((r) => !demoGroupIds.has(r.groupId));
        if (nonDemoReq.length > 0) {
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(nonDemoReq));
        } else {
          localStorage.removeItem(REQUESTS_STORAGE_KEY);
        }
      }
    }
  } catch {
    localStorage.removeItem(GROUPS_STORAGE_KEY);
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    localStorage.removeItem(REQUESTS_STORAGE_KEY);
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

export function loadDemoScenario(
  scenario: DemoScenario,
  currentUserWallet: string,
  currentUserEmail?: string,
  currentUserPhone?: string
): { group: Group; assignedMemberIndex: number } {
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

  if (typeof window !== "undefined") {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify([group]));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    localStorage.setItem(DEMO_LOADED_KEY, "true");
  }

  return { group, assignedMemberIndex: 0 };
}

export function getDemoScenarios(): DemoScenario[] {
  return [LAGOS_FAMILY_SCENARIO];
}
