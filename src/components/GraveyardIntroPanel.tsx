import { ArrowLeft, Skull, Compass, Target } from "lucide-react";

interface GraveyardIntroPanelProps {
  active?: boolean;
  onBack?: () => void;
}

export default function GraveyardIntroPanel({
  active = false,
  onBack,
}: GraveyardIntroPanelProps) {
  return (
    <div
      className={`fixed left-6 md:left-8 top-4 md:top-5 z-50 flex flex-col w-[240px] md:w-[270px] h-[calc(100vh-2.5rem)] select-none font-inter transition-all duration-1000 ease-out transform ${
        active ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-12 pointer-events-none"
      }`}
    >
      {/* Top Header Section */}
      <header className="flex flex-col select-none mb-5 flex-shrink-0">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-red-500 hover:text-red-400 font-inter text-[10px] font-bold uppercase tracking-[0.2em] mb-4 outline-none border-none bg-transparent self-start cursor-pointer transition-colors duration-300"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back
        </button>
        <h2 className="text-[20px] md:text-[23px] font-bold font-inter tracking-[0.25em] text-white uppercase drop-shadow-[0_0_12px_rgba(239,68,68,0.25)]">
          Graveyard Mode
        </h2>
        <p className="text-[8.5px] md:text-[9.5px] font-semibold font-inter tracking-[0.2em] text-red-400/80 uppercase mt-2">
          Explore Earth's orbital graveyard
        </p>
      </header>

      {/* Main Cards Menu container */}
      <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-5 scrollbar-none pb-8">
        {/* Educational Intro Card */}
        <div className="graveyard-card flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-red-500/15 pb-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-[10px] md:text-[11px] font-bold font-inter tracking-[0.12em] text-slate-200 uppercase">
              Understanding Earth's Orbital Graveyard
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-inter font-normal">
            Over <span className="text-red-400 font-bold">40,000+ tracked objects</span> currently orbit Earth, including inactive satellites, spent rocket bodies, and debris fragments. <span className="text-red-400 font-bold">Millions of smaller fragments</span> remain too small to track, yet many travel at speeds exceeding <span className="text-red-400 font-bold">27,000 km/h</span>. Even tiny pieces can damage operational spacecraft and threaten future space missions.
          </p>
        </div>

        {/* Orbital Marker Guide Card */}
        <div className="graveyard-card flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-red-500/15 pb-2">
            <Target className="w-4 h-4 text-red-400" />
            <span className="text-[10px] md:text-[11px] font-bold font-inter tracking-[0.12em] text-slate-200 uppercase">
              Orbital Marker Guide
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🔴</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-red-400 font-inter tracking-wide uppercase">Debris</span>
                <span className="text-[9.5px] text-slate-300 font-inter leading-normal font-normal">Small tracked fragments orbiting Earth.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🚀</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-orange-400 font-inter tracking-wide uppercase">Rocket Bodies</span>
                <span className="text-[9.5px] text-slate-300 font-inter leading-normal font-normal">Spent launch vehicle stages remaining in orbit.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🛰️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 font-inter tracking-wide uppercase">Inactive Satellites</span>
                <span className="text-[9.5px] text-slate-300 font-inter leading-normal font-normal">Retired or non-operational spacecraft.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">⭐</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-400 font-inter tracking-wide uppercase">Featured Objects</span>
                <span className="text-[9.5px] text-slate-300 font-inter leading-normal font-normal">Historically significant spacecraft and orbital relics.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exploration Tips Card */}
        <div className="graveyard-card flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-red-500/15 pb-2">
            <Compass className="w-4 h-4 text-red-400" />
            <span className="text-[10px] md:text-[11px] font-bold font-inter tracking-[0.12em] text-slate-200 uppercase">
              Exploration Tips
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <p className="text-[10px] md:text-[11px] text-slate-300/95 font-inter leading-relaxed font-normal">
                Drag the globe to explore Earth's orbital environment from any angle.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <p className="text-[10px] md:text-[11px] text-slate-300/95 font-inter leading-relaxed font-normal">
                Approximately <span className="text-red-400 font-bold">200 orbital objects</span> are currently visualized in this mode to represent the orbital environment while keeping Earth clearly visible.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <p className="text-[10px] md:text-[11px] text-slate-300/95 font-inter leading-relaxed font-normal">
                Larger pulsing markers represent historically significant spacecraft and orbital objects.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <p className="text-[10px] md:text-[11px] text-slate-300/95 font-inter leading-relaxed font-normal">
                Click a featured marker to explore its history and mission details.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <p className="text-[10px] md:text-[11px] text-slate-300/95 font-inter leading-relaxed font-normal">
                Different marker colors distinguish debris, rocket bodies, inactive satellites, and featured objects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
