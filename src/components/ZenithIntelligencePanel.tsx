import { useMemo, useState, useEffect } from "react";
import { Sun, Moon, Sunrise, Sunset, Orbit, Clock, Sparkles, Layers, Compass, Satellite, ChevronRight, Telescope, Star } from "lucide-react";
import { useSpacecraftTracking } from "../hooks/useSpacecraftTracking";
import { useSkyStatus } from "../hooks/useSkyStatus";
import { useVisiblePlanets } from "../hooks/useVisiblePlanets";

import { useVisibleConstellations } from "../hooks/useVisibleConstellations";

const formatTimeRange = (start: Date, end: Date) => {
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };
  
  const today = new Date().toDateString();
  const isToday = start.toDateString() === today;
  const prefix = isToday ? "" : "Tomorrow, ";
  
  return `${prefix}${formatTime(start)} – ${formatTime(end)}`;
};

const renderStars = (rating: number) => {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
};

const getDirectionAbbrev = (dir: string) => {
  const clean = dir.replace("-", "").toLowerCase();
  switch (clean) {
    case "north": return "N";
    case "northeast": return "NE";
    case "east": return "E";
    case "southeast": return "SE";
    case "south": return "S";
    case "southwest": return "SW";
    case "west": return "W";
    case "northwest": return "NW";
    default: return dir;
  }
};

const getDirectionAdjective = (dir: string) => {
  const clean = dir.replace("-", "").toLowerCase();
  switch (clean) {
    case "north": return "northern";
    case "south": return "southern";
    case "east": return "eastern";
    case "west": return "western";
    case "northeast": return "northeastern";
    case "northwest": return "northwestern";
    case "southeast": return "southeastern";
    case "southwest": return "southwestern";
    default: return clean;
  }
};

const generateRecommendation = (bestPlanet: any, bestConstellation: any) => {
  if (bestPlanet && bestConstellation) {
    const planetDir = bestPlanet.direction.replace("-", "").toLowerCase();
    const constDirAdj = getDirectionAdjective(bestConstellation.direction);
    
    if (bestPlanet.visibilityRating >= 4 && bestConstellation.visibilityRating >= 4) {
      return `Excellent observing conditions tonight. Begin with ${bestPlanet.name} in the ${planetDir} before locating ${bestConstellation.name} high in the ${constDirAdj} sky.`;
    }
    
    if (bestConstellation.status === "Culminating" || bestConstellation.visibilityRating >= 4) {
      return `${bestConstellation.name} is currently at its best viewing position. ${bestPlanet.name} is also highly visible this evening.`;
    }

    return `${bestPlanet.name} in the ${planetDir} offers the best planetary view tonight. You can also trace ${bestConstellation.name} in the ${constDirAdj} sky.`;
  }
  
  if (bestPlanet) {
    const planetDir = bestPlanet.direction.replace("-", "").toLowerCase();
    return `Look for ${bestPlanet.name} in the ${planetDir} tonight, offering ${bestPlanet.visibilityLabel.toLowerCase()} visibility.`;
  }
  
  if (bestConstellation) {
    const constDirAdj = getDirectionAdjective(bestConstellation.direction);
    return `Tonight offers a great opportunity to observe ${bestConstellation.name} in the ${constDirAdj} sky.`;
  }
  
  return "Clear skies tonight. Scan the meridian for optimal astronomical observations.";
};




interface ZenithIntelligencePanelProps {
  active?: boolean;
  selectedLocation?: { lat: number; lng: number; label: string } | null;
  selectedSpacecraftId?: string;
  onSelectSpacecraft?: (id: string, triggerFocus?: boolean) => void;
}

function PlanetIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "Mercury":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="url(#mercury-grad)" />
          <circle cx="9" cy="9" r="1.5" fill="#ffffff" fillOpacity="0.2" />
          <circle cx="14" cy="14" r="2" fill="#000000" fillOpacity="0.15" />
          <circle cx="15" cy="8" r="1" fill="#000000" fillOpacity="0.1" />
          <defs>
            <radialGradient id="mercury-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9 9) rotate(45) scale(12)">
              <stop offset="0%" stopColor="#d5d5d5" />
              <stop offset="70%" stopColor="#8c8c8c" />
              <stop offset="100%" stopColor="#4a4a4a" />
            </radialGradient>
          </defs>
        </svg>
      );
    case "Venus":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="url(#venus-grad)" />
          <path d="M5 8C8 10 16 7 19 9" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
          <path d="M4 14C9 13 14 16 20 13" stroke="#e07b22" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
          <defs>
            <radialGradient id="venus-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 8) rotate(50) scale(13)">
              <stop offset="0%" stopColor="#ffe49e" />
              <stop offset="60%" stopColor="#e29b3a" />
              <stop offset="100%" stopColor="#8c4f12" />
            </radialGradient>
          </defs>
        </svg>
      );
    case "Mars":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="url(#mars-grad)" />
          <circle cx="14" cy="11" r="2.5" fill="#4a1a0c" fillOpacity="0.2" />
          <path d="M12 4C14 4.5 15 5 15.5 6C15 5.5 13.5 5 12 4Z" fill="#ffffff" fillOpacity="0.75" />
          <defs>
            <radialGradient id="mars-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 8) rotate(45) scale(12)">
              <stop offset="0%" stopColor="#ff7b4b" />
              <stop offset="70%" stopColor="#c1440e" />
              <stop offset="100%" stopColor="#5c1902" />
            </radialGradient>
          </defs>
        </svg>
      );
    case "Jupiter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="jupiter-mask">
            <circle cx="12" cy="12" r="9" fill="#ffffff" />
          </mask>
          <g mask="url(#jupiter-mask)">
            <circle cx="12" cy="12" r="9" fill="url(#jupiter-grad)" />
            <rect x="2" y="7" width="20" height="1.5" fill="#845837" fillOpacity="0.45" />
            <rect x="2" y="10" width="20" height="2" fill="#5c3821" fillOpacity="0.3" />
            <rect x="2" y="14" width="20" height="1.2" fill="#845837" fillOpacity="0.4" />
            <ellipse cx="14.5" cy="11" rx="1.5" ry="1" fill="#b03a2e" fillOpacity="0.8" />
          </g>
          <defs>
            <radialGradient id="jupiter-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 8) rotate(45) scale(12)">
              <stop offset="0%" stopColor="#f5ecd5" />
              <stop offset="65%" stopColor="#d8ca9d" />
              <stop offset="100%" stopColor="#7a6245" />
            </radialGradient>
          </defs>
        </svg>
      );
    case "Saturn":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 14C2 13 2 11.5 4 10.5C7.5 8.75 14.5 8.75 18 10.5C20 11.5 20 13 18.5 14" stroke="url(#saturn-ring-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <circle cx="11.5" cy="12" r="7" fill="url(#saturn-grad)" />
          <path d="M4 14C7.5 15.75 14.5 15.75 18 14" stroke="url(#saturn-ring-grad)" strokeWidth="2.2" strokeLinecap="round" />
          <defs>
            <radialGradient id="saturn-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9.5 9.5) rotate(45) scale(10)">
              <stop offset="0%" stopColor="#f7e7c4" />
              <stop offset="70%" stopColor="#e2bf7d" />
              <stop offset="100%" stopColor="#8a7346" />
            </radialGradient>
            <linearGradient id="saturn-ring-grad" x1="3" y1="11" x2="19" y2="13" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8a7346" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#dfca9e" />
              <stop offset="50%" stopColor="#f5ecd5" />
              <stop offset="70%" stopColor="#dfca9e" />
              <stop offset="100%" stopColor="#8a7346" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#9b5de5" />
        </svg>
      );
  }
}

