import { Strategy_ABI, Vault_ABI, VAULT_ADDRESS} from "@/lib/contracts";
import { useWriteContract, useAccount } from "wagmi";
import { Abi, parseEther } from "viem";

export default function strat(){
    const {address} = useAccount();
    const {writeContractAsync,isPending: isConfirming} = useWriteContract();
   const strategies = [
  "0x94C80D23fcba5b6bAfe003BD4dfb9530A64E9226", // Strategy 1
  "0xb52Bbc52d217E3860b7C1F2EfbBaa7884BAae07c", // Strategy 2
  "0x6DBDa107E837Eb85Bc225218aE230D585371500a"  // Strategy 3
];

    const setStrategies = async () => {
    if (!address) throw new Error("Connect wallet");
        
    return writeContractAsync({
      address: VAULT_ADDRESS,
      abi: Vault_ABI.abi as Abi,
      functionName: "setStrategies",
      account: address,
      args: [strategies],
    });
  };
  return{
    setStrategies,
    isConfirming
  }
}