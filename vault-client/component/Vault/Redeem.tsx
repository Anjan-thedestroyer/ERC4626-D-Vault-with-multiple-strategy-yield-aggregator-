"use client";

import { useState } from "react";
import { useVaultActions } from "@/hooks/useVault";
import { parseEther } from "viem";
import { Flame, Loader2 } from "lucide-react";
import { stringify } from "querystring";

export default function RedeemUI() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { redeem } = useVaultActions();

  const handleRedeem = async () => {
    if (!amount || isNaN(Number(amount))) return;
    setLoading(true);
    try {
      await redeem(amount);
      setAmount("");
    } catch (err) {
      console.error("Redemption failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Flame className="w-5 h-5 text-orange-600" />
        </div>
        <h2 className="text-xl font-bold">Redeem Shares</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Amount of Shares to Burn
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-lg font-semibold transition-all"
          />
        </div>

        <button
          onClick={handleRedeem}
          disabled={loading || !amount}
          className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Redeem Shares"}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          You will receive the underlying tokens relative to shares burnt.
        </p>
      </div>
    </div>
  );
}