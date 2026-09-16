const MOCK_NGN_RATE = 1580;

export function usdcToNgn(usdc: number): number {
  return usdc * MOCK_NGN_RATE;
}

export function ngnToUsdc(ngn: number): number {
  return ngn / MOCK_NGN_RATE;
}

export function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatUsdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function generateMockTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

export function getExplorerTxUrl(txHash: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_MONAD_BLOCK_EXPLORER ||
    "https://testnet-explorer.monad.xyz";
  return `${baseUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_MONAD_BLOCK_EXPLORER ||
    "https://testnet-explorer.monad.xyz";
  return `${baseUrl}/address/${address}`;
}

export function getNgnRate(): number {
  return MOCK_NGN_RATE;
}
