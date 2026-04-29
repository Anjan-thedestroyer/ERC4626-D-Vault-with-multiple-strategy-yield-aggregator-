# Yield Aggregator Vault — Frontend dApp

A production-ready Web3 frontend for the ERC-4626 Yield Aggregator Vault, built with Next.js, Wagmi v2, Viem, and RainbowKit. The UI gives depositors a clean dashboard to manage their position and gives the vault owner a control panel to deploy capital and manage strategies — all without touching a block explorer.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js (App Router) |
| Wallet Connection | RainbowKit |
| Contract Reads/Writes | Wagmi v2 |
| Blockchain Primitives | Viem |
| Language | TypeScript |

---

## Project Structure

vault-client/
├── .next/                  # Next.js build artifacts
├── abi/                    # JSON ABI files for contract interaction
├── app/                    # Next.js App Router (Routing & Layouts)
│   ├── dashboard/          
│   │   └── page.tsx        # High-level overview of all strategies
│   ├── favicon.ico         
│   ├── globals.css         # Tailwind & global styles
│   ├── layout.tsx          # Root layout (Navbar, Footer, Providers)
│   ├── page.tsx            # Landing page / Root entry
│   └── provider.tsx        # Wagmi / RainbowKit / Query providers
├── component/              # Modular UI Components
│   ├── DashBoard/          
│   │   ├── SharePrice.tsx  # Exchange rate visualizer
│   │   └── Stat.tsx        # Metric display cards
│   └── Vault/              
│       ├── Deposit.tsx     # Token → Share logic
│       ├── Mint.tsx        # Specific share minting
│       ├── Redeem.tsx      # Share → Token logic
│       └── Withdraw.tsx    # Exact asset withdrawal
├── hooks/                  # Custom Web3 Logic (State & Interaction)
│   ├── activeStrategy.ts      # Fetches current winner address
│   ├── ActiveStrategyMetric.ts # Fetches APY/Risk/Cost of active strat
│   ├── strat.ts               # Individual strategy data fetching
│   ├── useDeposit.ts          # ERC-20 Approval + Vault Deposit workflow
│   ├── useMint.ts             # Minting transaction handler
│   ├── useStrategyMetric.ts   # Aggregate scoring logic for UI
│   ├── useVault.ts            # General Vault state (Total Assets, Supply)
│   └── useVaultDash.ts        # Combined data for the dashboard view
├── lib/                    # Configuration & Constants
│   ├── autoconnect.ts      # Wallet persistence logic
│   ├── config.ts           # Wagmi/Chain/RPC configuration
│   └── contracts.ts        # Contract addresses & consolidated ABIs
└── node_modules/           # Project dependencies

## Hook Reference

### `useVaultDash`

The main data hook for the user dashboard. Aggregates everything a depositor needs to see their position at a glance.

```ts
const {
  walletBalance,     // User's MTK token balance (raw bigint)
  shares,            // Vault shares owned by the user
  convertVaultValue, // Current token value of those shares
  shareValue,        // Price of exactly 1.00 share in tokens
  stratAddress,      // Address of the currently active strategy
  isLoading,
  refetchBalance
} = useVaultDash();
```

Reads performed:
- `balanceOf(address)` — share balance
- `convertToAssets(shares)` — live token value of position
- `convertToAssets(1e18)` — current share price
- `activeStrategy()` — which strategy is live right now
- `useBalance(TOKEN_ADDRESS)` — wallet's MTK balance

---

### `useActiveStrategy` + `useActiveStrategyMetrics`

`useActiveStrategy` fetches the address of whichever strategy is currently ranked best by the vault's scoring formula.

`useActiveStrategyMetrics` composes that address into a full metrics read, so the UI can display live performance data for the active strategy without needing to know its address in advance.

```ts
const {
  strategy,    // Strategy contract address
  apy,         // Annual yield (raw uint256)
  risk,        // Risk score 1–10
  liquidity,   // Liquidity score 1–10
  cost,        // Operational cost
  totalAssets, // Assets currently deployed in this strategy
  isLoading
} = useActiveStrategyMetrics();
```

---

### `useStrategyMetric`

A low-level hook that reads all four performance metrics plus total managed assets from any strategy address. Used internally by `useActiveStrategyMetrics` and can also be used directly to build a strategy comparison table.

```ts
const metrics = useStrategyMetrics("0xStrategyAddress");
// Returns: { apy, risk, liquidity, cost, totalAssets, isLoading }
```

---

### `useDepositFlow`

Handles the two-transaction flow required to deposit into the vault: first an ERC-20 `approve`, then the vault `deposit`. Both transactions are awaited sequentially using `publicClient.waitForTransactionReceipt`, so the UI only moves forward once each step is confirmed on-chain.

```ts
const { deposit, isConfirming } = useDepositFlow();

// Usage
await deposit("100"); // amount in ether units (e.g. "100" MTK)
```

