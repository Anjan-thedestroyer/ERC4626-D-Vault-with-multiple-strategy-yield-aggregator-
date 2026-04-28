'use client'
import React from 'react'
import DashboardUI from "@/component/DashBoard/SharePrice"
import StrategyMetricsUI from '@/component/DashBoard/Stat'
import { useVaultDash } from '@/hooks/useVaultDash'
const DashBoard = () => {
  const {stratAddress} = useVaultDash();
  return (
    <div>
    <DashboardUI/>
    <StrategyMetricsUI strategyAddress={ stratAddress as `0x${string}`}/>
    </div>
  )
}

export default DashBoard