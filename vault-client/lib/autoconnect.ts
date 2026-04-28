"use client";

import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";

export function AutoConnect() {
  const [mounted, setMounted] = useState(false);
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on the client and only if not already connected
    if (!mounted || isConnected) return;

    // Look for the last used connector or default to MetaMask (injected)
    const injectedConnector = connectors.find((c) => c.id === "injected");

    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  }, [mounted, isConnected, connectors, connect]);

  return null;
}