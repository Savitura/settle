import { useState } from "react";

import { fundDemoWallet } from "@/lib/db";
import { formatNgn, usdcToNgn } from "@/lib/currency";

export const DEMO_FUNDS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TESTNET_FAUCET === "true";

export type DemoFundsState = "idle" | "loading" | "success" | "claimed" | "error";

/**
 * "Get demo funds" in one place, so Home and a wallet's getting-started card behave the same.
 * Amounts are always shown in naira.
 */
export function useDemoFunds(onFunded?: () => unknown) {
  const [state, setState] = useState<DemoFundsState>("idle");
  const [message, setMessage] = useState("");

  const claim = async () => {
    setState("loading");
    setMessage("");
    try {
      const result = await fundDemoWallet();
      setState("success");
      setMessage(`${formatNgn(usdcToNgn(Number(result.amountUsdc)))} in demo money added to your balance`);
      await onFunded?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      if (/already received/i.test(text)) {
        setState("claimed");
        setMessage("You've already had your demo money. It's in your balance.");
        return;
      }
      setState("error");
      setMessage("We couldn't add demo money just now. Please try again in a moment.");
    }
  };

  return {
    state,
    message,
    claim,
    busy: state === "loading",
    done: state === "success" || state === "claimed",
  };
}

export type DemoFunds = ReturnType<typeof useDemoFunds>;
