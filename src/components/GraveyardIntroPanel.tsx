import { ArrowLeft, Skull, Compass } from "lucide-react";

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
      className={`fixed left-6 md:left-8 top-4 md:top-5 z-50 flex flex-col w-[240px] md:w-[260px] h-[calc(100vh-2.5rem)] select-none font-outfit transition-all duration-1000 ease-out transform ${
        active ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-12 pointer-events-none"
      }`}
    >
      {/* Top Header Section */}
      <header className="flex flex-col select-none mb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-red-500 hover:text-red-400 font-outfit text-xs font-semibold uppercase tracking-[0.15em] mb-3 outline-none border-none bg-transparent self-start cursor-pointer transition-colors duration-300 pointer-events-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back
        </button>
        <h2 className="text-[21px] md:text-[26px] font-semibold font-orbitron tracking-[0.45em] text-white uppercase drop-shadow-[0_0_12px_rgba(239,68,68,0.25)]">
          Graveyard Mode
        </h2>
        <p className="text-[9px] md:text-[10px] font-medium font-outfit tracking-[0.18em] text-red-400/80 uppercase mt-1.5">
          Explore Earth's orbital graveyard
        </p>
      </header>

      {/* Main Cards Menu container */}
      <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-4 scrollbar-none pb-8 pointer-events-auto">
        {/* Introduction Card */}
        <div className="graveyard-card flex flex-col gap-2.5">
          <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200">
              ORBITAL DEBRIS REPORT
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-outfit">
            Explore inactive satellites, spent rocket bodies, and orbital debris surrounding Earth. Understand how decades of space activity have created an increasingly congested orbital environment and why responsible space operations are essential for the future of space exploration.
          </p>
        </div>

        {/* Orbital Marker Guide Card */}
        <div className="graveyard-card flex flex-col gap-2.5">
          <div className="flex items-center gap-2 border-b border-red-500/15 pb-1.5">
            <span className="text-[10px] font-semibold font-orbitron tracking-wider text-slate-200 uppercase">
              Orbital Marker Guide
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🔴</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-red-400 font-orbitron tracking-wide">Debris</span>
                <span className="text-[9.5px] text-slate-300 font-outfit leading-normal">Small tracked fragments orbiting Earth.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🚀</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-orange-400 font-orbitron tracking-wide">Rocket Bodies</span>
                <span className="text-[9.5px] text-slate-300 font-outfit leading-normal">Spent launch vehicle stages remaining in orbit.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">🛰️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 font-orbitron tracking-wide">Inactive Satellites</span>
                <span className="text-[9.5px] text-slate-300 font-outfit leading-normal">Retired or non-operational spacecraft.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-xs leading-none mt-0.5 select-none">⭐</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-amber-400 font-orbitron tracking-wide">Featured Objects</span>
                <span className="text-[9.5px] text-slate-300 font-outfit leading-normal">Historically significant spacecraft and orbital relics.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="graveyard-card flex items-center gap-2.5 py-3">
          <Compass className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-[9.5px] font-outfit text-slate-300 font-medium tracking-wide">
            Select an orbital layer or begin exploring.
          </span>
        </div>
      </div>
    </div>
  );
}
