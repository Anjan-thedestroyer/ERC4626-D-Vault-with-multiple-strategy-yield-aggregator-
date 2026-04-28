import { useReadContract } from "wagmi";
import { VAULT_ADDRESS, Vault_ABI } from "@/lib/contracts";

export function useActiveStrategy() {
  return useReadContract({
    address: VAULT_ADDRESS,
    abi: Vault_ABI as any,
    functionName: "activeStrategy",
  });
}