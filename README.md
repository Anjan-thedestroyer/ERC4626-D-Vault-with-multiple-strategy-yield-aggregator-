# ERC-4626 Yield Aggregator Vault

A fully on-chain, tokenised yield aggregator built in Solidity, with a production-ready Web3 frontend. Depositors earn yield by contributing capital to a vault that autonomously scores, ranks, and routes funds to its best-performing strategy — all ERC-4626 compliant, reentrancy-safe, and accessible through a clean dApp UI.

---

## Repository Structure

```
/
├── contracts/              # Solidity smart contracts
│   ├── Vault.sol           # Core ERC-4626 vault
│   ├── Strategy.sol        # Mock strategy (IStrategy interface)
│   └── Token.sol           # Mintable/burnable ERC-20 (MTK)
│
└── vault-client/           # Next.js frontend dApp
    ├── abi/                # JSON ABI files
    ├── app/                # Next.js App Router
    │   ├── dashboard/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── provider.tsx
    ├── component/
    │   ├── DashBoard/      # SharePrice, Stat
    │   └── Vault/          # Deposit, Mint, Redeem, Withdraw
    ├── hooks/              # Custom Web3 hooks
    └── lib/                # Config, contracts, autoconnect
```

---

## Smart Contracts

### Overview

Most yield aggregators either hard-code a single strategy or rely on off-chain keepers to direct capital. This vault handles allocation entirely on-chain. Every time capital is deployed, the vault scores all registered strategies and routes funds to the winner. Rebalancing is permissionless — anyone can trigger it — keeping the vault responsive to changing market conditions without a centralised operator.

### Architecture

```
┌──────────────────────────────────────────────────┐
│                   Vault.sol                      │
│  ERC-4626 · Ownable · ReentrancyGuard            │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Strategy A │  │ Strategy B │  │  StrategyC │  │
│  │ IStrategy  │  │ IStrategy  │  │  ...       │  │
│  └────────────┘  └────────────┘  └────────────┘  │
│                                                  │
│  Scoring: APY + Liquidity − Risk − Cost          │
│  Always routes new capital → best strategy       │
│  Withdrawals drain worst strategy first          │
└──────────────────────────────────────────────────┘
```

| Contract | Purpose |
|---|---|
| `Vault.sol` | Core ERC-4626 vault. Manages deposits, withdrawals, fee accrual, and strategy routing. |
| `Strategy.sol` | Mock strategy implementing `IStrategy`. Used for testing profit/loss scenarios. |
| `Token.sol` | Mintable/burnable ERC-20 (MTK) used as the underlying asset. |

### How It Works

**Deposits & Share Issuance**

When a user deposits tokens, the vault first settles any accrued management fees by minting new shares to the owner, then calculates and issues shares based on the current exchange rate. This ensures fee dilution is reflected in the share price before new depositors enter.

```
shares = assets × totalSupply / totalAssets
```

If the vault has no shares yet, the exchange rate starts at a clean 1:1 (`1e18`), so the first depositor always gets a fair deal.

**Strategy Scoring & Rebalancing**

Each strategy exposes four metrics through the `IStrategy` interface:

```solidity
function apy()            external view returns (uint256);
function riskScore()      external view returns (uint256);
function liquidityScore() external view returns (uint256);
function cost()           external view returns (uint256);
```

The vault scores them with:

```
score = apy + liquidityScore − riskScore − cost
```

Higher APY and liquidity push the score up; higher risk and cost drag it down. The strategy with the highest score becomes `activeStrategyId`. The full ranking (worst → best) is stored in `strategyOrder`, driving withdrawal logic.

`rebalance()` is intentionally public — no access control — so anyone can update the ranking without waiting for an owner transaction.

**Capital Deployment**

When `invest()` is called by the owner, the vault:

1. Calls `rebalance()` to confirm the active strategy is current.
2. Takes 70% of its idle balance (`INVEST_PERCENTAGE = 70`).
3. Issues a precise `forceApprove` to the active strategy for exactly that amount.
4. Verifies via a before/after balance check that the strategy consumed exactly what was approved.
5. Revokes the allowance immediately after to prevent stale approvals.

The 30% idle buffer ensures small withdrawals can be serviced without touching any strategy, reducing gas costs for regular users.

**Withdrawals**

User withdrawals try the idle balance first. If that's insufficient, the vault sweeps through strategies in worst-to-best order, pulling only what's needed from each. The best-performing strategy is the last one touched.

```
if (vaultBalance < requested) {
    for each strategy (worst → best):
        pull min(needed, strategyBalance)
        stop when we have enough
}
```

Actual received amounts (`balAfter - balBefore`) are tracked rather than assumed, handling any slippage from the strategy side.

**Management Fee**

The vault charges a continuous annual fee in basis points (e.g. `200` = 2%). Fees are collected by minting new shares to the owner — no token transfers required, and the mechanism works even when the vault's idle balance is zero.