**Flow:**
1. `approve(VAULT_ADDRESS, amount)` on the token contract
2. Wait for approval confirmation
3. `deposit(amount, userAddress)` on the vault
4. Wait for deposit confirmation

---

### `usemintFlow`

Identical structure to `useDepositFlow` but calls the vault's `mint` function instead — used when the user wants to receive a specific number of shares rather than deposit a specific token amount.

```ts
const { mint, isConfirming } = usemintFlow();

await mint("50"); // number of shares to mint
```

---

### `useVaultActions`

Exposes the three write actions available to vault users and the owner.

```ts
const { withdraw, redeem, invest, isConfirming } = useVaultActions();

await withdraw("100"); // Pull 100 MTK worth of assets
await redeem("50");    // Burn 50 shares, receive proportional tokens
await invest();        // Owner: deploy 70% of idle balance to best strategy
```

`invest()` is gated on-chain by `onlyOwner`, so calling it from a non-owner wallet will revert. The frontend should conditionally render the invest button based on whether the connected address matches the vault owner.

---

### `strat` (Strategy Registration)

An owner-only hook that calls `setStrategies` on the vault, registering the three strategy addresses. This only needs to be called once after deployment.

```ts
const { setStrategies, isConfirming } = strat();

await setStrategies();
```

The three strategy addresses are hardcoded in the hook and should be moved to environment variables or a config file for maintainability.

---

## Wallet Integration

Wallet connection is handled by **RainbowKit**, configured with **Wagmi v2** and **Viem** as the underlying transport. RainbowKit provides the connect button, account modal, and chain switching out of the box.

Setup (in your root layout or `_app.tsx`):

```tsx
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi"; // your wagmi config

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

## Contract Configuration

All contract addresses and ABIs are centralised in `lib/contracts.ts`:

```ts
export const VAULT_ADDRESS  = "0x...";
export const TOKEN_ADDRESS  = "0x...";

export { default as Vault_ABI }    from "./abis/Vault.json";
export { default as Token_ABI }    from "./abis/Token.json";
export { default as Strategy_ABI } from "./abis/Strategy.json";
```

Switching to a different network or redeployment only requires updating this one file.

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your WalletConnect Project ID and RPC URL

# Run the dev server
npm run dev
```

### Required Environment Variables

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_RPC_URL=https://your-rpc-endpoint
```

---

## UI Features

While the UI components are not included in this repository, each hook maps directly to a view:

| Hook | UI Component |
|---|---|
| `useVaultDash` | User dashboard — wallet balance, share balance, position value, share price |
| `useActiveStrategyMetrics` | Strategy metrics card — live APY, risk, liquidity, cost |
| `useDepositFlow` | Deposit form with two-step confirmation states |
| `usemintFlow` | Mint form with share-based input |
| `useVaultActions` | Withdraw / Redeem / Invest action buttons |
| `strat` | Admin panel — strategy registration |

---

## Design Decisions

**Why sequential awaits instead of fire-and-forget?**  
The deposit and mint flows await each transaction receipt before proceeding to the next step. This is intentional — submitting a `deposit` before the `approve` is confirmed can result in a revert if the approval hasn't propagated yet, which is a confusing UX failure. Awaiting receipts costs a few extra seconds but makes the flow reliable.

**Why is `isConfirming` a composite flag?**  
In `useDepositFlow` and `usemintFlow`, the loading state combines Wagmi's `isPending` (transaction submitted but not mined) with a local `isConfirming` state (covering the full approve-then-deposit window). This means the UI's loading spinner stays active for the entire two-step process, not just one leg of it.

**Why centralise ABIs and addresses in one file?**  
Spreading contract addresses across hooks makes redeployments painful — you'd need to hunt down every reference. A single `contracts.ts` means a redeployment is one file change, not a grep-and-replace across the codebase.

**Why RainbowKit over a custom connect button?**  
RainbowKit handles wallet detection, chain switching, disconnection, and account display reliably across all major wallets. Building this from scratch would add significant complexity for zero user-facing benefit.

---

## What This Demonstrates

- Building a **multi-step Web3 transaction flow** (approve → deposit) with proper receipt awaiting and error handling.
- Composing **multiple contract reads** into a single ergonomic hook using Wagmi's `useReadContract`.
- Abstracting contract interactions behind **clean hook APIs** that UI components consume without needing to know anything about ABIs or addresses.
- Integrating **RainbowKit + Wagmi v2 + Viem** in the Next.js App Router environment.
- Designing hooks that are **reusable and composable** — `useStrategyMetrics` works standalone or composed into `useActiveStrategyMetrics`.
- Handling **loading and error states** across async multi-transaction flows in a way that keeps the UI honest and responsive.

---

## Related

- [Smart Contracts README](./README.md) — Covers the Solidity vault, strategy, and token contracts.

---

## License

MIT