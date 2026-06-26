import { X, Calendar, Globe, Rocket, Orbit, Info, ShieldAlert, Award, Activity } from "lucide-react";
import featuredMetadata from "../lib/featured-objects-metadata.json";

interface GraveyardIntelligencePanelProps {
  active?: boolean;
  objectId: string | null;
  onClose: () => void;
}

interface MetadataItem {
  name: string;
  status: string;
  launchDate: string;
  country: string;
  mission: string;
  launchVehicle: string;
  orbitType: string;
  yearsInOrbit: string;
  historicalSignificance: string;
  currentCondition: string;
  description: string;
}

export default function GraveyardIntelligencePanel({
  active = false,
  objectId,
  onClose,
}: GraveyardIntelligencePanelProps) {
  const metadata = objectId ? (featuredMetadata as Record<string, MetadataItem>)[objectId] : null;

  return (
    <div
      className={`fixed right-6 md:right-8 top-4 md:top-5 z-50 flex flex-col w-[260px] md:w-[300px] h-[calc(100vh-2.5rem)] select-none transition-all duration-1000 ease-out transform ${
        active && objectId ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-12 pointer-events-none"
      }`}
    >
      {/* Header Block */}
      <header className="flex items-center justify-between select-none mb-4 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-[16px] md:text-[18px] font-semibold font-orbitron tracking-[0.25em] text-white uppercase drop-shadow-[0_0_12px_rgba(239,68,68,0.25)] leading-snug">
            Object Archive
          </h2>
          <p className="text-[9px] md:text-[10px] font-medium font-outfit tracking-[0.18em] text-red-400/80 uppercase mt-1">
            Historical Object Dossier
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400/40 text-red-400 hover:text-red-300 transition-all duration-300 cursor-pointer outline-none flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Cards List (scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-4 scrollbar-none pb-8">
        {!metadata ? (
          <div className="graveyard-card py-6 flex items-center justify-center">
            <span className="text-[11px] text-slate-400 font-outfit">
              Information currently unavailable.
            </span>
          </div>
        ) : (
          <>
            {/* Identity & Description Card */}
            <div className="graveyard-card flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-red-500/15 pb-1.5 gap-2">
                <span className="text-[12px] font-bold font-orbitron tracking-wider text-slate-200 uppercase truncate">
                  {metadata.name || "Unknown Object"}
                </span>
                <span className="px-2 py-0.5 rounded text-[8px] font-semibold font-orbitron tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 uppercase flex-shrink-0">
                  {metadata.status || "Inactive"}
                </span>
              </div>
              <p className="text-[10.5px] md:text-[11.5px] text-slate-300 leading-relaxed font-outfit">
                {metadata.description || "Information currently unavailable."}
              </p>
            </div>

            {/* Quick Specs Card */}
            <div className="graveyard-card flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
                <Info className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                  TECHNICAL DOSSIER
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center justify-between border-b border-red-500/5 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span className="text-[9.5px] text-slate-400 uppercase font-outfit">Launch Date</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 font-outfit text-right">{metadata.launchDate || "Information currently unavailable."}</span>
                </div>
                <div className="flex items-center justify-between border-b border-red-500/5 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span className="text-[9.5px] text-slate-400 uppercase font-outfit">Origin</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 font-outfit text-right">{metadata.country || "Information currently unavailable."}</span>
                </div>
                <div className="flex items-center justify-between border-b border-red-500/5 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span className="text-[9.5px] text-slate-400 uppercase font-outfit">Vehicle</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 font-outfit text-right">{metadata.launchVehicle || "Information currently unavailable."}</span>
                </div>
                <div className="flex items-center justify-between border-b border-red-500/5 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Orbit className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span className="text-[9.5px] text-slate-400 uppercase font-outfit">Orbit Type</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 font-outfit text-right">{metadata.orbitType || "Information currently unavailable."}</span>
                </div>
                <div className="flex items-center justify-between border-b border-red-500/5 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                    <span className="text-[9.5px] text-slate-400 uppercase font-outfit">Time In Orbit</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 font-outfit text-right">{metadata.yearsInOrbit ? `${metadata.yearsInOrbit} years` : "Information currently unavailable."}</span>
                </div>
              </div>
            </div>

            {/* Mission & Purpose Card */}
            <div className="graveyard-card flex flex-col gap-2.5">
              <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
                <Award className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                  MISSION OBJECTIVE
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-outfit">
                {metadata.mission || "Information currently unavailable."}
              </p>
            </div>

            {/* Historical Significance Card */}
            <div className="graveyard-card flex flex-col gap-2.5">
              <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
                <Info className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                  HISTORICAL SIGNIFICANCE
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-outfit">
                {metadata.historicalSignificance || "Information currently unavailable."}
              </p>
            </div>

            {/* Current Condition Card */}
            <div className="graveyard-card flex flex-col gap-2.5">
              <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
                  CURRENT CONDITION
                </span>
              </div>
              <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-outfit">
                {metadata.currentCondition || "Information currently unavailable."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
