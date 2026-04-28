import { useWriteContract, useAccount } from "wagmi";
import { Abi, parseEther } from "viem";
import { Vault_ABI, VAULT_ADDRESS } from "@/lib/contracts";

export function useVaultActions() {
  const { address } = useAccount();
  const { writeContractAsync, isPending: isConfirming } = useWriteContract();

  const withdraw = async (assets: string) => {
    if (!address) throw new Error("Connect wallet");
    
    const parsedAmount = parseEther(assets);
    
    return writeContractAsync({
      address: VAULT_ADDRESS,
      abi: Vault_ABI.abi as Abi,
      functionName: "withdraw",
      args: [parsedAmount, address, address],
    });
  };

  const redeem = async (shares: string) => {
    if (!address) throw new Error("Connect wallet");
    
    
    const parsedShares = parseEther(shares); 

    return writeContractAsync({
      address: VAULT_ADDRESS,
      abi: Vault_ABI.abi as Abi,
      functionName: "redeem",
      args: [parsedShares, address, address],
    });
  };
  const invest = async()=>{
    if (!address) throw new Error("Connect wallet");
    return writeContractAsync({
      address:VAULT_ADDRESS,
      abi:Vault_ABI.abi,
      account:address,
      functionName:"invest"
    })

  }

  return {
    withdraw,
    redeem,
    invest,
    isConfirming // Export this so your UI can show the loading spinner
  };
}