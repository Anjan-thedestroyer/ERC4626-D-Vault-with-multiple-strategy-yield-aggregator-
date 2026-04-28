"use client";

import { useState } from "react";
import { useVaultActions } from "@/hooks/useVault";
import { parseEther } from "viem";
import { LogOut, Loader2 } from "lucide-react";

export default function WithdrawUI() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { withdraw } = useVaultActions();

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    try {
      await withdraw(amount);
      setAmount("");
    } catch (err) {
      console.error("Withdrawal failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-red-50 rounded-lg">
          <LogOut className="w-5 h-5 text-red-600" />
        </div>
        <h2 className="text-xl font-bold">Withdraw Assets</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Amount of Tokens to Receive
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-lg font-semibold transition-all"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={loading || !amount}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Withdraw Tokens"}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          The vault will calculate and burn the required shares.
        </p>
      </div>
    </div>
  );
}