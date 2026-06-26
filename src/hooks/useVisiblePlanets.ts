import { useState, useEffect, useMemo } from "react";
import * as Astronomy from "astronomy-engine";

export interface PlanetObservation {
  name: string;
  direction: string;
  altitude: number;
  status: "Rising" | "High in Sky" | "Best Viewing" | "Setting Soon" | string;
  visibilityRating: number;
  visibilityLabel: string;
  magnitude: number;
  visible: boolean;
}


export interface UseVisiblePlanetsResult {
  planets: PlanetObservation[];
  loading: boolean;
  error: Error | null;
}

const PLANET_BODIES = [
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn", body: Astronomy.Body.Saturn },
  { name: "Uranus", body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
];

function getCardinalDirection(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "North";
  if (normalized >= 22.5 && normalized < 67.5) return "North-East";
  if (normalized >= 67.5 && normalized < 112.5) return "East";
  if (normalized >= 112.5 && normalized < 157.5) return "South-East";
  if (normalized >= 157.5 && normalized < 202.5) return "South";
  if (normalized >= 202.5 && normalized < 247.5) return "South-West";
  if (normalized >= 247.5 && normalized < 292.5) return "West";
  return "North-West";
}

// Reusable calculation layer wrapping Astronomy Engine
export function calculatePlanets(lat: number, lng: number, date: Date = new Date()): PlanetObservation[] {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(lat, lng, 0);

  const results = PLANET_BODIES.map(p => {
    const equator = Astronomy.Equator(p.body, time, observer, true, true);
    const horizon = Astronomy.Horizon(time, observer, equator.ra, equator.dec, 'normal');
    
    let magnitude = 0;
    try {
      const illum = Astronomy.Illumination(p.body, time);
      magnitude = illum.mag;
    } catch (err) {
      console.warn("Magnitude not available for " + p.name, err);
    }

    const altitude = horizon.altitude;
    const azimuth = horizon.azimuth;

    const direction = getCardinalDirection(azimuth);

    // Observing status
    const isEast = azimuth >= 0 && azimuth < 180;
    let status = "High in Sky";
    if (altitude >= 40) {
      if (magnitude <= 2.5) {
        status = "Best Viewing";
      } else {
        status = "High in Sky";
      }
    } else {
      if (isEast) {
        status = "Rising";
      } else {
        if (altitude < 15) {
          status = "Setting Soon";
        } else {
          status = "High in Sky";
        }
      }
    }

    // Visibility rating
    let rating = 1;
    if (altitude >= 50) rating = 5;
    else if (altitude >= 30) rating = 4;
    else if (altitude >= 15) rating = 3;
    else if (altitude >= 5) rating = 2;

    // Faint planets penalty (Uranus, Neptune)
    if (magnitude > 5.5) {
      rating = Math.min(2, rating);
    } else if (magnitude > 3.0) {
      rating = Math.max(1, rating - 1);
    } else if (magnitude < 0.0) {
      rating = Math.min(5, rating + 1);
    }

    // Position penalty
    if ((status === "Setting Soon" || status === "Rising") && rating > 1) {
      rating -= 1;
    }

    const ratingLabels: Record<number, string> = {
      5: "Excellent",
      4: "Very Good",
      3: "Good",
      2: "Fair",
      1: "Difficult"
    };

    return {
      name: p.name,
      direction,
      altitude: Math.round(altitude),
      status,
      visibilityRating: rating,
      visibilityLabel: ratingLabels[rating] || "Difficult",
      magnitude: parseFloat(magnitude.toFixed(2)),
      visible: true
    };
  });

  return results.filter(r => r.altitude > 0);
}

export function useVisiblePlanets(
  selectedLocation: { lat: number; lng: number } | null
): UseVisiblePlanetsResult {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 10000); // refresh every 10 seconds
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedLocation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Retain loading state for 1.2 seconds (approximately 1-1.5s) to prevent flash of content
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  const planets = useMemo(() => {
    if (!selectedLocation || loading) return [];
    try {
      const visible = calculatePlanets(selectedLocation.lat, selectedLocation.lng, time);
      
      // Sort planets:
      // 1. Highest visibility rating
      // 2. Highest altitude
      // 3. Brightest apparent planet (lowest magnitude)
      return visible.sort((a, b) => {
        if (b.visibilityRating !== a.visibilityRating) {
          return b.visibilityRating - a.visibilityRating;
        }
        if (b.altitude !== a.altitude) {
          return b.altitude - a.altitude;
        }
        return a.magnitude - b.magnitude;
      });
    } catch (err) {
      console.error("Error calculating visible planets:", err);
      setError(err as Error);
      return [];
    }
  }, [selectedLocation?.lat, selectedLocation?.lng, time, loading]);

  return {
    planets,
    loading,
    error,
  };
}