export default function ZenithIntelligencePanel({
  active = false,
  selectedLocation = null,
  selectedSpacecraftId = "iss",
  onSelectSpacecraft,
}: ZenithIntelligencePanelProps) {
  const { spacecrafts, loading, error, passes } = useSpacecraftTracking(selectedLocation);
  const { isDay, sunrise, sunset, moonPhase, loading: skyLoading } = useSkyStatus(selectedLocation);
  const { planets, loading: planetsLoading, error: planetsError } = useVisiblePlanets(selectedLocation);
  const { constellations, loading: constellationsLoading } = useVisibleConstellations(selectedLocation);

  const bestPlanet = useMemo(() => planets && planets.length > 0 ? planets[0] : null, [planets]);
  const bestConstellation = useMemo(() => constellations && constellations.length > 0 ? constellations[0] : null, [constellations]);
  const bestPass = useMemo(() => passes && passes.length > 0 ? passes[0] : null, [passes]);
  const loadingHighlights = loading || planetsLoading || constellationsLoading;
  
  const recommendationText = useMemo(() => {
    return generateRecommendation(bestPlanet, bestConstellation);
  }, [bestPlanet, bestConstellation]);

  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    setLastUpdated(timeStr);
  }, [planets, constellations, spacecrafts, selectedLocation?.lat, selectedLocation?.lng, isDay]);

  const observationQuality = useMemo(() => {
    if (isDay) return "Fair";
    
    const planetRating = bestPlanet?.visibilityRating ?? 1;
    const constellationRating = bestConstellation?.visibilityRating ?? 1;
    const passRating = bestPass?.visibilityRating ?? 1;
    
    const maxRating = Math.max(planetRating, constellationRating, passRating);
    
    if (maxRating === 5) return "Excellent";
    if (maxRating === 4) return "Very Good";
    if (maxRating === 3) return "Good";
    return "Fair";
  }, [isDay, bestPlanet, bestConstellation, bestPass]);

  const topRecommendation = useMemo(() => {
    const items: { rating: number; display: string }[] = [];
    
    if (bestPass) {
      const passName = bestPass.spacecraftId === "iss" ? "ISS Pass" : bestPass.spacecraftName;
      items.push({
        rating: bestPass.visibilityRating,
        display: `🛰 ${passName}`
      });
    }
    
    if (bestPlanet) {
      const planetEmojis: Record<string, string> = {
        Mercury: "🪐",
        Venus: "🪐",
        Mars: "🔴",
        Jupiter: "🪐",
        Saturn: "🪐",
        Uranus: "🪐",
        Neptune: "🪐"
      };
      const emoji = planetEmojis[bestPlanet.name] || "🪐";
      items.push({
        rating: bestPlanet.visibilityRating,
        display: `${emoji} ${bestPlanet.name}`
      });
    }
    
    if (bestConstellation) {
      items.push({
        rating: bestConstellation.visibilityRating,
        display: `🌌 ${bestConstellation.name}`
      });
    }
    
    if (items.length === 0) return "None";
    
    // Sort by rating descending
    items.sort((a, b) => b.rating - a.rating);
    return items[0].display;
  }, [bestPass, bestPlanet, bestConstellation]);

  // Generate deterministic mock data based on location coordinates
  const data = useMemo(() => {
    if (!selectedLocation) return null;
    const { lat, lng } = selectedLocation;
    
    // Seed using lat/lng
    const seed = Math.abs(Math.sin(lat) * Math.cos(lng));
    
    const isNight = seed > 0.45;
    
    const sunriseHour = 5 + Math.floor(seed * 2);
    const sunriseMin = Math.floor((seed * 100) % 60);
    const sunsetHour = 17 + Math.floor((seed * 3) % 3);
    const sunsetMin = Math.floor((seed * 250) % 60);
    
    const moonPhases = [
      "New Moon",
      "Waxing Crescent",
      "First Quarter",
      "Waxing Gibbous",
      "Full Moon",
      "Waning Gibbous",
      "Third Quarter",
      "Waning Crescent"
    ];
    const moonPhase = moonPhases[Math.floor(seed * moonPhases.length)];
    
    const satellites = 15 + Math.floor(seed * 35);
    const issOverhead = seed > 0.6 ? "Visible (Elev. 48°)" : "Below Horizon";
    const brightestObject = seed > 0.7 ? "Jupiter (Mag -2.4)" : seed > 0.4 ? "Venus (Mag -4.2)" : "Sirius (Mag -1.46)";
    
    const planetsList = ["Venus", "Mars", "Jupiter", "Saturn", "Mercury"];
    const visiblePlanets = planetsList.filter((_, idx) => ((seed * 10) + idx) % 2 < 1.15).slice(0, 3);
    if (visiblePlanets.length === 0) visiblePlanets.push("Mars");

    const visibleConstellations = constellations.map(c => c.name);

    const nextIssPass = 8 + Math.floor(seed * 48);
    const nextPlanetRise = 1 + Math.floor(seed * 11);
    const nextPlanetName = visiblePlanets[0] || "Saturn";

    return {
      skyStatus: {
        isNight,
        sunrise: `${String(sunriseHour).padStart(2, "0")}:${String(sunriseMin).padStart(2, "0")} AM`,
        sunset: `${String(sunsetHour).padStart(2, "0")}:${String(sunsetMin).padStart(2, "0")} PM`,
        moonPhase,
      },
      objects: {
        issStatus: issOverhead,
        satellites,
        brightestObject,
      },
      planets: visiblePlanets,
      constellations: visibleConstellations,
      snapshot: {
        satellites,
        planetsCount: visiblePlanets.length,
        constellationsCount: constellations.length,
        nextEvent: `ISS Pass in ${nextIssPass} min`,
      }
    };
  }, [selectedLocation, constellations]);

  if (!selectedLocation || !data) return null;

  return (
    <div
      className={`fixed right-6 md:right-8 top-4 md:top-5 z-50 flex flex-col w-[260px] md:w-[300px] h-[calc(100vh-2.5rem)] select-none transition-all duration-1000 ease-out transform ${
        active ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-12 pointer-events-none"
      }`}
    >
      {/* Header Block */}
      <header className="flex flex-col select-none mb-4 flex-shrink-0">
        <h2 className="text-[16px] md:text-[18px] font-semibold font-orbitron tracking-[0.25em] text-white uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.15)] leading-snug">
          Sky Above This Location
        </h2>
        <p className="text-[9px] md:text-[10px] font-medium font-outfit tracking-[0.18em] text-slate-400/85 uppercase mt-1.5">
          Real-time celestial overview
        </p>
      </header>

      {/* Cards List (scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-4 scrollbar-none pb-8">
        
        {/* Card 1: Sky Status */}
        <div className="intel-card-base flex flex-col gap-3">
          {skyLoading ? (
            <div className="animate-pulse flex flex-col gap-3 py-1">
              <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
                <div className="w-4 h-4 rounded-full bg-purple-500/20" />
                <div className="h-3 bg-purple-500/20 rounded w-1/2" />
              </div>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-3">
                <div className="flex flex-col gap-1">
                  <div className="h-2 bg-purple-500/10 rounded w-2/3" />
                  <div className="h-3.5 bg-purple-500/20 rounded w-3/4" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-2 bg-purple-500/10 rounded w-2/3" />
                  <div className="h-3.5 bg-purple-500/20 rounded w-3/4" />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <div className="h-2 bg-purple-500/10 rounded w-1/3" />
                  <div className="h-3.5 bg-purple-500/20 rounded w-1/2" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 transition-opacity duration-500 ease-out animate-in fade-in">
              <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
                {!isDay ? (
                  <Moon className="w-4 h-4 text-indigo-400 animate-in zoom-in duration-300" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400 animate-in zoom-in duration-300" />
                )}
                <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                  SKY STATUS — {!isDay ? "NIGHT" : "DAY"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] font-outfit text-slate-300">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] uppercase tracking-wider">Sunrise</span>
                  <span className="font-semibold flex items-center gap-1 mt-0.5">
                    <Sunrise className="w-3.5 h-3.5 text-amber-500/80" />
                    {sunrise}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[8px] uppercase tracking-wider">Sunset</span>
                  <span className="font-semibold flex items-center gap-1 mt-0.5">
                    <Sunset className="w-3.5 h-3.5 text-indigo-500/80" />
                    {sunset}
                  </span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-slate-500 text-[8px] uppercase tracking-wider">Moon Phase</span>
                  <span className="font-semibold flex items-center gap-1 mt-0.5">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    {moonPhase}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Live Space Tracking (Hero Card) */}
        <div className="intel-card-base intel-card-hero flex flex-col gap-3.5">
          <div className="flex items-center gap-2 border-b border-purple-400/25 pb-1.5">
            <Orbit className="w-4 h-4 text-purple-400 animate-spin-slow" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-purple-400">
              LIVE SPACE TRACKING
            </span>
          </div>
          <div className="flex flex-col gap-2.5 text-[10px] font-outfit">
            {spacecrafts.map((sc) => {
              const isSelected = selectedSpacecraftId === sc.id;
              const isClickable = !loading && !error && sc.latitude !== null && sc.longitude !== null;
              
              // Icon mapping
              let Icon = Orbit;
              let iconColorClass = "text-purple-400";
              if (sc.id === "hubble") {
                Icon = Telescope;
                iconColorClass = "text-sky-400";
              } else if (sc.id === "tiangong") {
                Icon = Orbit;
                iconColorClass = "text-amber-400";
              } else if (sc.id === "starlink") {
                Icon = Satellite;
                iconColorClass = "text-pink-400";
              } else if (sc.id === "landsat") {
                Icon = Satellite;
                iconColorClass = "text-emerald-400";
              }

              // Color themes for expanded card borders & hovers
              let borderClass = "border-purple-500/15";
              let hoverBorderClass = "hover:border-purple-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(192,132,252,0.1)]";
              
              if (sc.id === "hubble") {
                hoverBorderClass = "hover:border-sky-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(56,189,248,0.1)]";
              } else if (sc.id === "tiangong") {
                hoverBorderClass = "hover:border-amber-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(251,191,36,0.1)]";
              } else if (sc.id === "starlink") {
                hoverBorderClass = "hover:border-pink-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(236,72,153,0.1)]";
              } else if (sc.id === "landsat") {
                hoverBorderClass = "hover:border-emerald-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)]";
              }

              if (isSelected) {
                if (sc.id === "hubble") {
                  borderClass = "border-sky-500/35 bg-slate-950/60 shadow-[0_0_15px_rgba(56,189,248,0.15)]";
                } else if (sc.id === "tiangong") {
                  borderClass = "border-amber-500/35 bg-slate-950/60 shadow-[0_0_15px_rgba(251,191,36,0.15)]";
                } else if (sc.id === "starlink") {
                  borderClass = "border-pink-500/35 bg-slate-950/60 shadow-[0_0_15px_rgba(236,72,153,0.15)]";
                } else if (sc.id === "landsat") {
                  borderClass = "border-emerald-500/35 bg-slate-950/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                } else {
                  borderClass = "border-purple-500/35 bg-slate-950/60 shadow-[0_0_15px_rgba(192,132,252,0.15)]";
                }
              }

              return (
                <div 
                  key={sc.id}
                  onClick={() => {
                    if (isClickable && onSelectSpacecraft) {
                      onSelectSpacecraft(sc.id, true);
                    }
                  }}
                  className={`flex flex-col gap-1.5 bg-slate-950/45 px-2.5 py-2.5 rounded-lg border text-[10px] font-outfit transition-all duration-300 ${borderClass} ${
                    isClickable && !isSelected ? `cursor-pointer ${hoverBorderClass} active:scale-[0.98]` : ""
                  }`}
                >
                  <div className="flex justify-between items-center pb-0.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${iconColorClass} ${sc.id === "iss" || sc.id === "tiangong" ? "animate-spin-slow" : ""}`} />
                      <span className="font-semibold text-slate-200">{sc.name}</span>
                    </div>
                    {loading ? (
                      <span className="font-mono font-bold text-purple-400/60 animate-pulse text-[9px]">CONNECTING...</span>
                    ) : error ? (
                      <span className="font-mono font-bold text-red-400 text-[9px]">OFFLINE</span>
                    ) : (
                      <span className={`font-mono font-bold animate-pulse text-[9px] ${
                        sc.id === "tiangong" ? "text-amber-400" : sc.id === "hubble" ? "text-sky-400" : sc.id === "starlink" ? "text-pink-400" : sc.id === "landsat" ? "text-emerald-400" : "text-purple-400"
                      }`}>
                        LIVE TRACKING
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="flex flex-col gap-1 text-[9.5px] border-t border-white/5 pt-1.5 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 uppercase tracking-wider text-[8px]">Current Position</span>
                        <span className="font-mono text-slate-300 font-medium">
                          LAT: {sc.latitude !== null ? `${sc.latitude.toFixed(4)}°` : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <span className="font-mono text-slate-300 font-medium">
                          LNG: {sc.longitude !== null ? `${sc.longitude.toFixed(4)}°` : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-0.5">
                        <span className="text-slate-500 uppercase tracking-wider text-[8px]">Last Updated</span>
                        <span className={`font-mono ${
                          sc.id === "tiangong" ? "text-amber-300" : sc.id === "hubble" ? "text-sky-300" : sc.id === "starlink" ? "text-pink-300" : sc.id === "landsat" ? "text-emerald-300" : "text-purple-300"
                        }`}>
                          {sc.timestamp !== null ? new Date(sc.timestamp * 1000).toLocaleTimeString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between items-center bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-purple-500/15">
              <span className="text-slate-400 font-medium">Active Satellites Overhead</span>
              <span className="font-mono font-bold text-purple-300">{data.objects.satellites}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/45 px-2.5 py-1.5 rounded-lg border border-purple-500/15">
              <span className="text-slate-400 font-medium">Brightest Visible Object</span>
              <span className="font-mono font-bold text-purple-300">{data.objects.brightestObject}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Visible Planets */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-purple-500/15 pb-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                VISIBLE PLANETS
              </span>
            </div>
            {planetsError && (
              <span className="text-[7.5px] font-medium font-outfit uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                Offline
              </span>
            )}
          </div>

          {planetsLoading ? (
            <div className="flex flex-col gap-2 font-outfit animate-in fade-in duration-300">
              <div className="flex items-center justify-center gap-2 py-1.5 bg-slate-950/25 rounded-lg border border-purple-500/5 text-[9.5px]">
                <svg className="animate-spin h-3 w-3 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-slate-400 font-medium">Calculating Visible Planets...</span>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex flex-col gap-1.5 bg-slate-950/20 px-2.5 py-2.5 rounded-lg border border-purple-500/5 h-[46px]"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-2.5 bg-purple-500/10 rounded w-1/3" />
                    <div className="h-3.5 bg-purple-500/10 rounded w-1/6" />
                  </div>
                  <div className="flex justify-between items-center border-t border-purple-500/5 pt-1 mt-0.5">
                    <div className="h-2 bg-purple-500/5 rounded w-1/2" />
                    <div className="h-2 bg-purple-500/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : planetsError ? (
            <div className="flex flex-col items-center justify-center py-4 px-3 text-center bg-slate-950/30 rounded-lg border border-red-500/20">
              <span className="text-[9.5px] font-medium text-red-400 font-outfit leading-relaxed">
                Planet visibility data is currently unavailable.
              </span>
            </div>
          ) : planets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 px-3 text-center bg-slate-950/30 rounded-lg border border-slate-800/40">
              <span className="text-[9.5px] font-medium text-slate-400 font-outfit leading-relaxed">
                No planets visible above the horizon.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 font-outfit animate-in fade-in duration-500 ease-out">
              {planets.slice(0, 5).map((planet) => (
                <div
                  key={planet.name}
                  className="flex flex-col gap-1 bg-slate-950/45 px-2.5 py-2 rounded-lg border border-purple-500/15 text-[9.5px] transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-900/40"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <PlanetIcon name={planet.name} className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-200">{planet.name}</span>
                    </div>
                    <span className={`text-[7.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      planet.status === "Best Viewing" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      planet.status === "Rising" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      planet.status === "Setting Soon" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {planet.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[8.5px] border-t border-white/5 pt-1 mt-0.5 font-outfit">
                    <span>{planet.direction} ({getDirectionAbbrev(planet.direction)}) • Alt: {planet.altitude}°</span>
                    <span className="font-bold text-amber-400/95 font-mono">
                      {renderStars(planet.visibilityRating)} {planet.visibilityLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Visible Constellations */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Compass className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              VISIBLE CONSTELLATIONS
            </span>
          </div>
          {constellationsLoading ? (
            <div className="animate-pulse flex flex-col gap-2 font-outfit">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 bg-slate-950/20 px-2.5 py-2 rounded-lg border border-purple-500/5 h-[46px]"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-2.5 bg-purple-500/10 rounded w-1/3" />
                    <div className="h-3.5 bg-purple-500/10 rounded w-1/6" />
                  </div>
                  <div className="flex justify-between items-center border-t border-purple-500/5 pt-1 mt-0.5">
                    <div className="h-2 bg-purple-500/5 rounded w-1/2" />
                    <div className="h-2 bg-purple-500/5 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : constellations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-2 px-3 text-center bg-slate-950/30 rounded-lg border border-slate-800/40">
              <span className="text-[9.5px] font-medium text-slate-400 font-outfit leading-relaxed">
                No constellations visible above the horizon.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 font-outfit">
              {constellations.slice(0, 4).map((c, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 bg-slate-950/45 px-2.5 py-2 rounded-lg border border-purple-500/15 text-[9.5px] transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-900/40"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-200">{c.name}</span>
                    <span className={`text-[7.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      c.status === "Culminating" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      c.status === "Rising" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      c.status === "Setting Soon" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[8.5px] border-t border-white/5 pt-1 mt-0.5 font-outfit">
                    <span>{c.direction} ({getDirectionAbbrev(c.direction)}) • Alt: {c.altitude}°</span>
                    <span className="font-bold text-amber-400/95 font-mono">
                      {renderStars(c.visibilityRating)} {c.visibilityLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 5: Tonight's Sky Highlights */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Telescope className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              TONIGHT'S SKY HIGHLIGHTS
            </span>
          </div>

          {loadingHighlights ? (
            <div className="flex flex-col gap-2 font-outfit animate-in fade-in duration-300">
              <div className="flex items-center justify-center gap-2 py-1.5 bg-slate-950/25 rounded-lg border border-purple-500/5 text-[9.5px]">
                <svg className="animate-spin h-3 w-3 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-slate-400 font-medium">Recalculating Highlights...</span>
              </div>
              <div className="animate-pulse h-[60px] bg-slate-950/20 rounded-lg border border-purple-500/5" />
              <div className="animate-pulse h-[46px] bg-slate-950/20 rounded-lg border border-purple-500/5" />
              <div className="animate-pulse h-[46px] bg-slate-950/20 rounded-lg border border-purple-500/5" />
            </div>
          ) : !bestPass && !bestPlanet && !bestConstellation ? (
            <div className="flex flex-col items-center justify-center py-4 px-3 text-center bg-slate-950/30 rounded-lg border border-slate-800/40">
              <span className="text-[9.5px] font-medium text-slate-400 font-outfit leading-relaxed">
                No major tracked spacecraft, planets, or constellations will be visible from this location tonight.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 font-outfit animate-in fade-in duration-500 ease-out">
              {/* Smart Recommendation */}
              {recommendationText && (
                <div className="bg-purple-950/15 border border-purple-500/15 rounded-lg p-2.5 text-[9.5px] text-purple-200/90 leading-relaxed font-outfit">
                  <span className="font-semibold text-purple-300">Observation Guide: </span>
                  {recommendationText}
                </div>
              )}

              {/* Spacecraft Pass Highlight */}
              {bestPass && (
                <div
                  onClick={() => onSelectSpacecraft && onSelectSpacecraft(bestPass.spacecraftId, true)}
                  className={`flex flex-col gap-1.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                    selectedSpacecraftId === bestPass.spacecraftId
                      ? "border-purple-400 bg-slate-950/75 shadow-[0_0_15px_rgba(192,132,252,0.2)]"
                      : "border-purple-500/20 bg-purple-500/5 hover:border-purple-400/45 hover:bg-purple-500/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[8.5px] font-bold text-purple-400 uppercase tracking-wider">
                      <Satellite className="w-3 h-3 text-purple-400" /> Spacecraft Highlight
                    </span>
                    {bestPass.isCurrentlyOverhead && (
                      <span className="text-[7.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        Currently Overhead
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-baseline mt-0.5">
                    <span className="text-[11px] font-bold text-slate-100">{bestPass.spacecraftName}</span>
                    <span className="text-[9.5px] font-semibold text-slate-300">
                      {formatTimeRange(bestPass.startTime, bestPass.endTime)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[9px] text-slate-400 border-t border-white/5 pt-1.5 mt-0.5 font-outfit">
                    <div className="flex justify-between">
                      <span>Max Elevation:</span>
                      <span className="font-semibold font-mono text-slate-200">{bestPass.maxElevation}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Travel:</span>
                      <span className="font-semibold font-mono text-slate-200">{bestPass.direction}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-t border-white/5 pt-1 mt-0.5">
                      <span>Visibility:</span>
                      <span className="font-bold text-amber-400/90 font-mono">
                        {renderStars(bestPass.visibilityRating)} {bestPass.visibilityLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Best Planet Highlight */}
              {bestPlanet && (
                <div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-[9.5px]">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[8.5px] font-bold text-purple-400/90 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Best Planet
                    </span>
                    <span className="text-[7.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {bestPlanet.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-100 text-[11px]">
                      <PlanetIcon name={bestPlanet.name} className="w-3.5 h-3.5" />
                      <span>{bestPlanet.name}</span>
                    </div>
                    <span className="text-slate-300 font-semibold">{bestPlanet.direction}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-0.5 text-slate-400 text-[9px] font-outfit">
                    <span>Altitude: {bestPlanet.altitude}°</span>
                    <span className="font-bold text-amber-400/90 font-mono">
                      {renderStars(bestPlanet.visibilityRating)} {bestPlanet.visibilityLabel}
                    </span>
                  </div>
                </div>
              )}

              {/* Best Constellation Highlight */}
              {bestConstellation && (
                <div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-[9.5px]">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[8.5px] font-bold text-purple-400/90 uppercase tracking-wider">
                      <Compass className="w-3 h-3 text-purple-400" /> Best Constellation
                    </span>
                    <span className="text-[7.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">
                      {bestConstellation.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-100 text-[11px]">
                      <span>🌌 {bestConstellation.name}</span>
                    </div>
                    <span className="text-slate-300 font-semibold">{bestConstellation.direction}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-0.5 text-slate-400 text-[9px] font-outfit">
                    <span>Altitude: {bestConstellation.altitude}°</span>
                    <span className="font-bold text-amber-400/90 font-mono">
                      {renderStars(bestConstellation.visibilityRating)} {bestConstellation.visibilityLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Card 6: Zenith Snapshot */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              ZENITH SNAPSHOT
            </span>
          </div>
          
          {loadingHighlights ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[9.5px] font-outfit text-slate-300 animate-pulse">
              <div className="flex flex-col gap-1 col-span-2 bg-slate-950/20 p-2 rounded border border-purple-500/5 h-[34px]">
                <div className="h-2 bg-purple-500/10 rounded w-1/3" />
                <div className="h-3 bg-purple-500/20 rounded w-2/3" />
              </div>
              <div className="flex flex-col gap-1 bg-slate-950/20 p-2 rounded border border-purple-500/5 h-[34px]">
                <div className="h-2 bg-purple-500/10 rounded w-1/2" />
                <div className="h-3 bg-purple-500/20 rounded w-2/3" />
              </div>
              <div className="flex flex-col gap-1 bg-slate-950/20 p-2 rounded border border-purple-500/5 h-[34px]">
                <div className="h-2 bg-purple-500/10 rounded w-1/2" />
                <div className="h-3 bg-purple-500/20 rounded w-2/3" />
              </div>
              <div className="flex flex-col gap-1 bg-slate-950/20 p-2 rounded border border-purple-500/5 h-[34px]">
                <div className="h-2 bg-purple-500/10 rounded w-1/3" />
                <div className="h-3 bg-purple-500/20 rounded w-1/2" />
              </div>
              <div className="flex flex-col gap-1 bg-slate-950/20 p-2 rounded border border-purple-500/5 h-[34px]">
                <div className="h-2 bg-purple-500/10 rounded w-1/3" />
                <div className="h-3 bg-purple-500/20 rounded w-1/2" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[9.5px] font-outfit text-slate-300 animate-in fade-in duration-500 ease-out">
              {/* Location */}
              <div className="flex flex-col col-span-2 bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Location</span>
                <span className="font-bold text-[10px] mt-0.5 text-purple-300 truncate">
                  {selectedLocation?.label ?? "Unknown Location"}
                </span>
              </div>

              {/* Coordinates */}
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Latitude</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selectedLocation ? `${selectedLocation.lat.toFixed(4)}°` : "N/A"}
                </span>
              </div>
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Longitude</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selectedLocation ? `${selectedLocation.lng.toFixed(4)}°` : "N/A"}
                </span>
              </div>

              {/* Sky Status */}
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Sky</span>
                <span className="font-bold text-slate-200">
                  {isDay !== null ? (isDay ? "Day" : "Night") : "Night"}
                </span>
              </div>

              {/* Observing Quality */}
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Observing Quality</span>
                <span className={`font-bold ${
                  observationQuality === "Excellent" ? "text-emerald-400" :
                  observationQuality === "Very Good" ? "text-teal-400" :
                  observationQuality === "Good" ? "text-sky-400" :
                  "text-amber-400"
                }`}>
                  {observationQuality}
                </span>
              </div>

              {/* Counts row (Visible Planets / Visible Constellations) */}
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Visible Planets</span>
                <span className="font-semibold text-slate-200">{planets.length}</span>
              </div>
              <div className="flex flex-col bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Visible Constellations</span>
                <span className="font-semibold text-slate-200">{constellations.length}</span>
              </div>

              {/* Tracked Spacecraft */}
              <div className="flex flex-col col-span-2 bg-slate-950/30 p-2 rounded border border-white/5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Tracked Spacecraft</span>
                <span className="font-semibold text-slate-200">{spacecrafts.length} Active</span>
              </div>

              {/* Top Recommendation */}
              <div className="flex flex-col col-span-2 border-t border-white/5 pt-2 mt-0.5">
                <span className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Top Recommendation</span>
                <span className="font-bold text-[10.5px] mt-0.5 text-purple-300 flex items-center gap-1">
                  {topRecommendation}
                </span>
              </div>

              {/* Last Updated */}
              <div className="flex justify-between items-center col-span-2 border-t border-white/5 pt-2 mt-0.5 text-slate-500 text-[8px]">
                <span className="uppercase tracking-wider font-semibold font-orbitron">TELEMETRY FEED</span>
                <span className="font-mono text-slate-400 font-medium">UPDATED: {lastUpdated}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
