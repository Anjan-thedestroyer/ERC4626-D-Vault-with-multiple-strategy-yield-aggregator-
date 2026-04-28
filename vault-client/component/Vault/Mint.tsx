"use client";

import { useState } from "react";
import { usemintFlow } from "@/hooks/useMint";
import { PlusCircle, Loader2 } from "lucide-react";

export default function MintUI() {
  const [shares, setShares] = useState("");
  const [loading, setLoading] = useState(false);
  const { mint } = usemintFlow();

  const handleMint = async () => {
    if (!shares || isNaN(Number(shares))) return;
    setLoading(true);
    try {
      // Assuming your hook handles parseEther(shares)
      await mint(shares);
      setShares("");
    } catch (err) {
      console.error("Minting failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold">Mint Shares</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Exact Amount of Shares to Create
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-semibold transition-all"
          />
        </div>

        <button
          onClick={handleMint}
          disabled={loading || !shares}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Mint Shares"
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400">
          The vault will transfer the required MTK assets from your wallet.
        </p>
      </div>
    </div>
  );
}