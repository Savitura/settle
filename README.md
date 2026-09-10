# Settle (hackathon codename)

> **Settle** is the repo/hackathon codename only. Final consumer brand TBD (SendHome / FamPay / etc.).

Monad Metropolis · **Track 02 — Consumer Products & Payments** · deadline **13 Oct 2026**

Nigeria / Africa **shared family wallets** + **remittance UX** on Monad. Separate from CrowdPay / Fluxa / Stellar SCF work.

## MVP scope (5 issues)

1. ✅ Scaffold (Next.js) + Privy email/phone login + Monad testnet wallet
2. Shared group wallet — create / invite 2–3 members + balances
3. Send USDC remittance UX (NGN framing OK; off-ramp mocked)
4. Settle-up / request inside the group
5. Demo pack (seed data, README walkthrough, deploy URL)

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Auth / Wallets**: Privy (email/phone → embedded wallet)
- **Chain**: Monad testnet
- **Stablecoin UX**: USDC (testnet); NGN framing in UI

## Local Setup

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+

### Installation

```bash
# Clone the repo
git clone https://github.com/Savitura/settle.git
cd settle

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
```

### Environment Variables

Edit `.env` with your credentials:

```bash
# Required: Get your Privy App ID from https://dashboard.privy.io
# Note: For SMS/phone login, enable Phone authentication in Privy Dashboard
#       (Settings → Login Methods → Phone). Email login works by default.
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here

# Monad Testnet (defaults provided, override if needed)
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_BLOCK_EXPLORER=https://testnet-explorer.monad.xyz
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Other Commands

```bash
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
npm run start      # Start production server (after build)
```

## Project Structure

```
src/
├── app/
│   ├── join/
│   │   └── page.tsx       # Join group via invite link
│   ├── globals.css        # Tailwind + global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page with Privy auth + app shell
├── components/
│   ├── CreateGroupModal.tsx   # Create family wallet modal
│   ├── GroupCard.tsx          # Group card in list view
│   ├── GroupDetail.tsx        # Group detail with members
│   ├── InviteModal.tsx        # Share invite code/link
│   └── JoinGroupModal.tsx     # Join with invite code
└── lib/
    ├── db.ts              # Client-side localStorage persistence
    ├── monad.ts           # Monad testnet chain definition
    └── types.ts           # TypeScript types
```

## Current Status

**Issue #1 Complete**: Basic scaffold with:
- Privy email/phone authentication
- Embedded wallet creation on login
- Monad testnet chain configuration
- Login gate for unauthenticated users
- App shell with Home and Groups tabs

**Issue #2 Complete**: Shared group wallets with:
- Create family wallet (2–3 members max)
- Invite flow with shareable 6-character code and link
- Group and per-member USDC balance display
- Join group via invite code or link (`/join?code=XXXXXX`)
- Client-side localStorage persistence (works across page reloads within same browser)
- Mock balance seeding for demo purposes

**Next**: Issue #3 — Send USDC remittance UX

## License

MIT
