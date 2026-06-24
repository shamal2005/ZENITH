import { useState, useRef, useEffect } from "react";
import { ArrowLeft, MapPin, Search, Compass, Loader2, AlertCircle, CheckCircle2, Target, Globe } from "lucide-react";
import { toast } from "sonner";

interface ZenithLocationPanelProps {
  active?: boolean;
  selectedLocation?: { lat: number; lng: number; label: string } | null;
  isGlobeClickActive?: boolean;
  setIsGlobeClickActive?: (active: boolean) => void;
  onBack?: () => void;
  onSelectLocation?: (loc: { lat: number; lng: number; label: string }) => void;
}

// Pre-defined database of cities for simulation mapping
const CITY_DATABASE: Record<string, { lat: number; lon: number; name: string }> = {
  tokyo: { lat: 35.6762, lon: 139.6503, name: "Tokyo, Japan" },
  newyork: { lat: 40.7128, lon: -74.0060, name: "New York, USA" },
  newyorkcity: { lat: 40.7128, lon: -74.0060, name: "New York, USA" },
  nyc: { lat: 40.7128, lon: -74.0060, name: "New York, USA" },
  london: { lat: 51.5074, lon: -0.1278, name: "London, UK" },
  paris: { lat: 48.8566, lon: 2.3522, name: "Paris, France" },
  cairo: { lat: 30.0444, lon: 31.2357, name: "Cairo, Egypt" },
  sydney: { lat: -33.8688, lon: 151.2093, name: "Sydney, Australia" },
  dubai: { lat: 25.2048, lon: 55.2708, name: "Dubai, UAE" },
  mumbai: { lat: 19.0760, lon: 72.8777, name: "Mumbai, India" },
  rio: { lat: -22.9068, lon: -43.1729, name: "Rio de Janeiro, Brazil" },
  riodejaneiro: { lat: -22.9068, lon: -43.1729, name: "Rio de Janeiro, Brazil" },
};

