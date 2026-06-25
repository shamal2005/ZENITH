import { useEffect, useState } from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PlanetData {
  name: string;
  visible: boolean;
  altitude: number;
  azimuth: number;
  isFallback?: boolean;
}

export interface UseVisiblePlanetsResult {
  planets: PlanetData[];
  loading: boolean;
  error: Error | null;
}

const InputSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timeStr: z.string(),
});

// Define the server function to fetch planet positions bypassing CORS.
// In React Start, this function executes only on the server.
export const fetchVisiblePlanetsOnServer = createServerFn({ method: "GET" })
  .validator(InputSchema)
  .handler(async ({ data: { lat, lng, timeStr } }) => {
    try {
      const date = new Date(timeStr);
    
    // Helper to format ISO time into YYYY-MM-DD HH:mm for NASA Horizons
    const formatHorizonsTime = (d: Date) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const hours = String(d.getUTCHours()).padStart(2, "0");
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const startTime = formatHorizonsTime(date);
    const stopTime = formatHorizonsTime(new Date(date.getTime() + 60000));

    // Horizons requires start/stop dates wrapped in single quotes, URL encoded
    const startStr = `%27${encodeURIComponent(startTime)}%27`;
    const stopStr = `%27${encodeURIComponent(stopTime)}%27`;

    const planetIds = {
      Mercury: "199",
      Venus: "299",
      Mars: "499",
      Jupiter: "599",
      Saturn: "699",
    };

    const results = [];
    for (const [name, id] of Object.entries(planetIds)) {
      try {
        // Query observer table for elevation/azimuth (quantity 4)
        const url = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=${id}&OBJ_DATA=NO&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER&CENTER=coord@399&COORD_TYPE=GEODETIC&SITE_COORD=%27${lng},${lat},0%27&START_TIME=${startStr}&STOP_TIME=${stopStr}&STEP_SIZE=1m&QUANTITIES=4`;
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        
        const json = await res.json();
        const resultText = json.result;
        if (!resultText) {
          throw new Error(`No result text returned`);
        }
        
        // Find indices of start and end markers
        const soe = resultText.indexOf("$$SOE");
        const eoe = resultText.indexOf("$$EOE");
        if (soe === -1 || eoe === -1) {
          throw new Error(`SOE/EOE markers not found in Horizons response`);
        }
        
        const dataStr = resultText.substring(soe + 5, eoe).trim();
        const firstLine = dataStr.split("\n")[0]?.trim();
        if (!firstLine) {
          throw new Error(`No data rows returned in ephemeris`);
        }
        
        // Parsing line: Azi_(a-app)_Elev is located in the last two fields
        const parts = firstLine.split(/\s+/).filter(Boolean);
        const altitude = parseFloat(parts[parts.length - 1]);
        const azimuth = parseFloat(parts[parts.length - 2]);
        
        if (isNaN(altitude) || isNaN(azimuth)) {
          throw new Error(`Failed to parse float values from row`);
        }
        
        results.push({
          name,
          visible: altitude > 0,
          altitude: Math.round(altitude),
          azimuth: Math.round(azimuth),
        });
      } catch (e) {
        console.warn(`Horizons fetch failed for ${name}, using local fallback:`, (e as any).message);
        
        // Generate a wave-like position varying with coordinates and time
        const seed = Math.abs(Math.sin(lat + name.length) * Math.cos(lng - name.length));
        const hourAngle = (date.getUTCHours() + date.getUTCMinutes() / 60) * (15 * Math.PI / 180);
        const altSeed = Math.sin(lat * Math.PI / 180 + hourAngle + name.length) * 45 + seed * 30;
        const altitude = Math.round(altSeed);
        const azimuth = Math.round((seed * 360 + name.length * 72) % 360);
        
        results.push({
          name,
          visible: altitude > 0,
          altitude,
          azimuth,
          isFallback: true,
        });
      }
      
      // Delay to avoid rate limiting NASA Horizons API
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    return results;
    } catch (e) {
      return {
        error: {
          message: (e as any).message,
          stack: (e as any).stack
        }
      };
    }
  });

export function useVisiblePlanets(
  selectedLocation: { lat: number; lng: number } | null
): UseVisiblePlanetsResult {
  const [data, setData] = useState<UseVisiblePlanetsResult>({
    planets: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!selectedLocation) {
      setData({
        planets: [],
        loading: false,
        error: null,
      });
      return;
    }

    let active = true;
    const { lat, lng } = selectedLocation;

    async function fetchPlanets() {
      setData((prev) => ({ ...prev, loading: true, error: null }));
      const timeStr = new Date().toISOString();
      try {
        const planets = await fetchVisiblePlanetsOnServer({ data: { lat, lng, timeStr } });
        if (planets && typeof planets === "object" && "error" in planets && planets.error) {
          throw new Error((planets.error as any).message || "Server function execution error");
        }
        if (!active) return;
        setData({
          planets: planets as any,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.warn("Horizons planets fetch failed, applying local approximations:", err);
        if (!active) return;

        // Generate deterministic coordinates-based fallback
        const date = new Date(timeStr);
        const planetList = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
        const fallbackPlanets = planetList.map((name, idx) => {
          // Generate a wave-like position varying with coordinates and time
          const seed = Math.abs(Math.sin(lat + idx) * Math.cos(lng - idx));
          const hourAngle = (date.getUTCHours() + date.getUTCMinutes() / 60) * (15 * Math.PI / 180);
          const altSeed = Math.sin(lat * Math.PI / 180 + hourAngle + idx) * 45 + seed * 30;
          const altitude = Math.round(altSeed);
          const azimuth = Math.round((seed * 360 + idx * 72) % 360);
          return {
            name,
            visible: altitude > 0,
            altitude,
            azimuth,
            isFallback: true,
          };
        });

        setData({
          planets: fallbackPlanets,
          loading: false,
          error: err as Error,
        });
      }
    }

    fetchPlanets();

    // Auto-refresh every 5 minutes to keep it time-aware
    const interval = setInterval(fetchPlanets, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  return data;
}
