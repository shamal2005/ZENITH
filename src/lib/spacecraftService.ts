import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as satellite from "satellite.js";
import DEBRIS_FALLBACK_DATA from "./debris-fallback.json";
import GRAVEYARD_FALLBACK_DATA from "./graveyard-objects-fallback.json";


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

export interface PassDetails {
  spacecraftId: string;
  spacecraftName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  maxElevation: number;
  direction: string;
  visibilityRating: number;
  visibilityLabel: string;
  isCurrentlyOverhead: boolean;
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

export function getCardinalDirection(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized >= 22.5 && normalized < 67.5) return "NE";
  if (normalized >= 67.5 && normalized < 112.5) return "E";
  if (normalized >= 112.5 && normalized < 157.5) return "SE";
  if (normalized >= 157.5 && normalized < 202.5) return "S";
  if (normalized >= 202.5 && normalized < 247.5) return "SW";
  if (normalized >= 247.5 && normalized < 292.5) return "W";
  return "NW";
}

export function predictPasses(
  spacecraftId: string,
  spacecraftName: string,
  line1: string,
  line2: string,
  observerLat: number,
  observerLng: number,
  observerAltM: number = 0
): PassDetails[] {
  const passes: PassDetails[] = [];
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const now = new Date();
    
    let inPass = false;
    let passStart: Date | null = null;
    let passMaxElevation = -180;
    let passStartAzimuth = 0;
    let passEndAzimuth = 0;
    
    const totalSteps = 1440; // 24 hours
    const stepMs = 60 * 1000; // 1 minute
    
    for (let step = 0; step < totalSteps; step++) {
      const evalTime = new Date(now.getTime() + step * stepMs);
      const positionAndVelocity = satellite.propagate(satrec, evalTime);
      if (
        !positionAndVelocity ||
        !positionAndVelocity.position ||
        typeof positionAndVelocity.position === "boolean"
      ) {
        continue;
      }
      
      const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
      const gmst = satellite.gstime(evalTime);
      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      
      const observerGd = {
        longitude: satellite.degreesToRadians(observerLng),
        latitude: satellite.degreesToRadians(observerLat),
        height: observerAltM / 1000
      };
      
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
      const elevation = satellite.radiansToDegrees(lookAngles.elevation);
      const azimuth = satellite.radiansToDegrees(lookAngles.azimuth);
      
      if (elevation >= 10) {
        if (!inPass) {
          inPass = true;
          passStart = evalTime;
          passStartAzimuth = azimuth;
          passMaxElevation = elevation;
        } else {
          if (elevation > passMaxElevation) {
            passMaxElevation = elevation;
          }
        }
      } else {
        if (inPass && passStart) {
          inPass = false;
          passEndAzimuth = azimuth;
          const passEnd = evalTime;
          
          const durationMs = passEnd.getTime() - passStart.getTime();
          const durationMinutes = Math.round(durationMs / 60000);
          
          let visibilityRating = 1;
          let visibilityLabel = "Poor";
          if (passMaxElevation >= 60) {
            visibilityRating = 5;
            visibilityLabel = "Excellent";
          } else if (passMaxElevation >= 40) {
            visibilityRating = 4;
            visibilityLabel = "Very Good";
          } else if (passMaxElevation >= 20) {
            visibilityRating = 3;
            visibilityLabel = "Good";
          } else if (passMaxElevation >= 10) {
            visibilityRating = 2;
            visibilityLabel = "Fair";
          }
          
          const startDir = getCardinalDirection(passStartAzimuth);
          const endDir = getCardinalDirection(passEndAzimuth);
          
          passes.push({
            spacecraftId,
            spacecraftName,
            startTime: passStart,
            endTime: passEnd,
            durationMinutes: Math.max(1, durationMinutes),
            maxElevation: Math.round(passMaxElevation),
            direction: `${startDir} → ${endDir}`,
            visibilityRating,
            visibilityLabel,
            isCurrentlyOverhead: false, // Updated dynamically by client hook
          });
        }
      }
    }

    // Handle ongoing pass at the end of the prediction window
    if (inPass && passStart) {
      const passEnd = new Date(now.getTime() + totalSteps * stepMs);
      const durationMs = passEnd.getTime() - passStart.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      
      let visibilityRating = 1;
      let visibilityLabel = "Poor";
      if (passMaxElevation >= 60) {
        visibilityRating = 5;
        visibilityLabel = "Excellent";
      } else if (passMaxElevation >= 40) {
        visibilityRating = 4;
        visibilityLabel = "Very Good";
      } else if (passMaxElevation >= 20) {
        visibilityRating = 3;
        visibilityLabel = "Good";
      } else if (passMaxElevation >= 10) {
        visibilityRating = 2;
        visibilityLabel = "Fair";
      }
      
      const startDir = getCardinalDirection(passStartAzimuth);
      const endDir = "N/A";
      
      passes.push({
        spacecraftId,
        spacecraftName,
        startTime: passStart,
        endTime: passEnd,
        durationMinutes: Math.max(1, durationMinutes),
        maxElevation: Math.round(passMaxElevation),
        direction: `${startDir} → ${endDir}`,
        visibilityRating,
        visibilityLabel,
        isCurrentlyOverhead: false,
      });
    }
  } catch (e) {
    console.error("Pass prediction error:", e);
  }
  return passes;
}

export interface DebrisTLE {
  name: string;
  line1: string;
  line2: string;
}

export interface DebrisPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

// Server function executes securely on server side to fetch group TLEs
export const fetchDebrisTLEs = createServerFn({ method: "GET" })
  .handler(async (): Promise<DebrisTLE[]> => {
    try {
      const url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-33-debris&FORMAT=tle";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const debris: DebrisTLE[] = [];
      for (let i = 0; i < lines.length - 2; i += 3) {
        debris.push({
          name: lines[i],
          line1: lines[i+1],
          line2: lines[i+2],
        });
        if (debris.length >= 150) break;
      }
      return debris;
    } catch (e) {
      console.warn("Failed to fetch debris TLEs from CelesTrak. Using local fallback data.", e);
      return DEBRIS_FALLBACK_DATA as DebrisTLE[];
    }
  });

export function propagateDebrisTLE(line1: string, line2: string, time: Date): DebrisPosition | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const positionAndVelocity = satellite.propagate(satrec, time);
    if (
      !positionAndVelocity ||
      !positionAndVelocity.position ||
      !positionAndVelocity.velocity ||
      typeof positionAndVelocity.position === "boolean" ||
      typeof positionAndVelocity.velocity === "boolean"
    ) {
      return null;
    }
    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    const gmst = satellite.gstime(time);
    const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);

    let longitude = satellite.degreesLong(positionGd.longitude);
    let latitude = satellite.degreesLat(positionGd.latitude);
    const altitude = positionGd.height; // in km

    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;

    return {
      latitude,
      longitude,
      altitude,
      position: { x: positionEci.x, y: positionEci.y, z: positionEci.z },
      velocity: { x: velocityEci.x, y: velocityEci.y, z: velocityEci.z },
    };
  } catch (e) {
    return null;
  }
}

export interface GraveyardTLE {
  id: string;
  noradId: number;
  category: "rocketBody" | "inactiveSatellite" | "featured";
  name: string;
  line1: string;
  line2: string;
}

export const fetchGraveyardObjects = createServerFn({ method: "GET" })
  .handler(async (): Promise<GraveyardTLE[]> => {
    try {
      return GRAVEYARD_FALLBACK_DATA as GraveyardTLE[];
    } catch (e) {
      console.warn("Failed to fetch graveyard objects. Using local fallback.", e);
      return [];
    }
  });