```
annualFee = totalSupply × managementFee / 10,000
feeAmount = annualFee × timeElapsed / 365 days
```

Fees are settled at the top of every user-facing function so the share price is always current before any user action.

### IStrategy Interface

Any strategy plugged into this vault must implement:

```solidity
interface IStrategy {
    function invest(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);
    function apy() external view returns (uint256);
    function riskScore() external view returns (uint256);
    function liquidityScore() external view returns (uint256);
    function cost() external view returns (uint256);
    function totalAssets(address owner) external view returns (uint256);
}
```

New strategies — lending protocols, LP positions, staking vaults — can be added as long as they conform to this interface.

### Vault Key Functions

| Function | Access | Description |
|---|---|---|
| `deposit(assets, receiver)` | Public | Deposit tokens, receive shares. |
| `mint(shares, receiver)` | Public | Mint a specific share count, pull required tokens. |
| `withdraw(assets, receiver, owner)` | Public | Burn shares, receive exact token amount. |
| `redeem(shares, receiver, owner)` | Public | Burn shares, receive proportional tokens. |
| `invest()` | Owner | Deploy 70% of idle balance to the best strategy. |
| `rebalance()` | Public | Re-score strategies and update the active one. |
| `setStrategies(strats)` | Owner | Register the three strategies. |
| `setManagementFee(newFee)` | Owner | Update the annual fee in basis points. |
| `getVaultInfo()` | View | Returns asset, totalAssets, totalSupply, exchange rate, and fee. |
| `activeStrategy()` | View | Returns the address of the currently best-ranked strategy. |

### Security Considerations

- **Reentrancy protection** — All state-changing public functions use OpenZeppelin's `ReentrancyGuard`.
- **SafeERC20** — All token transfers go through `SafeERC20`; USDT-style approvals handled with `forceApprove`.
- **Exact-amount verification** — `invest()` confirms the strategy consumed precisely the approved amount via a balance delta check.
- **Allowance hygiene** — Approvals are set to exactly the invest amount and zeroed out immediately afterward.
- **Withdrawal ordering** — Draining worst-performing strategies first protects the vault's most productive position.
- **Zero-value guards** — Deposits, mints, redeems, and withdrawals all revert on zero-amount calls.

### Smart Contract Tech Stack

- **Solidity** `^0.8.20`
- **OpenZeppelin Contracts** — ERC20, ERC4626, Ownable, ReentrancyGuard, SafeERC20
- Compatible with **Hardhat** and **Foundry**

### Smart Contract Setup

```bash
# Install dependencies
npm install

# Compile
npx hardhat compile

# Run tests
npx hardhat test
```

Or with Foundry:

```bash
forge install
forge build
forge test -vv
```

---

## Frontend dApp

### Overview

A production-ready Web3 frontend built with Next.js, Wagmi v2, Viem, and RainbowKit. The UI gives depositors a clean dashboard to manage their position and gives the vault owner a control panel to deploy capital and manage strategies — all without touching a block explorer.

### Frontend Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js (App Router) |
| Wallet Connection | RainbowKit |
| Contract Reads/Writes | Wagmi v2 |
| Blockchain Primitives | Viem |
| Language | TypeScript |

### Hook Reference

**`useVaultDash`**

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

Reads performed: `balanceOf`, `convertToAssets(shares)`, `convertToAssets(1e18)`, `activeStrategy()`, and `useBalance(TOKEN_ADDRESS)`.

---

**`useActiveStrategy` + `useActiveStrategyMetrics`**

`useActiveStrategy` fetches the address of whichever strategy is currently ranked best. `useActiveStrategyMetrics` composes that address into a full metrics read, so the UI can display live performance data without needing to know the strategy address in advance.

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

**`useStrategyMetric`**

A low-level hook that reads all four performance metrics plus total managed assets from any strategy address. Used internally by `useActiveStrategyMetrics` and can be used directly to build a strategy comparison table.

```ts
const metrics = useStrategyMetrics("0xStrategyAddress");
// Returns: { apy, risk, liquidity, cost, totalAssets, isLoading }
```

---

**`useDepositFlow`**

Handles the two-transaction flow required to deposit: first an ERC-20 `approve`, then the vault `deposit`. Both transactions are awaited sequentially using `publicClient.waitForTransactionReceipt`, so the UI only advances once each step is confirmed on-chain.

```ts
const { deposit, isConfirming } = useDepositFlow();

await deposit("100"); // amount in ether units (e.g. "100" MTK)
```

Flow: `approve(VAULT_ADDRESS, amount)` → wait for confirmation → `deposit(amount, userAddress)` → wait for confirmation.

---

**`usemintFlow`**

Identical structure to `useDepositFlow` but calls the vault's `mint` function — used when the user wants to receive a specific number of shares rather than deposit a specific token amount.

```ts
const { mint, isConfirming } = usemintFlow();

await mint("50"); // number of shares to mint
```

