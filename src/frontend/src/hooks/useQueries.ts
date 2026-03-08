import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Garden, GardenStats } from "../backend.d";
import { useActor } from "./useActor";

export function useGetGarden() {
  const { actor, isFetching } = useActor();
  return useQuery<Garden>({
    queryKey: ["garden"],
    queryFn: async () => {
      if (!actor)
        return {
          plots: Array(12).fill(null),
          stats: { totalBlooms: 0n, totalWaters: 0n },
        };
      return actor.getGarden();
    },
    enabled: !!actor && !isFetching,
    refetchOnWindowFocus: false,
  });
}

export function useGetStats() {
  const { actor, isFetching } = useActor();
  return useQuery<GardenStats>({
    queryKey: ["stats"],
    queryFn: async () => {
      if (!actor) return { totalBlooms: 0n, totalWaters: 0n };
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
    refetchOnWindowFocus: false,
  });
}

export function usePlantSeed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plotIndex,
      seedType,
    }: { plotIndex: bigint; seedType: string }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.plantSeed(plotIndex, seedType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useWaterPlant() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plotIndex }: { plotIndex: bigint }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.waterPlant(plotIndex);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useClearPlot() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plotIndex }: { plotIndex: bigint }) => {
      if (!actor) throw new Error("Not authenticated");
      await actor.clearPlot(plotIndex);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
