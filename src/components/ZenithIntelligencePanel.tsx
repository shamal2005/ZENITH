import { useMemo } from "react";
import { Sun, Moon, Sunrise, Sunset, Orbit, Clock, Sparkles, Layers, Compass, Satellite, ChevronRight } from "lucide-react";
import { useISSData } from "../hooks/useISSData";
import { useSkyStatus } from "../hooks/useSkyStatus";
import { useVisiblePlanets } from "../hooks/useVisiblePlanets";

interface ZenithIntelligencePanelProps {
  active?: boolean;
  selectedLocation?: { lat: number; lng: number; label: string } | null;
  onFocusISS?: () => void;
  onFocusObject?: (obj: { id: string; name: string; lat: number; lng: number; isLive: boolean }) => void;
}

export interface SatellitePass {
  id: string;
  objectName: string;
  passTime: string;
  maxElevation: number;
  duration: number;
  visible: boolean;
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
  onFocusISS,
  onFocusObject,
}: ZenithIntelligencePanelProps) {
  const { latitude, longitude, timestamp, loading, error } = useISSData();
  const { isDay, sunrise, sunset, moonPhase, loading: skyLoading } = useSkyStatus(selectedLocation);
  const { planets, loading: planetsLoading, error: planetsError } = useVisiblePlanets(selectedLocation);

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

    const constellationsList = ["Scorpius", "Sagittarius", "Lyra", "Ursa Major", "Orion", "Cassiopeia", "Cygnus", "Pegasus"];
    const visibleConstellations = constellationsList.filter((_, idx) => ((seed * 15) + idx) % 2.5 < 1.35).slice(0, 3);
    if (visibleConstellations.length === 0) visibleConstellations.push("Ursa Major");

    const nextIssPass = 8 + Math.floor(seed * 48);
    const nextPlanetRise = 1 + Math.floor(seed * 11);
    const nextPlanetName = visiblePlanets[0] || "Saturn";

    // Seeds for different satellites
    const seedISS = seed;
    const seedTiangong = Math.abs(Math.sin(lat * 1.8) * Math.cos(lng * 0.9));
    const seedStarlink = Math.abs(Math.sin(lat * 0.7) * Math.cos(lng * 2.2));
    const seedHubble = Math.abs(Math.sin(lat * 2.5) * Math.cos(lng * 1.4));

    // ISS Status
    let issStatusText = "";
    let issStatusType: "overhead" | "upcoming" | "below" = "below";
    if (seedISS > 0.65) {
      issStatusText = "Currently Overhead";
      issStatusType = "overhead";
    } else if (seedISS > 0.25) {
      const mins = 5 + Math.floor(seedISS * 50);
      issStatusText = `Pass in ${mins} min`;
      issStatusType = "upcoming";
    } else {
      issStatusText = "Below Horizon";
      issStatusType = "below";
    }
    const issCoords = {
      lat: lat + (seedISS * 8 - 4),
      lng: lng + ((1 - seedISS) * 8 - 4),
    };

    // Tiangong Status
    let tiangongStatusText = "";
    let tiangongStatusType: "overhead" | "upcoming" | "below" = "below";
    if (seedTiangong > 0.7) {
      tiangongStatusText = "Currently Overhead";
      tiangongStatusType = "overhead";
    } else if (seedTiangong > 0.35) {
      const mins = 7 + Math.floor(seedTiangong * 45);
      tiangongStatusText = `Pass in ${mins} min`;
      tiangongStatusType = "upcoming";
    } else {
      tiangongStatusText = "Below Horizon";
      tiangongStatusType = "below";
    }
    const tiangongCoords = {
      lat: lat + (seedTiangong * 10 - 5),
      lng: lng + ((1 - seedTiangong) * 10 - 5),
    };

    // Starlink-4212 Status
    let starlinkStatusText = "";
    let starlinkStatusType: "overhead" | "upcoming" | "below" = "below";
    if (seedStarlink > 0.55) {
      starlinkStatusText = "Currently Overhead";
      starlinkStatusType = "overhead";
    } else if (seedStarlink > 0.2) {
      const mins = 3 + Math.floor(seedStarlink * 30);
      starlinkStatusText = `Pass in ${mins} min`;
      starlinkStatusType = "upcoming";
    } else {
      starlinkStatusText = "Below Horizon";
      starlinkStatusType = "below";
    }
    const starlinkCoords = {
      lat: lat + (seedStarlink * 5 - 2.5),
      lng: lng + ((1 - seedStarlink) * 5 - 2.5),
    };

    // Hubble Status
    let hubbleStatusText = "";
    let hubbleStatusType: "overhead" | "upcoming" | "below" = "below";
    if (seedHubble > 0.75) {
      hubbleStatusText = "Currently Overhead";
      hubbleStatusType = "overhead";
    } else if (seedHubble > 0.45) {
      const mins = 10 + Math.floor(seedHubble * 55);
      hubbleStatusText = `Pass in ${mins} min`;
      hubbleStatusType = "upcoming";
    } else {
      hubbleStatusText = "Below Horizon";
      hubbleStatusType = "below";
    }
    const hubbleCoords = {
      lat: lat + (seedHubble * 12 - 6),
      lng: lng + ((1 - seedHubble) * 12 - 6),
    };

    const orbitalObjects = [
      { id: "iss", name: "ISS", statusText: issStatusText, type: issStatusType, coords: issCoords, isLive: true },
      { id: "tiangong", name: "Tiangong", statusText: tiangongStatusText, type: tiangongStatusType, coords: tiangongCoords, isLive: false },
      { id: "starlink", name: "Starlink-4212", statusText: starlinkStatusText, type: starlinkStatusType, coords: starlinkCoords, isLive: false },
      { id: "hubble", name: "Hubble Space Telescope", statusText: hubbleStatusText, type: hubbleStatusType, coords: hubbleCoords, isLive: false },
    ];

    // Deterministic upcoming passes based on coordinate seeds
    const seedPass1 = seed;
    const seedPass2 = Math.abs(Math.sin(lat * 1.3) * Math.cos(lng * 0.8));
    const seedPass3 = Math.abs(Math.sin(lat * 0.5) * Math.cos(lng * 1.9));
    const seedPass4 = Math.abs(Math.sin(lat * 2.3) * Math.cos(lng * 1.2));

    // Pass 1: ISS
    const pass1Hour = 19 + Math.floor(seedPass1 * 4); // 7 PM - 10 PM
    const pass1Min = Math.floor((seedPass1 * 100) % 60);
    const pass1Elevation = 35 + Math.floor(seedPass1 * 50); // 35° - 85°
    const pass1Duration = 180 + Math.floor(seedPass1 * 300); // 180s - 480s

    // Pass 2: Tiangong
    const pass2Hour = 5 + Math.floor(seedPass2 * 3); // 5 AM - 7 AM
    const pass2Min = Math.floor((seedPass2 * 100) % 60);
    const pass2Elevation = 30 + Math.floor(seedPass2 * 45); // 30° - 75°
    const pass2Duration = 120 + Math.floor(seedPass2 * 280);

    // Pass 3: Starlink Group
    const pass3Hour = 18 + Math.floor(seedPass3 * 5); // 6 PM - 11 PM
    const pass3Min = Math.floor((seedPass3 * 100) % 60);
    const pass3Elevation = 40 + Math.floor(seedPass3 * 40); // 40° - 80°
    const pass3Duration = 150 + Math.floor(seedPass3 * 200);

    // Pass 4: Hubble Space Telescope
    const pass4Hour = 3 + Math.floor(seedPass4 * 4); // 3 AM - 6 AM
    const pass4Min = Math.floor((seedPass4 * 100) % 60);
    const pass4Elevation = 25 + Math.floor(seedPass4 * 35); // 25° - 60°
    const pass4Duration = 100 + Math.floor(seedPass4 * 180);

    const upcomingPasses: SatellitePass[] = [
      {
        id: "iss-pass",
        objectName: "ISS",
        passTime: `Today • ${String(pass1Hour > 12 ? pass1Hour - 12 : pass1Hour).padStart(2, "0")}:${String(pass1Min).padStart(2, "0")} ${pass1Hour >= 12 ? "PM" : "AM"}`,
        maxElevation: pass1Elevation,
        duration: pass1Duration,
        visible: pass1Elevation > 45
      },
      {
        id: "tiangong-pass",
        objectName: "Tiangong",
        passTime: `Tomorrow • ${String(pass2Hour > 12 ? pass2Hour - 12 : pass2Hour).padStart(2, "0")}:${String(pass2Min).padStart(2, "0")} ${pass2Hour >= 12 ? "PM" : "AM"}`,
        maxElevation: pass2Elevation,
        duration: pass2Duration,
        visible: pass2Elevation > 45
      },
      {
        id: "starlink-pass",
        objectName: "Starlink Group",
        passTime: `Tomorrow • ${String(pass3Hour > 12 ? pass3Hour - 12 : pass3Hour).padStart(2, "0")}:${String(pass3Min).padStart(2, "0")} ${pass3Hour >= 12 ? "PM" : "AM"}`,
        maxElevation: pass3Elevation,
        duration: pass3Duration,
        visible: pass3Elevation > 45
      },
      {
        id: "hubble-pass",
        objectName: "Hubble Space Telescope",
        passTime: `Jun ${new Date().getDate() + 2} • ${String(pass4Hour > 12 ? pass4Hour - 12 : pass4Hour).padStart(2, "0")}:${String(pass4Min).padStart(2, "0")} ${pass4Hour >= 12 ? "PM" : "AM"}`,
        maxElevation: pass4Elevation,
        duration: pass4Duration,
        visible: pass4Elevation > 45
      }
    ];

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
      orbitalObjects,
      upcomingPasses,
      snapshot: {
        satellites,
        planetsCount: visiblePlanets.length,
        constellationsCount: visibleConstellations.length,
        nextEvent: `ISS Pass in ${nextIssPass} min`,
      }
    };
  }, [selectedLocation]);

  if (!selectedLocation || !data) return null;

  return (
    <div
      className={`fixed right-6 md:right-8 top-4 md:top-5 z-50 flex flex-col w-[260px] md:w-[300px] h-[calc(100vh-2.5rem)] select-none pointer-events-auto transition-all duration-1000 ease-out transform ${
        active ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none"
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
            {(() => {
              const isClickable = !loading && !error && latitude !== null && longitude !== null;
              return (
                <div 
                  onClick={() => {
                    if (isClickable && onFocusISS) {
                      onFocusISS();
                    }
                  }}
                  className={`flex flex-col gap-1.5 bg-slate-950/45 px-2.5 py-2.5 rounded-lg border text-[10px] font-outfit transition-all duration-300 ${
                    isClickable 
                      ? "cursor-pointer border-purple-500/15 hover:border-purple-400/40 hover:bg-slate-900/50 hover:shadow-[0_0_12px_rgba(192,132,252,0.1)] active:scale-[0.98]" 
                      : "border-purple-500/15"
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-purple-500/10 pb-1">
                    <span className="text-slate-400 font-medium">ISS Status</span>
                {loading ? (
                  <span className="font-mono font-bold text-purple-400/60 animate-pulse text-[9px]">CONNECTING...</span>
                ) : error ? (
                  <span className="font-mono font-bold text-red-400 text-[9px]">OFFLINE</span>
                ) : (
                  <span className="font-mono font-bold text-emerald-400 animate-pulse text-[9px]">LIVE TELEMETRY</span>
                )}
              </div>
              
              {loading ? (
                <div className="flex flex-col gap-1 py-1 animate-pulse">
                  <div className="h-3 bg-purple-950/20 rounded w-2/3"></div>
                  <div className="h-3 bg-purple-950/20 rounded w-3/4"></div>
                  <div className="h-3 bg-purple-950/20 rounded w-1/2"></div>
                </div>
              ) : error ? (
                <div className="text-red-400/90 font-medium py-1 text-center text-[9.5px]">
                  Live telemetry unavailable
                </div>
              ) : (
                <div className="flex flex-col gap-1 text-[9.5px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 uppercase tracking-wider text-[8px]">Current Position</span>
                    <span className="font-mono text-slate-300 font-medium">
                      LAT: {latitude !== null ? `${latitude.toFixed(4)}°` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <span className="font-mono text-slate-300 font-medium">
                      LNG: {longitude !== null ? `${longitude.toFixed(4)}°` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-purple-500/5 pt-1 mt-0.5">
                    <span className="text-slate-500 uppercase tracking-wider text-[8px]">Last Updated</span>
                    <span className="font-mono text-purple-300">
                      {timestamp !== null ? new Date(timestamp * 1000).toLocaleTimeString() : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
              );
            })()}
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
          {planetsLoading ? (
            <div className="animate-pulse flex flex-col gap-2.5 py-0.5">
              <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
                <Sparkles className="w-4 h-4 text-purple-500/30" />
                <div className="h-3 bg-purple-500/20 rounded w-1/2" />
              </div>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/20 px-2.5 py-2.5 rounded-lg border border-purple-500/5 h-[34px]">
                    <div className="flex items-center gap-2 w-1/3">
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-500/10" />
                      <div className="h-2.5 bg-purple-500/10 rounded w-full" />
                    </div>
                    <div className="h-2.5 bg-purple-500/10 rounded w-1/4" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 transition-opacity duration-500 ease-out animate-in fade-in">
              <div className="flex items-center justify-between border-b border-purple-500/15 pb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                    VISIBLE PLANETS
                  </span>
                </div>
                {(planetsError || planets.some(p => p.isFallback)) && (
                  <span className="text-[7.5px] font-medium font-outfit uppercase tracking-wider text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Horizons Offline • Predictions
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {planets.map((planet) => (
                  <div
                    key={planet.name}
                    className="flex items-center justify-between bg-slate-950/45 px-2.5 py-2 rounded-lg border border-purple-500/15 text-[10px] font-outfit transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <PlanetIcon name={planet.name} className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-200">{planet.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${planet.visible ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" : "bg-slate-700/60"}`} />
                      <span className="text-slate-300">
                        {planet.visible ? `Visible • Altitude ${planet.altitude}°` : "Below Horizon"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="grid grid-cols-2 gap-2 text-[10px] font-outfit">
            {data.constellations.map((constellation, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-slate-950/30 px-2 py-1 rounded-lg border border-slate-800/40 text-slate-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="truncate">{constellation}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4.5: Objects Above You */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Satellite className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              OBJECTS ABOVE YOU
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {data.orbitalObjects.map((obj) => {
              const isOverhead = obj.type === "overhead";
              const isUpcoming = obj.type === "upcoming";

              let statusColorClass = "text-slate-500";
              let statusDot = null;
              if (isOverhead) {
                statusColorClass = "text-emerald-400 font-semibold";
                statusDot = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />;
              } else if (isUpcoming) {
                statusColorClass = "text-amber-400 font-medium";
                statusDot = <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />;
              } else {
                statusColorClass = "text-slate-500";
                statusDot = <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60" />;
              }

              const ObjectIcon = (obj.id === "iss" || obj.id === "tiangong") ? Orbit : Satellite;

              return (
                <div
                  key={obj.id}
                  onClick={() => {
                    if (onFocusObject) {
                      if (obj.id === "iss" && latitude !== null && longitude !== null) {
                        onFocusObject({
                          id: obj.id,
                          name: obj.name,
                          lat: latitude,
                          lng: longitude,
                          isLive: true
                        });
                      } else {
                        onFocusObject({
                          id: obj.id,
                          name: obj.name,
                          lat: obj.coords.lat,
                          lng: obj.coords.lng,
                          isLive: false
                        });
                      }
                    }
                  }}
                  className="flex items-center justify-between bg-slate-950/45 px-2.5 py-2 rounded-lg border border-purple-500/15 text-[10px] font-outfit transition-all duration-300 cursor-pointer hover:border-purple-400/40 hover:bg-slate-900/40 hover:shadow-[0_0_12px_rgba(192,132,252,0.08)] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <ObjectIcon className="w-3.5 h-3.5 text-purple-400/80" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200">{obj.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {statusDot}
                        <span className={statusColorClass}>{obj.statusText}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 transition-colors duration-300 hover:text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 5: Upcoming Passes */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              UPCOMING PASSES
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {data.upcomingPasses.map((pass) => {
              const PassIcon = (pass.objectName === "ISS" || pass.objectName === "Tiangong") ? Orbit : Satellite;
              return (
                <div
                  key={pass.id}
                  className="flex flex-col gap-1 bg-slate-950/20 hover:bg-slate-950/45 px-2.5 py-2 rounded-lg border border-slate-800/30 hover:border-purple-500/25 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PassIcon className="w-3.5 h-3.5 text-purple-400/80" />
                      <span className="font-semibold text-slate-200 text-[10px]">{pass.objectName}</span>
                    </div>
                    {pass.visible && (
                      <span className="text-[7.5px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Visible
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-outfit text-slate-400 mt-0.5">
                    <span>{pass.passTime}</span>
                    <span className="font-medium text-slate-300">Max El: <span className="font-mono font-semibold text-purple-300">{pass.maxElevation}°</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 6: Zenith Snapshot */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              ZENITH SNAPSHOT
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-outfit text-slate-300">
            <div className="flex flex-col bg-slate-950/45 p-2 rounded-lg border border-slate-800/40">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Satellites</span>
              <span className="font-bold text-[11px] mt-0.5 text-purple-300">{data.snapshot.satellites}</span>
            </div>
            <div className="flex flex-col bg-slate-950/45 p-2 rounded-lg border border-slate-800/40">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Planets</span>
              <span className="font-bold text-[11px] mt-0.5 text-purple-300">
                {planetsLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${planets.filter((p) => p.visible).length} Visible`
                )}
              </span>
            </div>
            <div className="flex flex-col bg-slate-950/45 p-2 rounded-lg border border-slate-800/40">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Constellations</span>
              <span className="font-bold text-[11px] mt-0.5 text-purple-300">{data.snapshot.constellationsCount} Active</span>
            </div>
            <div className="flex flex-col bg-slate-950/45 p-2 rounded-lg border border-slate-800/40">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Next Event</span>
              <span className="font-bold text-[9px] mt-0.5 text-purple-300 truncate">{data.snapshot.nextEvent}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
