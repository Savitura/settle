# Settle — Shared Family Wallets for Nigeria Remittance

> **One-liner:** Shared family wallets for Nigeria remittance — send, request, and settle up in ₦. Crypto stays under the hood.

Monad Metropolis · **Track 02 — Consumer Products & Payments** · deadline **13 Oct 2026**

---

## Registration Blurb

Settle is a consumer remittance UX for Nigerian families: one shared wallet, clear ₦ balances, Send money / Request / Settle up in everyday language. Built for Metropolis Track 02 (Consumer Products & Payments) on Monad — users never see chain jargon on the primary path. Demo: seed a Lagos family → fund → send → request → settle even.

> *Settle is a hackathon codename only. Final consumer brand TBD.*

---

## Live Demo

**Deploy URL**: [https://settle-gamma-seven.vercel.app](https://settle-gamma-seven.vercel.app)

---

## 5-Minute Walkthrough

**Judges path:** Login → Seed Lagos family → Send money → Request → Settle up → Optional cash-out demo

This walkthrough demonstrates how judges (or anyone) can explore the core features in under 5 minutes. Hide-crypto stays on the primary UI throughout.

### Step 1: Sign In (30 seconds)

1. Open the app in your browser
2. Click **Get Started**
3. Enter your email or phone number
4. Complete the verification code flow
5. You're in — no passwords, no seed phrases

### Step 2: Load Demo Data (15 seconds)

For the hackathon demo, we provide a one-click Lagos family scenario:

1. On the Home tab, find the **"Try the Demo"** banner
2. Click **Load Demo**
3. The "Adeyemi Family" wallet loads automatically with:
   - 3 family members (you play "Mama Funke")
   - Pre-seeded balances in Naira
   - Sample transaction history
   - Pending money requests

### Step 3: Explore the Family Wallet (1 minute)

1. The app navigates to your **Adeyemi Family** group
2. See the **Group Balance** displayed in ₦ (Nigerian Naira)
3. View each member's balance:
   - Mama Funke (you): ₦198,290
   - Chidi: ₦123,635
   - Ngozi: ₦331,800

### Step 4: Send Money (1 minute)

1. Tap **Send Money** in Quick Actions
2. Enter an amount (e.g., ₦15,000)
3. Select a family member (e.g., Chidi)
4. Tap **Send**
5. See the success screen: "₦15,000 is on the way to Chidi"
6. Return to the group — balances update instantly

### Step 5: Request Money (1 minute)

1. Tap **Request** in Quick Actions
2. Enter an amount (e.g., ₦25,000)
3. Select who to ask (e.g., Ngozi)
4. Add a note ("Market money")
5. Tap **Request**
6. The request appears in Activity

### Step 6: Settle Up / Pay a Request (30 seconds)

1. Notice the **Pending Requests** card shows Chidi's request for generator fuel
2. Tap **Settle Up** or tap the pending request directly
3. Review the request details
4. Tap **Mark as paid**
5. The request is settled and balances adjust

### Step 7: Invite a Family Member (30 seconds)

1. Tap **Invite** in Quick Actions
2. Copy the **6-character code** or **shareable link**
3. Share via WhatsApp, SMS, or email
4. When they join, they appear in your group (max 3 members)

### Step 8: View Activity (30 seconds)

1. Scroll down to see **Activity**
2. Each entry shows:
   - Type (Sent, Received, Requested, Paid)
   - Amount in ₦
   - The other person involved
   - Date and optional note

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+

### Installation

```bash
git clone https://github.com/Savitura/settle.git
cd settle
npm install
cp .env.example .env
```

### Environment Variables

Edit `.env` with your Privy App ID:

```bash
# Required: Get your Privy App ID from https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here

# Monad Testnet (defaults provided)
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_BLOCK_EXPLORER=https://testnet-explorer.monad.xyz
```

> **Note**: For SMS/phone login, enable Phone authentication in your Privy Dashboard (Settings → Login Methods → Phone). Email login works by default.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## Deploy to Vercel

The fastest way to deploy Settle:

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSavitura%2Fsettle&env=NEXT_PUBLIC_PRIVY_APP_ID&envDescription=Get%20your%20Privy%20App%20ID%20from%20https%3A%2F%2Fdashboard.privy.io)

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option 3: GitHub Integration

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add environment variable: `NEXT_PUBLIC_PRIVY_APP_ID`
4. Deploy

### Environment Variables in Vercel

In your Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy App ID |

---

## Project Structure

```
src/
├── app/
│   ├── join/page.tsx       # Join group via invite link
│   ├── globals.css         # Tailwind + global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main app with auth + shell
├── components/
│   ├── CreateGroupModal.tsx    # Create family wallet
│   ├── DemoBanner.tsx          # One-click demo loader
│   ├── GroupCard.tsx           # Group card in list
│   ├── GroupDetail.tsx         # Group detail + actions
│   ├── InviteModal.tsx         # Share invite code
│   ├── JoinGroupModal.tsx      # Join with code
│   ├── RequestMoneyModal.tsx   # Request from member
│   ├── SendMoneyModal.tsx      # Send to member
│   └── SettleRequestModal.tsx  # Pay pending request
└── lib/
    ├── currency.ts         # NGN/USD conversion helpers
    ├── db.ts               # localStorage persistence
    ├── demoData.ts         # Demo scenarios + seed data
    ├── monad.ts            # Chain configuration
    └── types.ts            # TypeScript types
```

---

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Email/Phone Sign-In | ✅ | Privy-powered, no passwords |
| Family Wallets | ✅ | Create shared wallet, invite 2-3 members |
| Send Money | ✅ | Send within group, Naira display |
| Request Money | ✅ | Ask group members, optional note |
| Settle Up | ✅ | Pay pending requests |
| Activity Feed | ✅ | Transaction + request history |
| Demo Mode | ✅ | One-click Lagos family scenario |
| Invite Flow | ✅ | 6-char code + shareable link |
| Off-Ramp Mock | ✅ | "Cash out to Naira" demo toggle |

---

## MVP Scope (5 Issues)

1. ✅ Scaffold (Next.js) + Privy email/phone login + Monad testnet wallet
2. ✅ Shared group wallet — create / invite 2–3 members + balances
3. ✅ Send USDC remittance UX (NGN framing; off-ramp mocked)
4. ✅ Settle-up / request inside the group
5. ✅ Demo pack (seed data, walkthrough, deploy URL)

---

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type check
```

---

## Technical Notes

- **Client-side localStorage**: Groups, transactions, and requests persist in browser storage (same browser/device). No backend server in this MVP.
- **Hide-crypto UX**: All primary flows use Naira (₦) amounts. Crypto terminology only appears in footer disclaimers or demo mode labels.
- **Demo rate**: ≈ $1 = ₦1,580 (static mock rate for demo purposes)
- **Max 3 members**: Per MVP requirements, family wallets cap at 3 members.

---

## About (Demo Footnote)

> **Technical details for judges**: Settle runs on Monad testnet using USDC for transfers. Privy handles embedded wallet creation. All balances shown in Nigerian Naira (₦) are converted from USD stablecoin amounts at a demo rate. In a production version, real off-ramps would connect to local payment rails (bank transfers, mobile money).

---

## License

MIT
