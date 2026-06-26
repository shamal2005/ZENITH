import fs from 'fs';
import path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchGraveyardCandidates() {
  console.log("Fetching SATCAT records...");
  
  try {
    // 1. Fetch visual group (contains LEO defunct payloads and rocket bodies)
    const visualRes = await fetch('https://celestrak.org/satcat/records.php?GROUP=visual');
    if (!visualRes.ok) throw new Error(`Failed to fetch visual group: ${visualRes.status}`);
    const visualRecords = await visualRes.json();
    console.log(`Retrieved ${visualRecords.length} records in visual group.`);

    // 2. Fetch GPZ (Geostationary Protected Zone, contains GEO defunct satellites)
    const gpzRes = await fetch('https://celestrak.org/satcat/records.php?SPECIAL=GPZ');
    if (!gpzRes.ok) throw new Error(`Failed to fetch GPZ: ${gpzRes.status}`);
    const gpzRecords = await gpzRes.json();
    console.log(`Retrieved ${gpzRecords.length} records in GPZ.`);

    // Filter rocket bodies from visual group (R/B in orbit)
    const visualRBs = visualRecords.filter(
      r => r.OBJECT_TYPE === 'R/B' && r.DECAY_DATE === ''
    );

    // Filter inactive payloads (PAY in orbit and OPS_STATUS_CODE === '-')
    const visualSats = visualRecords.filter(
      r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-'
    );

    const gpzSats = gpzRecords.filter(
      r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-'
    );

    console.log(`Found ${visualRBs.length} candidate rocket bodies in orbit.`);
    console.log(`Found ${visualSats.length} candidate LEO inactive satellites.`);
    console.log(`Found ${gpzSats.length} candidate GEO inactive satellites.`);

    // We want 20 rocket bodies
    const targetRBs = visualRBs.slice(0, 20);

    // We want 30 inactive satellites: mix LEO and GEO
    // Let's take all available visual (LEO) ones (about 11) and the rest from GPZ (GEO)
    const selectedSats = [
      ...visualSats,
      ...gpzSats.slice(0, 30 - visualSats.length)
    ].slice(0, 30);

    console.log(`Selected ${targetRBs.length} rocket bodies.`);
    console.log(`Selected ${selectedSats.length} inactive satellites (LEO/GEO mix).`);

    const graveyardObjects = [];

    // Fetch TLEs for rocket bodies
    console.log("Fetching TLEs for rocket bodies...");
    let rbCount = 0;
    for (const rb of targetRBs) {
      const catnr = rb.NORAD_CAT_ID;
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=3le`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch TLE for RB ${catnr}: ${res.status}`);
          continue;
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          graveyardObjects.push({
            id: `rb-${catnr}`,
            noradId: catnr,
            category: "rocketBody",
            name: lines[0],
            line1: lines[1],
            line2: lines[2]
          });
          rbCount++;
          console.log(`[RB ${rbCount}/20] Fetched ${catnr}: ${lines[0]}`);
        }
        await delay(200);
      } catch (err) {
        console.error(`Error fetching RB ${catnr}:`, err.message);
      }
    }

    // Fetch TLEs for inactive satellites
    console.log("Fetching TLEs for inactive satellites...");
    let satCount = 0;
    for (const sat of selectedSats) {
      const catnr = sat.NORAD_CAT_ID;
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=3le`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch TLE for Satellite ${catnr}: ${res.status}`);
          continue;
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          graveyardObjects.push({
            id: `sat-${catnr}`,
            noradId: catnr,
            category: "inactiveSatellite",
            name: lines[0],
            line1: lines[1],
            line2: lines[2]
          });
          satCount++;
          console.log(`[Sat ${satCount}/30] Fetched ${catnr}: ${lines[0]}`);
        }
        await delay(200);
      } catch (err) {
        console.error(`Error fetching Satellite ${catnr}:`, err.message);
      }
    }

    console.log(`Successfully completed!`);
    console.log(`Total fetched rocket bodies: ${rbCount}`);
    console.log(`Total fetched inactive satellites: ${satCount}`);
    console.log(`Total graveyard objects saved: ${graveyardObjects.length}`);

    const targetPath = "c:/Users/muham/OneDrive/zenith 2.0/celestial-eye-opener/src/lib/graveyard-objects-fallback.json";
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(graveyardObjects, null, 2));
    console.log(`Saved Fallback TLE data to ${targetPath}`);

  } catch (err) {
    console.error("Error fetching graveyard candidates:", err);
  }
}

fetchGraveyardCandidates();
