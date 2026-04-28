"use client";
import { VAULT_ADDRESS } from "@/lib/contracts";
import { useEffect, useState } from "react";
import { useVaultDash } from "@/hooks/useVaultDash";
import { Wallet, Landmark, TrendingUp, RefreshCw, ChevronRight, Activity } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// UI Components
import DepositUI from "@/component/Vault/Deposit";
import MintUI from "../Vault/Mint";
import WithdrawUI from "../Vault/Withdraw";
import RedeemUI from "../Vault/Redeem";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [inputShares, setInputShares] = useState("1");
  const { shareValue, walletBalance, shares, isLoading } = useVaultDash();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const formatAsEther = (val: any) => {
    if (!val || val === 0n) return "0.00";
    return Number(formatEther(val)).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen text-slate-900">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border shadow-sm gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">Vault Dashboard</h1>
          <p className="text-slate-400 text-xs font-mono bg-slate-50 px-2 py-1 rounded inline-block">
            {VAULT_ADDRESS}
          </p>
        </div>
        <ConnectButton />
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Wallet Balance", val: walletBalance, unit: "MTK", icon: <Wallet className="text-blue-500" />, color: "bg-blue-50" },
          { label: "Owned Shares", val: shares, unit: "SHARES", icon: <Landmark className="text-purple-500" />, color: "bg-purple-50" },
          { label: "Share Price", val: shareValue, unit: "MTK", icon: <TrendingUp className="text-orange-500" />, color: "bg-orange-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 ${stat.color} rounded-xl`}>{stat.icon}</div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border uppercase tracking-widest">
                {stat.unit}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-3xl font-black tracking-tight">
                {isLoading ? <span className="animate-pulse">...</span> : formatAsEther(stat.val)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* --- HORIZONTAL ACTIONS ROW --- */}
      <section className="bg-white p-8 rounded-3xl border shadow-sm space-y-8">
        <div className="flex items-center gap-3 border-b pb-5">
          <div className="p-2 bg-slate-900 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Vault Operations</h2>
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <DepositUI />
          <WithdrawUI />
          <MintUI />
          <RedeemUI />
        </div>
      </section>

      {/* --- CALCULATOR SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="bg-white border rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 bg-blue-600 rounded-lg">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Quick Conversion</h2>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Input Shares</label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputShares}
                    onChange={(e) => setInputShares(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-2xl font-bold outline-none transition-all shadow-inner"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-300">SH</span>
                </div>
              </div>

              <div className="hidden md:block">
                <ChevronRight className="w-10 h-10 text-slate-200" />
              </div>

              <div className="flex-1 w-full p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Estimated Asset Value</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-black text-blue-600 tracking-tighter">
                    {formatAsEther((BigInt(parseEther(inputShares || "0")) * BigInt(shareValue || 0n)) / parseEther("1"))}
                  </p>
                  <span className="text-blue-400 font-black text-lg">MTK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

     
    </div>
  );
}