export default function ZenithLocationPanel({
  active = false,
  selectedLocation = null,
  isGlobeClickActive = false,
  setIsGlobeClickActive,
  onBack,
  onSelectLocation,
}: ZenithLocationPanelProps) {
  // Geolocation states
  const [geoState, setGeoState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");

  // Search states
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFeedback, setSearchFeedback] = useState<{ status: "success" | "error" | ""; text: string }>({
    status: "",
    text: "",
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when expanding search
  useEffect(() => {
    if (isSearching) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  }, [isSearching]);

  // Geolocation trigger
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoState("error");
      setGeoMessage("Geolocation not supported");
      toast.error("Geolocation is not supported by your browser.", {
        className: "zenith-toast-error",
      });
      return;
    }

    setGeoState("loading");
    setGeoMessage("Acquiring signal...");
    setIsGlobeClickActive?.(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGeoState("success");
        setGeoMessage(`Lock: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);

        // Pass coordinates to parent handler with the standard label
        onSelectLocation?.({
          lat: latitude,
          lng: longitude,
          label: "My Location",
        });

        // Reset acquisition visual state back to idle after a few seconds
        setTimeout(() => {
          setGeoState("idle");
          setGeoMessage("");
        }, 4000);
      },
      (error) => {
        setGeoState("error");
        let errorMsg = "Acquisition failed";

        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Access Denied";
          toast.error("Location access denied. Use Manual Search instead.", {
            className: "zenith-toast-error",
          });
        } else {
          toast.error("Failed to acquire location signal.", {
            className: "zenith-toast-error",
          });
        }

        setGeoMessage(errorMsg);

        setTimeout(() => {
          setGeoState("idle");
          setGeoMessage("");
        }, 4500);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search query processor
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    setIsGlobeClickActive?.(false);

    // 1. Try parsing coordinates direct (e.g. 48.85, 2.35)
    const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (coordRegex.test(query) || query.split(/[\s,]+/).length === 2) {
      const parts = query.split(/[\s,]+/);
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setSearchFeedback({
          status: "success",
          text: `Target locked: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        });
        onSelectLocation?.({
          lat,
          lng: lon,
          label: `Coordinates: ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        });
        return;
      }
    }

    // 2. Lookup in city database
    const sanitizedKey = query.replace(/[^a-z]/g, "");
    const matchedCity = CITY_DATABASE[sanitizedKey];
    if (matchedCity) {
      setSearchFeedback({
        status: "success",
        text: `Locked onto ${matchedCity.name}`,
      });
      onSelectLocation?.({
        lat: matchedCity.lat,
        lng: matchedCity.lon,
        label: matchedCity.name,
      });
    } else {
      setSearchFeedback({
        status: "error",
        text: "City not found. Enter 'lat, lon'",
      });
    }
  };

  // Back transition handler
  const handleBack = () => {
    setIsSearching(false);
    setSearchQuery("");
    setSearchFeedback({ status: "", text: "" });
    onBack?.();
  };

  return (
    <>
      {/* Top Header Section */}
      <header
        className={`fixed left-6 md:left-8 top-4 md:top-5 z-50 flex flex-col select-none transition-all duration-1000 ease-out transform ${active ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-6 pointer-events-none"
          }`}
        style={{ transitionDelay: "100ms" }}
      >
        <button
          onClick={handleBack}
          className="group flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-outfit text-xs font-semibold uppercase tracking-[0.15em] mb-3 outline-none border-none bg-transparent self-start cursor-pointer transition-colors duration-300"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          Back
        </button>
        <h2 className="text-[21px] md:text-[26px] font-semibold font-orbitron tracking-[0.45em] text-white uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
          Zenith View
        </h2>
        <p className="text-[9px] md:text-[10px] font-medium font-outfit tracking-[0.18em] text-slate-400/85 uppercase mt-1.5">
          Choose a location to explore the sky above it
        </p>
      </header>

      {/* Main Cards Menu container */}
      <div
        className={`fixed left-6 md:left-8 z-50 flex flex-col gap-4 w-[240px] md:w-[260px] h-auto select-none font-outfit transition-all duration-1000 ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        style={{ top: "max(calc(50% + 60px), 245px)", transform: "translateY(-50%)" }}
      >
        <div className="flex flex-col gap-4">
          {/* Card 1: My Location */}
          <div
            onClick={geoState === "loading" ? undefined : handleGeolocation}
            className={`group feature-card-base feature-card-zenith transform transition-all duration-500 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
              }`}
            style={{ transitionDelay: "300ms", cursor: geoState === "loading" ? "default" : "pointer" }}
          >
            {/* Left Icon Wrapper */}
            <div className="flex items-center justify-center w-11 h-11 rounded-full border border-blue-500/20 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.1)] group-hover:scale-105 group-hover:border-blue-400/40 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-all duration-300 flex-shrink-0 z-10">
              {geoState === "loading" ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : geoState === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />
              ) : geoState === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <MapPin className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 ml-3 pr-1 z-10 select-none">
              <h3 className="text-[10px] md:text-xs font-semibold font-orbitron tracking-[0.15em] text-slate-200 uppercase mb-0.5 group-hover:text-white transition-colors duration-300">
                My Location
              </h3>
              <p className="text-[10px] md:text-[11px] font-normal font-outfit text-slate-400/90 leading-tight">
                {geoMessage || "Detect browser coordinates instantly"}
              </p>
            </div>
          </div>

          {/* Card 2: Manual Search */}
          <div
            onClick={() => {
              if (!isSearching) {
                setIsSearching(true);
                setIsGlobeClickActive?.(false);
              }
            }}
            className={`group feature-card-base feature-card-zenith transform transition-all duration-500 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
              }`}
            style={{
              transitionDelay: "450ms",
              height: isSearching ? "124px" : "97px",
              cursor: isSearching ? "default" : "pointer",
            }}
          >
            {/* Left Icon Wrapper */}
            <div className={`absolute left-4 top-6 flex items-center justify-center w-11 h-11 rounded-full border border-blue-500/20 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.1)] group-hover:scale-105 group-hover:border-blue-400/40 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-all duration-300 flex-shrink-0 z-10 ${
              isSearching ? "opacity-0 pointer-events-none invisible scale-75" : "opacity-100 scale-100"
            }`}>
              <Search className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            </div>

            {/* Standard Text Content (visible only when not searching) */}
            <div
              className={`flex-1 ml-15 pr-1 z-10 transition-opacity duration-300 ${isSearching ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
            >
              <h3 className="text-[10px] md:text-xs font-semibold font-orbitron tracking-[0.15em] text-slate-200 uppercase mb-0.5 group-hover:text-white transition-colors duration-300">
                Manual Search
              </h3>
              <p className="text-[10px] md:text-[11px] font-normal font-outfit text-slate-400/90 leading-tight">
                Enter coordinates or search major global cities
              </p>
            </div>

            {/* Expandable Form Content (visible only when searching) */}
            <div
              className={`absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between z-20 transition-opacity duration-500 ${isSearching ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
              <div className="flex justify-between items-center w-full mb-1">
                <span className="text-[9px] font-semibold font-orbitron tracking-[0.12em] text-slate-400 uppercase">
                  Search Location
                </span>
                {isSearching && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearching(false);
                      setSearchQuery("");
                      setSearchFeedback({ status: "", text: "" });
                    }}
                    className="text-[9px] font-medium font-outfit text-slate-400 hover:text-white border-none bg-transparent cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full mt-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="e.g. Tokyo, or 40.71, -74.00"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/75 text-white placeholder:text-slate-600 border border-slate-800/80 focus:border-blue-500/40 rounded-lg px-3 py-1.5 text-xs font-outfit outline-none transition-all duration-300 pr-8"
                />
                <button
                  type="submit"
                  className="absolute right-1 text-slate-500 hover:text-white transition-colors duration-200 p-1 bg-transparent border-none cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Feedback text */}
              <div className="text-[9px] h-3.5 font-outfit flex items-center gap-1 select-none">
                {searchFeedback.status === "success" && (
                  <span className="text-emerald-400 font-semibold">{searchFeedback.text}</span>
                )}
                {searchFeedback.status === "error" && (
                  <span className="text-red-400 font-semibold">{searchFeedback.text}</span>
                )}
                {!searchFeedback.status && (
                  <span className="text-slate-500/80">Press Enter or click icon to search</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Globe Targeting */}
          <div
            onClick={() => {
              setIsSearching(false);
              setIsGlobeClickActive?.(!isGlobeClickActive);
            }}
            className={`group feature-card-base transform transition-all duration-500 ${isGlobeClickActive ? "feature-card-globe-active" : "feature-card-zenith"
              } ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
              }`}
            style={{ transitionDelay: "600ms", cursor: "pointer" }}
          >
            {/* Left Icon Wrapper */}
            <div className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all duration-300 flex-shrink-0 z-10 ${isGlobeClickActive
              ? "border-[#05ffc3]/40 bg-[#05ffc3]/15 text-[#05ffc3] shadow-[0_0_12px_rgba(5,255,195,0.35)]"
              : "border-blue-500/20 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.1)] group-hover:scale-105 group-hover:border-blue-400/40 group-hover:shadow-[0_0_12px_rgba(5,255,195,0.2)]"
              }`}>
              <Globe className={`w-5 h-5 transition-colors duration-300 ${isGlobeClickActive
                ? "text-[#05ffc3] animate-spin-slow"
                : "text-blue-400 group-hover:text-blue-300"
                }`} />
            </div>

            {/* Text Content */}
            <div className="flex-1 ml-3 pr-1 z-10 select-none">
              <h3 className={`text-[10px] md:text-xs font-semibold font-orbitron tracking-[0.15em] uppercase mb-0.5 transition-colors duration-300 ${isGlobeClickActive ? "text-[#05ffc3]" : "text-slate-200 group-hover:text-white"
                }`}>
                Globe Targeting
              </h3>
              <p className={`text-[10px] md:text-[11px] font-normal font-outfit leading-tight transition-colors duration-300 ${isGlobeClickActive ? "text-[#05ffc3]/90" : "text-slate-400/90"
                }`}>
                {isGlobeClickActive ? "Active — Click anywhere on Earth" : "Click anywhere on globe to lock location"}
              </p>
            </div>
          </div>

          {/* Target Coordinates Telemetry HUD */}
          {selectedLocation && (
            <div
              className="flex flex-col gap-2 p-3.5 rounded-xl border border-sky-500/25 bg-sky-500/5 shadow-[inset_0_0_12px_rgba(14,165,233,0.1),0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-500"
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span className="text-[9px] font-semibold font-orbitron tracking-[0.15em] text-sky-400 uppercase">
                  Telemetry Locked
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-200 truncate">
                  {selectedLocation.label}
                </span>
                <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                  LAT: {Math.abs(selectedLocation.lat).toFixed(4)}° {selectedLocation.lat >= 0 ? "N" : "S"}
                </span>
                <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                  LNG: {Math.abs(selectedLocation.lng).toFixed(4)}° {selectedLocation.lng >= 0 ? "E" : "W"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
