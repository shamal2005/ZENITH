import { useMemo } from "react";
import { Sun, Moon, Sunrise, Sunset, Orbit, Clock, Sparkles, Layers, Compass } from "lucide-react";
import { useISSData } from "../hooks/useISSData";

interface ZenithIntelligencePanelProps {
  active?: boolean;
  selectedLocation?: { lat: number; lng: number; label: string } | null;
}

export default function ZenithIntelligencePanel({
  active = false,
  selectedLocation = null,
}: ZenithIntelligencePanelProps) {
  const { latitude, longitude, timestamp, loading, error } = useISSData();

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
      events: [
        { time: `${nextIssPass} min`, desc: "ISS Pass Over" },
        { time: `${nextPlanetRise} hr`, desc: `${nextPlanetName} Rise` },
        { time: "Tonight", desc: "Meteor Activity (Peak)" },
      ],
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
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            {data.skyStatus.isNight ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              SKY STATUS — {data.skyStatus.isNight ? "NIGHT" : "DAY"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-[10px] font-outfit text-slate-300">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Sunrise</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <Sunrise className="w-3.5 h-3.5 text-amber-500/80" />
                {data.skyStatus.sunrise}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Sunset</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <Sunset className="w-3.5 h-3.5 text-indigo-500/80" />
                {data.skyStatus.sunset}
              </span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-slate-500 text-[8px] uppercase tracking-wider">Moon Phase</span>
              <span className="font-semibold flex items-center gap-1 mt-0.5">
                <Moon className="w-3.5 h-3.5 text-slate-400" />
                {data.skyStatus.moonPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Objects Above You (Hero Card) */}
        <div className="intel-card-base intel-card-hero flex flex-col gap-3.5">
          <div className="flex items-center gap-2 border-b border-purple-400/25 pb-1.5">
            <Orbit className="w-4 h-4 text-purple-400 animate-spin-slow" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-purple-400">
              OBJECTS ABOVE YOU
            </span>
          </div>
          <div className="flex flex-col gap-2.5 text-[10px] font-outfit">
            <div className="flex flex-col gap-1.5 bg-slate-950/45 px-2.5 py-2.5 rounded-lg border border-purple-500/15 text-[10px] font-outfit">
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
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              VISIBLE PLANETS
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {data.planets.map((planet, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/25 text-slate-300 text-[9px] font-medium font-outfit uppercase tracking-wider"
              >
                {planet}
              </span>
            ))}
          </div>
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

        {/* Card 5: Upcoming Events */}
        <div className="intel-card-base flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              UPCOMING EVENTS
            </span>
          </div>
          <div className="flex flex-col gap-2 font-outfit">
            {data.events.map((event, idx) => (
              <div key={idx} className="flex gap-2 text-[10px] leading-tight">
                <span className="font-mono text-purple-400 w-12 flex-shrink-0 text-right font-bold">{event.time}</span>
                <span className="text-slate-300 flex-1">{event.desc}</span>
              </div>
            ))}
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
              <span className="font-bold text-[11px] mt-0.5 text-purple-300">{data.snapshot.planetsCount} Visible</span>
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
