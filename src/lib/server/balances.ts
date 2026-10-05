import { erc20Abi, formatUnits } from "viem";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db/connection";
import { ApiError } from "./auth";
import { getMonadPublicClient } from "./rpc";

export async function syncGroupBalances(db: ReturnType<typeof getDb>, groupId: string) {
  const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, groupId) });
  if (process.env.ENABLE_DEMO_MODE === "true") return members;

  const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  if (!tokenAddress || /^0x0{40}$/i.test(tokenAddress)) throw new ApiError(503, "USDC balance service is not configured");
  const client = getMonadPublicClient();
  const balances = await Promise.all(members.map((member) => client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [member.walletAddress as `0x${string}`],
  })));

  let total = 0;
  for (let index = 0; index < members.length; index++) {
    const balance = formatUnits(balances[index], 6);
    members[index].balanceUsdc = balance;
    total += Number(balance);
    await db.update(schema.groupMembers).set({ balanceUsdc: balance }).where(eq(schema.groupMembers.id, members[index].id));
  }
  await db.update(schema.groups).set({ totalBalanceUsdc: total.toFixed(6) }).where(eq(schema.groups.id, groupId));
  return members;
}