---

**`useVaultActions`**

Exposes the three write actions available to vault users and the owner.

```ts
const { withdraw, redeem, invest, isConfirming } = useVaultActions();

await withdraw("100"); // Pull 100 MTK worth of assets
await redeem("50");    // Burn 50 shares, receive proportional tokens
await invest();        // Owner: deploy 70% of idle balance to best strategy
```

`invest()` is gated on-chain by `onlyOwner`. The frontend should conditionally render the invest button based on whether the connected address matches the vault owner.

---

**`strat` (Strategy Registration)**

An owner-only hook that calls `setStrategies` on the vault, registering the three strategy addresses. This only needs to be called once after deployment.

```ts
const { setStrategies, isConfirming } = strat();

await setStrategies();
```

### Hook → UI Mapping

| Hook | UI Component |
|---|---|
| `useVaultDash` | User dashboard — wallet balance, share balance, position value, share price |
| `useActiveStrategyMetrics` | Strategy metrics card — live APY, risk, liquidity, cost |
| `useDepositFlow` | Deposit form with two-step confirmation states |
| `usemintFlow` | Mint form with share-based input |
| `useVaultActions` | Withdraw / Redeem / Invest action buttons |
| `strat` | Admin panel — strategy registration |

### Wallet Integration

Wallet connection is handled by **RainbowKit**, configured with **Wagmi v2** and **Viem** as the underlying transport. RainbowKit provides the connect button, account modal, and chain switching out of the box.

```tsx
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";

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

### Contract Configuration

All contract addresses and ABIs are centralised in `lib/contracts.ts`. Switching networks or redeploying requires updating only this one file.

```ts
export const VAULT_ADDRESS  = "0x...";
export const TOKEN_ADDRESS  = "0x...";

export { default as Vault_ABI }    from "./abis/Vault.json";
export { default as Token_ABI }    from "./abis/Token.json";
export { default as Strategy_ABI } from "./abis/Strategy.json";
```

### Frontend Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your WalletConnect Project ID and RPC URL

# Run the dev server
npm run dev
```

Required environment variables:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_RPC_URL=https://your-rpc-endpoint
```

---

## Design Decisions

**Why sequential awaits in deposit/mint flows?**  
Submitting a `deposit` before the `approve` is confirmed can result in a revert if the approval hasn't propagated. Awaiting receipts costs a few extra seconds but makes the flow reliable and eliminates a confusing failure mode.

**Why is `isConfirming` a composite flag?**  
In `useDepositFlow` and `usemintFlow`, the loading state combines Wagmi's `isPending` with a local `isConfirming` state covering the full approve-then-deposit window. The UI spinner stays active for the entire two-step process, not just one leg of it.

**Why centralise ABIs and addresses in one file?**  
Spreading contract addresses across hooks makes redeployments painful. A single `contracts.ts` means a redeployment is one file change.

**Why RainbowKit over a custom connect button?**  
RainbowKit handles wallet detection, chain switching, disconnection, and account display reliably across all major wallets.

**Why a 70/30 idle buffer?**  
Requiring every deposit to be immediately invested means small withdrawals always touch a strategy. Keeping 30% liquid means most withdrawals cost a simple ERC-20 transfer rather than a strategy interaction.

**Why is `rebalance()` permissionless?**  
If rebalancing were owner-only, the vault could become misconfigured relative to market conditions until the owner acts. Making it public means anyone — including MEV bots or automated scripts — can keep the vault optimal.

**Why mint shares for fees instead of pulling tokens?**  
Minted-share fees require no token transfers and work even when the vault's idle balance is zero. Fee accounting is also transparent and auditable directly from share supply history.

**Why bubble sort for strategy ranking?**  
With exactly three strategies, a bubble sort is three comparisons. Readable, correct, and cheap.

---

## What This Demonstrates

- Implementing the **ERC-4626 tokenised vault standard** from scratch, including all four entry points (`deposit`, `mint`, `withdraw`, `redeem`).
- Designing a **modular strategy system** behind a clean interface, making the vault extensible without touching core logic.
- Writing **fee mechanics** that are economically correct (share dilution, time-weighted accrual) and DoS-resistant.
- Thinking carefully about **withdrawal ordering** to protect the vault's best-performing capital.
- Applying **security best practices** — reentrancy guards, SafeERC20, exact-amount verification, allowance hygiene — throughout the contracts.
- Building a **multi-step Web3 transaction flow** (approve → deposit) with proper receipt awaiting and error handling.
- Composing **multiple contract reads** into ergonomic hooks using Wagmi's `useReadContract`.
- Abstracting contract interactions behind **clean hook APIs** so UI components never need to know about ABIs or addresses.
- Integrating **RainbowKit + Wagmi v2 + Viem** in the Next.js App Router environment.
- Handling **loading and error states** across async multi-transaction flows in a way that keeps the UI honest and responsive.

---

## License

MIT