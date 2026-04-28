import { useActiveStrategy } from "./activeStrategy";
import { useStrategyMetrics } from "./useStrategyMetric";

export function useActiveStrategyMetrics() {
  const active = useActiveStrategy();

  const address = active.data as `0x${string}` | undefined;

  const metrics = useStrategyMetrics(address);

  return {
    strategy: address,
    ...metrics,
    isLoading: active.isLoading || metrics.isLoading,
  };
}