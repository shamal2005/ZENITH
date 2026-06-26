import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as satellite from "satellite.js";

export interface TLEData {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
}

export interface SpacecraftPosition {
  latitude: number;
  longitude: number;
  altitude: number; // in km
  timestamp: number; // unix seconds
}

// Robust fallback TLEs in case Celestrak API is offline/rate-limited
export const FALLBACK_TLES: Record<number, TLEData> = {
  25544: {
    noradId: 25544,
    name: "ISS (ZARYA)",
    line1: "1 25544U 98067A   26177.15504249  .00009461  00000+0  17697-3 0  9995",
    line2: "2 25544  51.6325 255.7018 0004359 233.1468 126.9121 15.49434803573143",
  },
  20580: {
    noradId: 20580,
    name: "HST (HUBBLE)",
    line1: "1 20580U 90037B   26176.94440779  .00007282  00000+0  22970-3 0  9991",
    line2: "2 20580  28.4731  20.7214 0001418 247.5756 112.4690 15.30843041789914",
  },
  48274: {
    noradId: 48274,
    name: "CSS (TIANGONG)",
    line1: "1 48274U 21035A   26177.18993486  .00025493  00000+0  29528-3 0  9998",
    line2: "2 48274  41.4689 267.1993 0007960 154.0990 206.0249 15.61197983294576",
  },
  45206: {
    noradId: 45206,
    name: "STARLINK-1209",
    line1: "1 45206U 20012AE  26177.16668980 -.00052649  00000+0 -38603-3 0  9999",
    line2: "2 45206  53.0353 164.6070 0001421 100.1662 226.6072 15.72397551  5955",
  },
  49260: {
    noradId: 49260,
    name: "LANDSAT 9",
    line1: "1 49260U 21088A   26177.19230227  .00000314  00000+0  79879-4 0  9990",
    line2: "2 49260  98.2278 247.2607 0001275  84.6277 275.5067 14.57102844252317",
  },
};

const InputSchema = z.object({
  noradId: z.number(),
});

// Server function executes securely on server side, bypassing client CORS restrictions
export const fetchTLEFromServer = createServerFn({ method: "GET" })
  .validator(InputSchema)
  .handler(async ({ data: { noradId } }) => {
    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=3le`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 3) {
        throw new Error(`Invalid TLE format received (expected at least 3 lines)`);
      }
      return {
        noradId,
        name: lines[0],
        line1: lines[1],
        line2: lines[2],
      };
    } catch (e) {
      console.warn(`Celestrak TLE fetch failed for NORAD Catalog ID ${noradId}. Using fallback TLE.`, e);
      const fallback = FALLBACK_TLES[noradId];
      if (fallback) {
        return fallback;
      }
      throw e;
    }
  });

// Propagates TLE lines using satellite.js to find geodetic coordinates
export function propagateTLE(line1: string, line2: string, time: Date = new Date()): SpacecraftPosition | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const positionAndVelocity = satellite.propagate(satrec, time);
    if (!positionAndVelocity || !positionAndVelocity.position || typeof positionAndVelocity.position === "boolean") {
      return null;
    }
    const positionEci = positionAndVelocity.position;
    
    const gmst = satellite.gstime(time);
    const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);
    
    let longitude = satellite.degreesLong(positionGd.longitude);
    let latitude = satellite.degreesLat(positionGd.latitude);
    const altitude = positionGd.height; // in km
    
    // Normalize coordinates
    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;
    
    return {
      latitude,
      longitude,
      altitude,
      timestamp: Math.floor(time.getTime() / 1000),
    };
  } catch (e) {
    console.error("Propagation error:", e);
    return null;
  }
}
