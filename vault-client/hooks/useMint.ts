import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from "wagmi";
import { Abi, parseEther } from "viem";
import { Vault_ABI, VAULT_ADDRESS, Token_ABI, TOKEN_ADDRESS } from "@/lib/contracts";
import React from "react";

export function usemintFlow() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract();
  
  const [isConfirming, setIsConfirming] = React.useState(false);

  const mint = async (amount: string) => {
    if (!address) throw new Error("Wallet not connected");
    const parsedAmount = parseEther(amount);

    try {
      setIsConfirming(true);

      const approveHash = await writeContractAsync({
        address: TOKEN_ADDRESS,
        abi: Token_ABI.abi as Abi,
        functionName: "approve",
        args: [VAULT_ADDRESS, parsedAmount]  
      });
      
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      const mintHash = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: Vault_ABI.abi as Abi,
        functionName: "mint",
        args: [parsedAmount, address]
      });

      await publicClient?.waitForTransactionReceipt({ hash: mintHash });
      
      return mintHash;
    } catch (error) {
      console.error("mint failed:", error);
      throw error;
    } finally {
      setIsConfirming(false); // Stop loading UI
    }
  };

  return { 
    mint, 
    isConfirming: isSubmitting || isConfirming 
  };
}