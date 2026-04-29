# ERC-4626 Yield Aggregator Vault

A fully on-chain, tokenised yield aggregator built on Solidity. Depositors earn yield by contributing capital to a vault that autonomously scores, ranks, and routes funds to whichever of its plugged-in strategies is performing best at any given moment — all while remaining ERC-4626 compliant and reentrancy-safe.

---

## Overview

Most yield aggregators either hard-code a single strategy or require off-chain keepers to decide where capital should go. This vault handles allocation entirely on-chain. Every time capital is deployed, the vault runs a scoring function across all registered strategies and directs funds to the winner. Rebalancing is permissionless — anyone can trigger it — which means the vault stays responsive to changing market conditions without relying on a centralised bot or admin.

The core idea is simple: give the vault a standardised interface that every strategy must implement, define a scoring formula that balances return against risk and liquidity, and let the math decide.

---

## Architecture

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

### Contracts

| Contract | Purpose |
|---|---|
| `Vault.sol` | The core ERC-4626 vault. Manages deposits, withdrawals, fee accrual, and strategy routing. |
| `Strategy.sol` | A mock strategy implementing `IStrategy`. Used for testing profit/loss scenarios. |
| `Token.sol` | A mintable/burnable ERC-20 (MTK) used as the underlying asset in tests. |

---

## How It Works

### Deposits & Share Issuance

When a user deposits tokens, the vault first settles any accrued management fees (by minting new shares to the owner), then calculates and issues shares based on the current exchange rate. This ensures fee dilution is always reflected in the share price before new depositors enter.

```
shares = assets × totalSupply / totalAssets
```

If the vault has no shares yet, the exchange rate starts at a clean 1:1 (`1e18`), so the first depositor always gets a fair deal.

### Strategy Scoring & Rebalancing

Each strategy exposes four metrics through the `IStrategy` interface:

```solidity
function apy()            external view returns (uint256);
function riskScore()      external view returns (uint256);
function liquidityScore() external view returns (uint256);
function cost()           external view returns (uint256);
```

The vault scores them with this formula:

```
score = apy + liquidityScore − riskScore − cost
```

Higher APY and liquidity push the score up. Higher risk and operational cost drag it down. The strategy with the highest score becomes `activeStrategyId`. The full ranking (worst → best) is stored in `strategyOrder`, which drives the withdrawal logic.

`rebalance()` is intentionally public — there's no access control on it — so anyone can update the ranking at any time without needing to wait for an owner transaction.

### Capital Deployment

When `invest()` is called by the owner, the vault:

1. Calls `rebalance()` to make sure the active strategy is current.
2. Takes 70% of its idle balance (`INVEST_PERCENTAGE = 70`).
3. Issues a precise `forceApprove` to the active strategy for exactly that amount.
4. Verifies via a before/after balance check that the strategy consumed exactly what was approved.
5. Revokes the allowance immediately after to prevent stale approvals.

The 30% idle buffer ensures small withdrawals can be serviced without touching any strategy at all — reducing gas costs and latency for regular users.

### Withdrawals

User withdrawals try the idle balance first. If that's not enough, the vault sweeps through strategies in worst-to-best order, pulling only what's needed from each. This means the best-performing strategy is the last one touched, preserving its position as long as possible.

```
if (vaultBalance < requested) {
    for each strategy (worst → best):
        pull min(needed, strategyBalance)
        stop when we have enough
}
```

Slippage is handled correctly — the vault tracks actual received amounts (`balAfter - balBefore`) rather than assuming strategies always return what they're asked for.

### Management Fee

The vault charges a continuous annual management fee expressed in basis points (e.g. `200` = 2%). Rather than transferring tokens, fees are collected by minting new shares to the owner — the standard approach for ERC-4626 vaults, as it dilutes existing holders proportionally rather than requiring a token pull.

```
annualFee = totalSupply × managementFee / 10,000
feeAmount = annualFee × timeElapsed / 365 days
```

Fees are settled at the top of every user-facing function (`deposit`, `mint`, `redeem`, `withdraw`) so the share price is always current before any user action.

---

## Security Considerations

- **Reentrancy protection** — All state-changing public functions use OpenZeppelin's `ReentrancyGuard`.
- **SafeERC20** — All token transfers go through `SafeERC20` to handle non-standard tokens (e.g. USDT's approval quirks are handled with `forceApprove`).
- **Exact-amount verification** — The `invest()` function confirms the strategy consumed precisely the approved amount via a balance delta check, preventing any discrepancy from silently passing.
- **Allowance hygiene** — Approvals are set to exactly the invest amount and zeroed out immediately afterward.
- **Withdrawal ordering** — Draining worst-performing strategies first means a sudden withdrawal won't destroy the vault's most productive position.
- **Zero-value guards** — Deposits, mints, redeems, and withdrawals all revert on zero-amount calls.

---

## IStrategy Interface

Any strategy plugged into this vault must implement the following interface:

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

This makes the vault modular. New strategies — lending protocols, LP positions, staking vaults — can be swapped in as long as they conform to this interface.

---

## Key Functions

### Vault

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
| `activeStrategy()` | View | Returns the address of the currently ranked best strategy. |

### Strategy (Mock)

| Function | Description |
|---|---|
| `invest(amount)` | Accepts capital from the vault. |
| `withdraw(amount)` | Returns capital to the vault. |
| `simulateProfit(amount)` | Mints tokens to fake yield — test only. |
| `simulateLoss(amount)` | Burns tokens to fake a hack or loss — test only. |

---

## Tech Stack

- **Solidity** `^0.8.20`
- **OpenZeppelin Contracts** — ERC20, ERC4626, Ownable, ReentrancyGuard, SafeERC20
- Designed to be tested with **Hardhat** or **Foundry**

---

## Local Setup

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

## Design Decisions Worth Noting

**Why 70/30 idle buffer?**  
Requiring every deposit to be immediately invested would make small withdrawals expensive (they'd always need to touch a strategy). Keeping 30% liquid means most withdrawals cost a simple ERC-20 transfer rather than a strategy interaction.

**Why is `rebalance()` permissionless?**  
If rebalancing were owner-only, the vault could become misconfigured relative to current market conditions until the owner acts. Making it public means anyone — including MEV bots, users, or automated scripts — can keep the vault optimal. There's no harm in calling it frequently.

**Why mint shares for fees instead of pulling tokens?**  
Taking fees as minted shares means there are no token transfers required and the mechanism works even if the vault's idle balance is zero. It also makes the fee accounting transparent and auditable directly from share supply history.

**Why bubble sort for strategy ranking?**  
With exactly three strategies, a bubble sort is three comparisons. There's no reason to add complexity here — it's readable, correct, and cheap.

---

## What This Demonstrates

This project was built to showcase practical DeFi engineering skills:

- Implementing the **ERC-4626 tokenised vault standard** from scratch, including all four entry points (`deposit`, `mint`, `withdraw`, `redeem`).
- Designing a **modular strategy system** using a clean interface, making the vault extensible without touching core logic.
- Writing **fee mechanics** that are economically correct (share dilution, time-weighted accrual) and DoS-resistant.
- Thinking carefully about **withdrawal ordering** to protect the vault's best-performing capital.
- Applying **security best practices** — reentrancy guards, SafeERC20, exact-amount verification, allowance hygiene — throughout.
- Building **test infrastructure** with controllable mock contracts that can simulate real-world events like protocol hacks and yield generation.

---

## License

MIT