import { useState, useEffect, useMemo } from "react";

export interface ConstellationObservation {
  name: string;
  direction: string;
  altitude: number;
  status: "Rising" | "High in Sky" | "Culminating" | "Setting Soon";
  visibilityRating: number;
  visibilityLabel: string;
}

const CONSTELLATIONS = [
  { name: "Ursa Major", ra: 11.3, dec: 55 },
  { name: "Orion", ra: 5.6, dec: 5 },
  { name: "Cassiopeia", ra: 1.0, dec: 60 },
  { name: "Cygnus", ra: 20.6, dec: 42 },
  { name: "Scorpius", ra: 16.8, dec: -26 },
  { name: "Sagittarius", ra: 19.0, dec: -25 },
  { name: "Pegasus", ra: 22.7, dec: 20 },
  { name: "Crux", ra: 12.5, dec: -60 },
  { name: "Leo", ra: 10.5, dec: 15 },
  { name: "Taurus", ra: 4.6, dec: 19 },
  { name: "Gemini", ra: 7.0, dec: 22 },
  { name: "Lyra", ra: 18.6, dec: 38 },
  { name: "Canis Major", ra: 6.8, dec: -22 },
  { name: "Aquila", ra: 19.8, dec: 3 },
  { name: "Bootes", ra: 14.8, dec: 30 },
  { name: "Andromeda", ra: 0.8, dec: 38 },
  { name: "Perseus", ra: 3.5, dec: 45 },
  { name: "Vela", ra: 9.0, dec: -50 }
];

function getCardinalDirection(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "North";
  if (normalized >= 22.5 && normalized < 67.5) return "Northeast";
  if (normalized >= 67.5 && normalized < 112.5) return "East";
  if (normalized >= 112.5 && normalized < 157.5) return "Southeast";
  if (normalized >= 157.5 && normalized < 202.5) return "South";
  if (normalized >= 202.5 && normalized < 247.5) return "Southwest";
  if (normalized >= 247.5 && normalized < 292.5) return "West";
  return "Northwest";
}

export function calculateConstellations(lat: number, lng: number, date: Date = new Date()): ConstellationObservation[] {
  const J2000 = 946728000000;
  const daysSinceJ2000 = (date.getTime() - J2000) / 86400000;
  const gmst = (280.46061837 + 360.98564736629 * daysSinceJ2000) % 360;
  const lst = (gmst + lng + 360) % 360;

  const latRad = (lat * Math.PI) / 180;

  const results = CONSTELLATIONS.map(c => {
    const ha = (lst - (c.ra * 15) + 360) % 360;
    const haRad = (ha * Math.PI) / 180;
    const decRad = (c.dec * Math.PI) / 180;

    const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const altRad = Math.asin(sinAlt);
    const altitude = (altRad * 180) / Math.PI;

    const y = -Math.sin(haRad) * Math.cos(decRad);
    const x = Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad);
    let azimuth = (Math.atan2(y, x) * 180) / Math.PI;
    azimuth = (azimuth + 360) % 360;

    const normHA = ((ha + 180) % 360) - 180; // range [-180, 180]
    
    let status: "Rising" | "High in Sky" | "Culminating" | "Setting Soon" = "High in Sky";
    if (Math.abs(normHA) <= 15) {
      status = "Culminating";
    } else if (normHA > 15 && altitude < 25) {
      status = "Setting Soon";
    } else if (normHA < -15 && altitude < 25) {
      status = "Rising";
    } else {
      status = "High in Sky";
    }

    let rating = 1;
    if (altitude >= 50) rating = 5;
    else if (altitude >= 35) rating = 4;
    else if (altitude >= 20) rating = 3;
    else if (altitude >= 10) rating = 2;

    if (status === "Culminating" && rating < 5) {
      rating += 1;
    } else if ((status === "Setting Soon" || status === "Rising") && rating > 1) {
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
      name: c.name,
      altitude: Math.round(altitude),
      direction: getCardinalDirection(azimuth),
      status,
      visibilityRating: rating,
      visibilityLabel: ratingLabels[rating] || "Difficult"
    };
  });

  // Filter only those above the horizon
  return results.filter(r => r.altitude > 0);
}

export function useVisibleConstellations(selectedLocation?: { lat: number; lng: number } | null) {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 10000); // update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  // Handle artificial loading delay on location change (0.5 to 1.0 seconds, target: 800ms)
  useEffect(() => {
    if (selectedLocation) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setLoading(false);
    }
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  const constellations = useMemo(() => {
    if (!selectedLocation) return [];
    const visible = calculateConstellations(selectedLocation.lat, selectedLocation.lng, time);
    
    // Sort:
    // 1. Highest visibility rating
    // 2. Highest altitude
    return visible.sort((a, b) => {
      if (b.visibilityRating !== a.visibilityRating) {
        return b.visibilityRating - a.visibilityRating;
      }
      return b.altitude - a.altitude;
    });
  }, [selectedLocation?.lat, selectedLocation?.lng, time]);

  return {
    constellations,
    loading
  };
}
