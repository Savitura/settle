# Settle — Monad Metropolis Track 02 Submission

> **One-liner:** Shared family wallets for Nigeria remittance — send, request, and settle up in ₦. Crypto stays under the hood.

**Short (registration / one-pager):** Settle is a consumer remittance UX for Nigerian families: one shared wallet, clear ₦ balances, Send money / Request / Settle up in everyday language. Built for Metropolis Track 02 (Consumer Products & Payments) on Monad — users never see chain jargon on the primary path. Demo: seed a Lagos family → fund → send → request → settle even.

> *Settle is a hackathon codename only. Final consumer brand TBD.*

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

**Judges walkthrough path:** Login → Seed Lagos family → Send money → Request → Settle up → Optional cash-out demo

- **One-Click Demo**: Load a realistic Lagos family scenario with pre-seeded balances and transactions
- **Send & Request**: Full flows for in-group transfers
- **Settle Up**: Pay pending requests with one tap
- **Invite Members**: Share 6-character code or link
- **Cash-Out Demo**: Toggle "Cash out to Naira" on send (mocked for demo)

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

- **Live Demo**: [https://settle-oluwasomidotuns-projects-397fe069.vercel.app](https://settle-oluwasomidotuns-projects-397fe069.vercel.app)
- **GitHub**: [github.com/Savitura/settle](https://github.com/Savitura/settle)
- **Walkthrough**: See README.md for 5-minute guided tour

---

*Settle is a hackathon codename only. Final consumer brand TBD.*
