import { NextRequest, NextResponse } from "next/server";

import { joinGroup, getGroupByInviteCode } from "@/lib/db";
import { JoinGroupRequest } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  const group = getGroupByInviteCode(code);

  if (!group) {
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      memberCount: group.members.length,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JoinGroupRequest;

    if (!body.inviteCode?.trim()) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    if (!body.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const group = joinGroup(
      body.inviteCode.trim(),
      body.walletAddress,
      body.displayName,
      body.email,
      body.phone
    );

    if (!group) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof Error && error.message.includes("full")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
