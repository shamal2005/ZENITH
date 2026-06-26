import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import * as satellite from "satellite.js";
import * as Cesium from "cesium";
import { fetchDebrisTLEs, propagateDebrisTLE, fetchGraveyardObjects } from "../lib/spacecraftService";

export interface DebrisObject {
  id: string;
  name: string;
  category: "debris" | "rocketBody" | "inactiveSatellite" | "featured";
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  position: { x: number; y: number; z: number } | null;
  velocity: { x: number; y: number; z: number } | null;
  positionProperty: Cesium.CallbackProperty;
}

export interface OrbitalDebrisState {
  loading: boolean;
  error: Error | null;
  debris: DebrisObject[];
}

export function useOrbitalDebris(isGraveyard: boolean = false): OrbitalDebrisState {
  const { data: debrisTles, isLoading: isDebrisLoading, error: debrisError } = useQuery({
    queryKey: ["debris-tles"],
    queryFn: () => fetchDebrisTLEs(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours caching since TLEs change slowly
    enabled: isGraveyard,
  });

  const { data: graveyardTles, isLoading: isGraveyardLoading, error: graveyardError } = useQuery({
    queryKey: ["graveyard-tles"],
    queryFn: () => fetchGraveyardObjects(),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: isGraveyard,
  });

  const [realtimeData, setRealtimeData] = useState<
    Record<string, { latitude: number; longitude: number; altitude: number; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } }>
  >({});

  // 1-second interval to update coordinates in React state for panel/logic reuse
  useEffect(() => {
    if (!isGraveyard || (!debrisTles && !graveyardTles)) {
      setRealtimeData({});
      return;
    }

    const updatePositions = () => {
      const now = new Date();
      const nextData: typeof realtimeData = {};

      if (debrisTles) {
        debrisTles.forEach((item, idx) => {
          const id = `debris-${idx}`;
          const pos = propagateDebrisTLE(item.line1, item.line2, now);
          if (pos) {
            nextData[id] = pos;
          }
        });
      }

      if (graveyardTles) {
        graveyardTles.forEach((item) => {
          const id = item.id;
          const pos = propagateDebrisTLE(item.line1, item.line2, now);
          if (pos) {
            nextData[id] = pos;
          }
        });
      }

      setRealtimeData(nextData);
    };

    updatePositions();
    const interval = setInterval(updatePositions, 1000);
    return () => clearInterval(interval);
  }, [debrisTles, graveyardTles, isGraveyard]);

  // Create stable CallbackProperties for smooth frame-by-frame rendering in Cesium
  const debris = useMemo(() => {
    const list: DebrisObject[] = [];

    if (debrisTles) {
      debrisTles.forEach((item, idx) => {
        const id = `debris-${idx}`;
        const satrec = satellite.twoline2satrec(item.line1, item.line2);

        const positionProperty = new Cesium.CallbackProperty((time) => {
          if (!time) return undefined as any;
          const date = Cesium.JulianDate.toDate(time);
          try {
            const positionAndVelocity = satellite.propagate(satrec, date);
            if (
              !positionAndVelocity ||
              !positionAndVelocity.position ||
              typeof positionAndVelocity.position === "boolean"
            ) {
              return undefined as any;
            }
            const posEci = positionAndVelocity.position;
            const gmst = satellite.gstime(date);
            const posEcf = satellite.eciToEcf(posEci, gmst);
            return new Cesium.Cartesian3(
              posEcf.x * 1000.0,
              posEcf.y * 1000.0,
              posEcf.z * 1000.0
            );
          } catch (e) {
            return undefined as any;
          }
        }, false);

        const realData = realtimeData[id];

        list.push({
          id,
          name: item.name,
          category: "debris",
          latitude: realData?.latitude ?? null,
          longitude: realData?.longitude ?? null,
          altitude: realData?.altitude ?? null,
          position: realData?.position ?? null,
          velocity: realData?.velocity ?? null,
          positionProperty,
        });
      });
    }

    if (graveyardTles) {
      graveyardTles.forEach((item) => {
        const id = item.id;
        const satrec = satellite.twoline2satrec(item.line1, item.line2);

        const positionProperty = new Cesium.CallbackProperty((time) => {
          if (!time) return undefined as any;
          const date = Cesium.JulianDate.toDate(time);
          try {
            const positionAndVelocity = satellite.propagate(satrec, date);
            if (
              !positionAndVelocity ||
              !positionAndVelocity.position ||
              typeof positionAndVelocity.position === "boolean"
            ) {
              return undefined as any;
            }
            const posEci = positionAndVelocity.position;
            const gmst = satellite.gstime(date);
            const posEcf = satellite.eciToEcf(posEci, gmst);
            return new Cesium.Cartesian3(
              posEcf.x * 1000.0,
              posEcf.y * 1000.0,
              posEcf.z * 1000.0
            );
          } catch (e) {
            return undefined as any;
          }
        }, false);

        const realData = realtimeData[id];

        list.push({
          id,
          name: item.name,
          category: item.category,
          latitude: realData?.latitude ?? null,
          longitude: realData?.longitude ?? null,
          altitude: realData?.altitude ?? null,
          position: realData?.position ?? null,
          velocity: realData?.velocity ?? null,
          positionProperty,
        });
      });
    }

    return list;
  }, [debrisTles, graveyardTles, realtimeData]);

  return {
    loading: (isDebrisLoading || isGraveyardLoading) && debris.length === 0,
    error: (debrisError || graveyardError) as Error | null,
    debris,
  };
}

