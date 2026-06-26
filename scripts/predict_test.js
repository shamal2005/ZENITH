import * as satellite from 'satellite.js';

function getCardinalDirection(azimuthDeg) {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized >= 22.5 && normalized < 67.5) return "NE";
  if (normalized >= 67.5 && normalized < 112.5) return "E";
  if (normalized >= 112.5 && normalized < 157.5) return "SE";
  if (normalized >= 157.5 && normalized < 202.5) return "S";
  if (normalized >= 202.5 && normalized < 247.5) return "SW";
  if (normalized >= 247.5 && normalized < 292.5) return "W";
  return "NW";
}

function predictPasses(line1, line2, observerLat, observerLng, observerAltM = 0) {
  const passes = [];
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const now = new Date();
    
    let inPass = false;
    let passStart = null;
    let passMaxElevation = -180;
    let passStartAzimuth = 0;
    let passEndAzimuth = 0;
    
    const totalSteps = 1440; // 24 hours
    const stepMs = 60 * 1000; // 1 minute
    
    for (let step = 0; step < totalSteps; step++) {
      const evalTime = new Date(now.getTime() + step * stepMs);
      const positionAndVelocity = satellite.propagate(satrec, evalTime);
      if (!positionAndVelocity || !positionAndVelocity.position || typeof positionAndVelocity.position === "boolean") {
        continue;
      }
      
      const positionEci = positionAndVelocity.position;
      const gmst = satellite.gstime(evalTime);
      
      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      
      const observerGd = {
        longitude: satellite.degreesToRadians(observerLng),
        latitude: satellite.degreesToRadians(observerLat),
        height: observerAltM / 1000
      };
      
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
      const elevation = satellite.radiansToDegrees(lookAngles.elevation);
      const azimuth = satellite.radiansToDegrees(lookAngles.azimuth);
      
      if (elevation >= 10) {
        if (!inPass) {
          inPass = true;
          passStart = evalTime;
          passStartAzimuth = azimuth;
          passMaxElevation = elevation;
        } else {
          if (elevation > passMaxElevation) {
            passMaxElevation = elevation;
          }
        }
      } else {
        if (inPass && passStart) {
          inPass = false;
          passEndAzimuth = azimuth;
          const passEnd = evalTime;
          
          const durationMs = passEnd.getTime() - passStart.getTime();
          const durationMinutes = Math.round(durationMs / 60000);
          
          let visibilityRating = 1;
          let visibilityLabel = "Poor";
          if (passMaxElevation >= 60) {
            visibilityRating = 5;
            visibilityLabel = "Excellent";
          } else if (passMaxElevation >= 40) {
            visibilityRating = 4;
            visibilityLabel = "Very Good";
          } else if (passMaxElevation >= 20) {
            visibilityRating = 3;
            visibilityLabel = "Good";
          } else if (passMaxElevation >= 10) {
            visibilityRating = 2;
            visibilityLabel = "Fair";
          }
          
          const startDir = getCardinalDirection(passStartAzimuth);
          const endDir = getCardinalDirection(passEndAzimuth);
          
          passes.push({
            startTime: passStart.toISOString(),
            endTime: passEnd.toISOString(),
            durationMinutes: Math.max(1, durationMinutes),
            maxElevation: Math.round(passMaxElevation),
            direction: `${startDir} → ${endDir}`,
            visibilityRating,
            visibilityLabel
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return passes;
}

const line1 = "1 25544U 98067A   26176.54117581  .00018596  00000+0  33482-3 0  9998";
const line2 = "2 25544  51.6415 158.4239 0005470  75.4678  60.5976 15.49842416573887";

console.log("Predicting passes for Tokyo observer...");
const passes = predictPasses(line1, line2, 35.6762, 139.6503);
console.log(JSON.stringify(passes, null, 2));
