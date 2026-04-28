import { useAccount, useReadContract, useBalance } from "wagmi";
import { Vault_ABI, VAULT_ADDRESS, TOKEN_ADDRESS } from "@/lib/contracts";
import { Abi } from "viem";

export function useVaultDash() {
  const { address } = useAccount();

  // Fetches your Mock Token balance (MTK)
  const { data: walletBalance, refetch: refetchBalance } = useBalance({
    address: address,
    token: TOKEN_ADDRESS,
  });

  // Fetches how many Shares you own
  const { data: shares, isLoading: sharesLoading } = useReadContract({
    address: VAULT_ADDRESS,
    abi: Vault_ABI.abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Converts those shares into the Token equivalent
  const { data: convertVaultValue, isLoading: valueLoading } = useReadContract({
    address: VAULT_ADDRESS,
    abi: Vault_ABI.abi,
    functionName: "convertToAssets",
    args: shares ? [shares] : undefined,
    query: { enabled: !!shares },
  });

  // Shows the price of exactly 1.00 Share
  const { data: shareValue } = useReadContract({
    address: VAULT_ADDRESS,
    abi: Vault_ABI.abi,
    functionName: "convertToAssets",
    args: [BigInt(1e18)],
  });
  
  const {data: stratAddress} = useReadContract({
    address: VAULT_ADDRESS,
    abi:Vault_ABI.abi as Abi,
    functionName:"activeStrategy"
  })

  return {
    walletBalance: walletBalance?.value,
    shares,
    convertVaultValue,
    shareValue,
    stratAddress,
    isLoading: sharesLoading || valueLoading,
    refetchBalance
  };
}