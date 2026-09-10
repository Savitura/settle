import { NextRequest, NextResponse } from "next/server";

import {
  createGroup,
  getGroupsByWallet,
} from "@/lib/db";
import { CreateGroupRequest } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get("wallet");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "wallet query parameter is required" },
      { status: 400 }
    );
  }

  const groups = getGroupsByWallet(walletAddress);
  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateGroupRequest;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    if (!body.creatorWalletAddress) {
      return NextResponse.json(
        { error: "Creator wallet address is required" },
        { status: 400 }
      );
    }

    const group = createGroup(
      body.name.trim(),
      body.creatorWalletAddress,
      body.creatorDisplayName,
      body.creatorEmail,
      body.creatorPhone
    );

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
