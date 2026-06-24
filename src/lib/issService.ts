export interface ISSTelemetry {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export async function fetchISSTelemetry(): Promise<ISSTelemetry> {
  try {
    const response = await fetch("https://api.open-notify.org/iss-now.json");
    if (response.ok) {
      const data = await response.json();
      if (data.message === "success") {
        return {
          latitude: parseFloat(data.iss_position.latitude),
          longitude: parseFloat(data.iss_position.longitude),
          timestamp: data.timestamp,
        };
      }
    }
  } catch (e) {
    console.warn("HTTPS fetch failed, falling back to HTTP:", e);
  }

  // Fallback to HTTP
  const response = await fetch("http://api.open-notify.org/iss-now.json");
  if (!response.ok) {
    throw new Error(`Failed to fetch ISS telemetry: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.message !== "success") {
    throw new Error("ISS telemetry data message is not 'success'");
  }
  return {
    latitude: parseFloat(data.iss_position.latitude),
    longitude: parseFloat(data.iss_position.longitude),
    timestamp: data.timestamp,
  };
}
