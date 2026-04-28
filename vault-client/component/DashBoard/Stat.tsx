"use client";

import React from "react";
import { useStrategyMetrics } from "@/hooks/useStrategyMetric";
import { TrendingUp, ShieldAlert, Droplets, Banknote, Loader2, Settings, Wallet } from "lucide-react";
import strat from "@/hooks/strat";
import { useVaultActions } from "@/hooks/useVault";
import { formatEther } from "viem";

interface MetricsProps {
  strategyAddress: `0x${string}`;
}

export default function StrategyMetricsUI({ strategyAddress }: MetricsProps) {
  // Added totalAssets from your hook
  const { apy, risk, liquidity, totalAssets, cost, isLoading } = useStrategyMetrics(strategyAddress);
  const { setStrategies } = strat();
  const { invest } = useVaultActions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-[2rem]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (apy === undefined || risk === undefined || liquidity === undefined || cost === undefined) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-full text-slate-400">
          <Settings className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-slate-800">Strategy Not Initialized</h3>
          <p className="text-sm text-slate-400">Please link your strategy contracts to the vault.</p>
        </div>
        <button
          onClick={() => setStrategies()}
          className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-slate-200"
        >
          Initialize Strategy
        </button>
      </div>
    );
  }

  // Formatting helpers
  const formatAPY = (val: any) => (val ? `${Number(val)}%` : "0%");
  const formatScore = (val: any) => (val ? `${val}/10` : "0/10");
  
  // Format BigInt from Wei to Ether for Total Assets
  const formatAssets = (val: any) => (val ? `${parseFloat(formatEther(val)).toFixed(2)} MTK` : "0 MTK");

  const metrics = [
    { label: "Current APY", value: formatAPY(apy), icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Currently Invested", value: formatAssets(totalAssets), icon: <Banknote className="w-5 h-5 text-blue-600" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Risk Score", value: formatScore(risk), icon: <ShieldAlert className="w-5 h-5 text-orange-600" />, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Liquidity", value: formatScore(liquidity), icon: <Droplets className="w-5 h-5 text-cyan-600" />, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-bold tracking-tight text-slate-800">Strategy Performance</h2>
        </div>
        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border uppercase tracking-widest">
          Live Chain Data
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        {metrics.map((item, index) => (
          <div key={index} className="group cursor-default">
            <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              {item.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{item.label}</p>
              <p className={`text-2xl font-black ${item.color} tracking-tight`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Section */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <div>
          <p className="text-xs font-medium text-slate-400">Strategy Entry Cost</p>
          <p className="text-sm font-bold text-slate-700">{cost ? `${cost} MTK` : "0 MTK"}</p>
        </div>
        
        <button
          onClick={() => invest()}
          className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-[0.95] flex items-center gap-3 shadow-xl shadow-blue-100"
        >
          <Wallet className="w-5 h-5" />
          <span>Invest in Strategy</span>
        </button>
      </div>
    </div>
  );
}