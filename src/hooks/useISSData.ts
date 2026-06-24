import { useQuery } from "@tanstack/react-query";
import { fetchISSTelemetry, ISSTelemetry } from "../lib/issService";

export interface ISSDataState {
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  loading: boolean;
  error: Error | null;
}

export function useISSData(): ISSDataState {
  const { data, isLoading, error } = useQuery<ISSTelemetry, Error>({
    queryKey: ["iss-telemetry"],
    queryFn: fetchISSTelemetry,
    refetchInterval: 5000, // Refresh automatically every 5 seconds
    refetchIntervalInBackground: true, // Keep polling in the background
    staleTime: 4000,
  });

  return {
    latitude: data?.latitude ?? null,
    longitude: data?.longitude ?? null,
    timestamp: data?.timestamp ?? null,
    loading: isLoading,
    error: error,
  };
}
