"use client";

import React, { useState } from "react";
import { useDepositFlow } from "@/hooks/useDeposit"; 
import { useAccount } from "wagmi";
import { parseEther } from "viem"; // Ensure this is available if needed

export default function DepositUI() {
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();
  
  const { deposit, isConfirming } = useDepositFlow();
  const isLoading = isConfirming;

  const handleDeposit = () => {
    if (!amount || isNaN(Number(amount))) return;
    // We pass the string "10" to the hook, 
    // and the hook should handle parseEther(amount)
    deposit(amount); 
    setAmount("");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm font-sans">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Vault Deposit</h2>
        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Ether Units</span>
      </div>
      
      <div className="my-4 p-2 rounded bg-gray-50 text-[10px] font-mono text-gray-500 break-all">
        {address ? `Wallet: ${address}` : "Wallet Not Connected"}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
            disabled={isLoading}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">MTK</span>
        </div>

        <button
          onClick={handleDeposit}
          disabled={isLoading || !amount || !isConnected}
          className={`w-full py-4 rounded-lg font-bold text-white transition-all
            ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"}`}
        >
          {isLoading ? "Transaction Pending..." : `Deposit ${amount || ""} MTK`}
        </button>

        {isLoading && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
             <div className="animate-pulse flex space-x-2 justify-center text-blue-600 text-[10px] font-black tracking-widest">
                <span>●</span><span>●</span><span>●</span>
                <span className="ml-2 uppercase">Check MetaMask to Confirm</span>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}