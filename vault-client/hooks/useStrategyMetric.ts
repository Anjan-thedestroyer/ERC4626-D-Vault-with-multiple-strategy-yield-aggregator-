import { useReadContract } from "wagmi";
import { Strategy_ABI } from "@/lib/contracts";

export function useStrategyMetrics(address?: `0x${string}`) {
  const apy = useReadContract({
    address,
    abi: Strategy_ABI.abi,
    functionName: "apy",
  });

  const risk = useReadContract({
    address,
    abi: Strategy_ABI.abi,
    functionName: "riskScore",
  });

  const liquidity = useReadContract({
    address,
    abi: Strategy_ABI.abi,
    functionName: "liquidityScore",
  });

  const cost = useReadContract({
    address,
    abi: Strategy_ABI.abi,
    functionName: "cost",
  });
  const totalAssets = useReadContract({
    address,
    abi:Strategy_ABI.abi ,
    functionName:"totalAssets",
    args:[address]
  })

  return {
    apy: apy.data,
    risk: risk.data,
    liquidity: liquidity.data,
    cost: cost.data,
    totalAssets:totalAssets.data,

    isLoading:
      apy.isLoading ||
      risk.isLoading ||
      liquidity.isLoading ||
      cost.isLoading ||
      totalAssets.isLoading
  };
}