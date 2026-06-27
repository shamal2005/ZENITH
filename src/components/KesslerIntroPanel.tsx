import { ArrowLeft, Cpu } from "lucide-react";

interface KesslerIntroPanelProps {
  active?: boolean;
  onBack?: () => void;
}

export default function KesslerIntroPanel({
  active = false,
  onBack,
}: KesslerIntroPanelProps) {
  return (
    <div
      className={`fixed left-6 md:left-8 top-4 md:top-5 z-50 flex flex-col w-[240px] md:w-[270px] h-[calc(100vh-2.5rem)] select-none font-inter transition-all duration-1000 ease-out transform ${
        active ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-12 pointer-events-none"
      }`}
    >
      {/* Top Header Section */}
      <header className="flex flex-col select-none mb-6 flex-shrink-0">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-purple-500 hover:text-purple-400 font-inter text-[10px] font-bold uppercase tracking-[0.2em] mb-4 outline-none border-none bg-transparent self-start cursor-pointer transition-colors duration-300"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back
        </button>
        <h2 className="text-[20px] md:text-[23px] font-bold font-inter tracking-[0.25em] text-white uppercase drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]">
          KESSLER SIM
        </h2>
        <p className="text-[8.5px] md:text-[9.5px] font-semibold font-inter tracking-[0.2em] text-purple-400/80 uppercase mt-2">
          Collision & debris cascade simulation
        </p>
      </header>

      {/* Main Cards Menu container */}
      <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-6 scrollbar-none pb-8">
        {/* Card 1 — INTRODUCTION */}
        <div className="kessler-card flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] md:text-[11px] font-bold font-inter tracking-[0.12em] text-slate-200 uppercase">
              Kessler Syndrome
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-inter font-normal">
            Kessler Syndrome is a theoretical chain reaction in which collisions between satellites and orbital debris generate even more debris, dramatically increasing the likelihood of future collisions. This simulation demonstrates how a single orbital collision can escalate into a cascading event capable of threatening satellites, missions, and the long-term sustainability of Earth's orbital environment.
          </p>
        </div>

        {/* Card 2 — START CARD */}
        <div className="kessler-card flex flex-col gap-3 border border-purple-500/20 bg-purple-950/10">
          <div className="flex items-center gap-2 border-b border-purple-500/15 pb-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] md:text-[11px] font-bold font-inter tracking-[0.12em] text-purple-400 uppercase">
              Simulation Ready
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-300 leading-relaxed font-inter font-normal whitespace-pre-line">
            The simulation environment has been initialized successfully.

            Press **Start Simulation** to observe how a single orbital collision can evolve into a cascading debris event.

            The orbital environment is currently stable and awaiting initialization.
          </p>
        </div>
      </div>
    </div>
  );
}
