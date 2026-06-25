import { useEffect, useState } from "react";

export interface SkyStatus {
  isDay: boolean | null;
  sunrise: string | null;
  sunset: string | null;
  moonPhase: string | null;
  loading: boolean;
  error: Error | null;
}

export function useSkyStatus(
  selectedLocation: { lat: number; lng: number } | null
): SkyStatus {
  const [data, setData] = useState<SkyStatus>({
    isDay: null,
    sunrise: null,
    sunset: null,
    moonPhase: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!selectedLocation) {
      setData({
        isDay: null,
        sunrise: null,
        sunset: null,
        moonPhase: null,
        loading: false,
        error: null,
      });
      return;
    }

    let active = true;
    const { lat, lng } = selectedLocation;

    async function fetchSkyData() {
      setData((prev) => ({ ...prev, loading: true, error: null }));
      try {
        // Fetch sunrise-sunset data in ISO 8601 formatted UTC times (formatted=0)
        const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Sunrise-Sunset API responded with status ${response.status}`);
        }
        const json = await response.json();
        if (json.status !== "OK" || !json.results) {
          throw new Error("Invalid response from Sunrise-Sunset API");
        }

        if (!active) return;

        const results = json.results;
        const sunriseDate = new Date(results.sunrise);
        const sunsetDate = new Date(results.sunset);
        const nowDate = new Date();

        // Helper to format Date objects to user local time format like "06:08 AM"
        const formatTime = (date: Date) => {
          let hours = date.getHours();
          const minutes = date.getMinutes();
          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          const strMinutes = minutes < 10 ? "0" + minutes : minutes;
          const strHours = hours < 10 ? "0" + hours : hours;
          return `${strHours}:${strMinutes} ${ampm}`;
        };

        const sunriseStr = formatTime(sunriseDate);
        const sunsetStr = formatTime(sunsetDate);

        // Determine Day/Night at selected location by comparing timestamps
        const nowTime = nowDate.getTime();
        const sunriseTime = sunriseDate.getTime();
        const sunsetTime = sunsetDate.getTime();
        
        let isDay = false;
        if (sunriseTime < sunsetTime) {
          // Standard day sequence: sunrise happens before sunset on the same UTC day
          isDay = nowTime >= sunriseTime && nowTime <= sunsetTime;
        } else {
          // Crosses over midnight/day boundary (common in high latitudes or timezone offsets)
          isDay = nowTime >= sunriseTime || nowTime <= sunsetTime;
        }

        // Calculate Moon Phase (0.0 to 1.0)
        // Known New Moon reference point: 2000-01-06 18:14 UTC
        const epoch = Date.UTC(2000, 0, 6, 18, 14, 0);
        const msPerDay = 86400000;
        const synodicMonth = 29.530588853;
        const elapsedDays = (nowDate.getTime() - epoch) / msPerDay;
        let p = (elapsedDays / synodicMonth) % 1;
        if (p < 0) p += 1;

        // Map fractional value to moon phase text with suitable tolerances
        let moonPhase = "New Moon";
        if (p < 0.02 || p >= 0.98) {
          moonPhase = "New Moon";
        } else if (p >= 0.02 && p < 0.23) {
          moonPhase = "Waxing Crescent";
        } else if (p >= 0.23 && p < 0.27) {
          moonPhase = "First Quarter";
        } else if (p >= 0.27 && p < 0.48) {
          moonPhase = "Waxing Gibbous";
        } else if (p >= 0.48 && p < 0.52) {
          moonPhase = "Full Moon";
        } else if (p >= 0.52 && p < 0.73) {
          moonPhase = "Waning Gibbous";
        } else if (p >= 0.73 && p < 0.77) {
          moonPhase = "Last Quarter";
        } else {
          moonPhase = "Waning Crescent";
        }

        setData({
          isDay,
          sunrise: sunriseStr,
          sunset: sunsetStr,
          moonPhase,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.warn("Sky status fetch failed, applying graceful fallback:", err);
        if (!active) return;

        // Graceful Fallback: Deterministic mock calculation based on coordinates
        const seed = Math.abs(Math.sin(lat) * Math.cos(lng));
        const isDayMock = seed <= 0.45; // seed > 0.45 is night
        
        const sunriseHour = 5 + Math.floor(seed * 2);
        const sunriseMin = Math.floor((seed * 100) % 60);
        const sunsetHour = 17 + Math.floor((seed * 3) % 3);
        const sunsetMin = Math.floor((seed * 250) % 60);

        const formatMockTime = (h: number, m: number, isPm: boolean) => {
          const strH = String(h).padStart(2, "0");
          const strM = String(m).padStart(2, "0");
          return `${strH}:${strM} ${isPm ? "PM" : "AM"}`;
        };

        const sunriseMock = formatMockTime(sunriseHour, sunriseMin, false);
        const sunsetMock = formatMockTime(sunsetHour - 12, sunsetMin, true);

        const moonPhases = [
          "New Moon",
          "Waxing Crescent",
          "First Quarter",
          "Waxing Gibbous",
          "Full Moon",
          "Waning Gibbous",
          "Last Quarter",
          "Waning Crescent"
        ];
        const moonPhaseMock = moonPhases[Math.floor(seed * moonPhases.length)];

        setData({
          isDay: isDayMock,
          sunrise: sunriseMock,
          sunset: sunsetMock,
          moonPhase: moonPhaseMock,
          loading: false,
          error: err as Error,
        });
      }
    }

    fetchSkyData();

    return () => {
      active = false;
    };
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  return data;
}
