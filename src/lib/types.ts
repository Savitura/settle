export interface GroupMember {
  id: string;
  walletAddress: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  joinedAt: string;
  balance: {
    usdc: string;
    usdcFormatted: string;
  };
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  inviteCode: string;
  members: GroupMember[];
  totalBalance: {
    usdc: string;
    usdcFormatted: string;
  };
}

export interface CreateGroupRequest {
  name: string;
  creatorWalletAddress: string;
  creatorDisplayName?: string;
  creatorEmail?: string;
  creatorPhone?: string;
}

export interface JoinGroupRequest {
  inviteCode: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

export interface GroupsResponse {
  groups: Group[];
}

export interface GroupResponse {
  group: Group;
}

export interface InviteLink {
  code: string;
  url: string;
}
