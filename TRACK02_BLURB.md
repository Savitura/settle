# Settle — Monad Metropolis Track 02 Submission

> **One-liner**: Hide-crypto shared wallets so Lagos families can send, split, and settle up — no seed phrases, no "blockchain" in the UI.

---

## The Problem

Sending money home to Nigeria is expensive, slow, and fragmented. Traditional remittance services charge 5-8% fees. Family members share expenses but lack tools to track who owes what. And crypto wallets? Too complex for everyday users who just want to "send Mama 50k for rent."

## Our Solution

**Settle** is a shared family wallet for African remittances. Sign in with email or phone — we create a wallet for you behind the scenes. No seed phrases, no blockchain jargon.

- **Create a Family Wallet**: Invite up to 3 members (Mama, siblings, cousins)
- **Send Money Instantly**: Tap, enter ₦ amount, done
- **Request & Settle**: "Chidi, you owe me for that generator fuel"
- **Activity Feed**: See every transaction, every request

## Why Monad?

Monad's high throughput and low fees make microtransactions viable. A ₦5,000 transfer shouldn't cost ₦500 in gas. With Monad, we can offer near-instant settlement at negligible cost — critical for frequent, small family transfers.

## Hide-Crypto UX

Users see Nigerian Naira (₦), not USDC. They tap "Send" and "Request", not "Transfer" and "Approve". No wallet addresses visible in the main flow. No "connect wallet" step. Privy handles embedded wallets so users sign in like any normal app.

## Demo Features

- **One-Click Demo**: Load a realistic Lagos family scenario with pre-seeded balances and transactions
- **Send & Request**: Full flows for in-group transfers
- **Settle Up**: Pay pending requests with one tap
- **Invite Members**: Share 6-character code or link

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) + Tailwind |
| Auth & Wallets | Privy (email/phone → embedded wallet) |
| Chain | Monad Testnet |
| Stablecoin | USDC (NGN display in UI) |
| Persistence | Client localStorage (MVP) |

## Team

Savitura — building fintech for emerging markets.

## Links

- **Live Demo**: [Deploy URL Placeholder]
- **GitHub**: [github.com/Savitura/settle](https://github.com/Savitura/settle)
- **Walkthrough**: See README.md for 5-minute guided tour

---

*Settle is a hackathon codename. Final consumer brand TBD.*
