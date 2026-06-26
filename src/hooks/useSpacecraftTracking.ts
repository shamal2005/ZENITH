import { useQuery } from "@tanstack/react-query";
import { fetchTLEFromServer, propagateTLE } from "../lib/spacecraftService";
import { useEffect, useState } from "react";

export interface Spacecraft {
  id: string;
  name: string;
  noradId: number;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  timestamp: number | null;
}

export const SPACECRAFT_LIST = [
  { id: "iss", name: "International Space Station", noradId: 25544 },
  { id: "hubble", name: "Hubble Space Telescope", noradId: 20580 },
  { id: "tiangong", name: "Tiangong Space Station", noradId: 48274 },
  { id: "starlink", name: "Starlink-1209", noradId: 45206 },
  { id: "landsat", name: "Landsat 9", noradId: 49260 },
];

export interface SpacecraftTrackingState {
  loading: boolean;
  error: Error | null;
  spacecrafts: Spacecraft[];
}

export function useSpacecraftTracking(): SpacecraftTrackingState {
  // Query TLEs for each spacecraft
  const issQuery = useQuery({
    queryKey: ["tle", 25544],
    queryFn: () => fetchTLEFromServer({ data: { noradId: 25544 } }),
    staleTime: 60 * 60 * 1000, // 1 hour stale time since TLEs don't change fast
  });

  const hubbleQuery = useQuery({
    queryKey: ["tle", 20580],
    queryFn: () => fetchTLEFromServer({ data: { noradId: 20580 } }),
    staleTime: 60 * 60 * 1000,
  });

  const tiangongQuery = useQuery({
    queryKey: ["tle", 48274],
    queryFn: () => fetchTLEFromServer({ data: { noradId: 48274 } }),
    staleTime: 60 * 60 * 1000,
  });

  const starlinkQuery = useQuery({
    queryKey: ["tle", 45206],
    queryFn: () => fetchTLEFromServer({ data: { noradId: 45206 } }),
    staleTime: 60 * 60 * 1000,
  });

  const landsatQuery = useQuery({
    queryKey: ["tle", 49260],
    queryFn: () => fetchTLEFromServer({ data: { noradId: 49260 } }),
    staleTime: 60 * 60 * 1000,
  });

  const [positions, setPositions] = useState<
    Record<string, { latitude: number; longitude: number; altitude: number; timestamp: number }>
  >({});

  useEffect(() => {
    const updatePositions = () => {
      const now = new Date();
      const nextPositions: typeof positions = {};

      if (issQuery.data) {
        const pos = propagateTLE(issQuery.data.line1, issQuery.data.line2, now);
        if (pos) nextPositions.iss = pos;
      }
      if (hubbleQuery.data) {
        const pos = propagateTLE(hubbleQuery.data.line1, hubbleQuery.data.line2, now);
        if (pos) nextPositions.hubble = pos;
      }
      if (tiangongQuery.data) {
        const pos = propagateTLE(tiangongQuery.data.line1, tiangongQuery.data.line2, now);
        if (pos) nextPositions.tiangong = pos;
      }
      if (starlinkQuery.data) {
        const pos = propagateTLE(starlinkQuery.data.line1, starlinkQuery.data.line2, now);
        if (pos) nextPositions.starlink = pos;
      }
      if (landsatQuery.data) {
        const pos = propagateTLE(landsatQuery.data.line1, landsatQuery.data.line2, now);
        if (pos) nextPositions.landsat = pos;
      }

      setPositions(nextPositions);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000); // 1s refresh rate
    return () => clearInterval(interval);
  }, [issQuery.data, hubbleQuery.data, tiangongQuery.data, starlinkQuery.data, landsatQuery.data]);

  const loading =
    (issQuery.isLoading && !positions.iss) ||
    (hubbleQuery.isLoading && !positions.hubble) ||
    (tiangongQuery.isLoading && !positions.tiangong) ||
    (starlinkQuery.isLoading && !positions.starlink) ||
    (landsatQuery.isLoading && !positions.landsat);

  const error = (issQuery.error || hubbleQuery.error || tiangongQuery.error || starlinkQuery.error || landsatQuery.error || null) as Error | null;

  const spacecrafts = SPACECRAFT_LIST.map((sc) => {
    const pos = positions[sc.id];
    return {
      id: sc.id,
      name: sc.name,
      noradId: sc.noradId,
      latitude: pos?.latitude ?? null,
      longitude: pos?.longitude ?? null,
      altitude: pos?.altitude ?? null,
      timestamp: pos?.timestamp ?? null,
    };
  });

  return {
    loading,
    error,
    spacecrafts,
  };
}
