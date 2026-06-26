import fs from 'fs';
import path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAdditionalSats() {
  const currentPath = "c:/Users/muham/OneDrive/zenith 2.0/celestial-eye-opener/src/lib/graveyard-objects-fallback.json";
  
  let currentObjects = [];
  try {
    const data = fs.readFileSync(currentPath, 'utf8');
    currentObjects = JSON.parse(data);
    console.log(`Loaded ${currentObjects.length} current objects.`);
  } catch (err) {
    console.error("Error reading current JSON:", err);
    return;
  }

  // Get current inactive satellites count
  const existingSatsCount = currentObjects.filter(obj => obj.category === 'inactiveSatellite').length;
  console.log(`Current inactive satellites count: ${existingSatsCount}`);

  const needed = 30 - existingSatsCount;
  if (needed <= 0) {
    console.log("No additional satellites needed.");
    return;
  }
  console.log(`Need to fetch ${needed} more inactive satellites...`);

  // Fetch GPZ records
  console.log("Fetching GPZ records to find candidates...");
  let gpzRecords = [];
  try {
    const gpzRes = await fetch('https://celestrak.org/satcat/records.php?SPECIAL=GPZ');
    gpzRecords = await gpzRes.json();
    console.log(`Retrieved ${gpzRecords.length} records in GPZ.`);
  } catch (err) {
    console.error("Error fetching GPZ records:", err);
    return;
  }

  // Find candidate defunct satellites that are not already in our database
  const existingIds = currentObjects.map(obj => obj.noradId);
  const candidates = gpzRecords.filter(
    r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-' && !existingIds.includes(r.NORAD_CAT_ID)
  );
  console.log(`Found ${candidates.length} new candidate defunct satellites in GPZ.`);

  const selectedCandidates = candidates.slice(0, needed);
  console.log(`Fetching TLEs for ${selectedCandidates.length} new satellites...`);

  const newSats = [];
  let satCount = 0;
  for (const sat of selectedCandidates) {
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
        newSats.push({
          id: `sat-${catnr}`,
          noradId: catnr,
          category: "inactiveSatellite",
          name: lines[0],
          line1: lines[1],
          line2: lines[2]
        });
        satCount++;
        console.log(`[Sat ${satCount}/${needed}] Fetched ${catnr}: ${lines[0]}`);
      }
      await delay(250);
    } catch (err) {
      console.error(`Error fetching Satellite ${catnr}:`, err.message);
    }
  }

  // Combine and write back
  const updatedObjects = [...currentObjects, ...newSats];
  console.log(`Updated database has:`);
  console.log(`- Featured: ${updatedObjects.filter(o => o.category === 'featured').length}`);
  console.log(`- Rocket Bodies: ${updatedObjects.filter(o => o.category === 'rocketBody').length}`);
  console.log(`- Inactive Satellites: ${updatedObjects.filter(o => o.category === 'inactiveSatellite').length}`);
  console.log(`Total objects: ${updatedObjects.length}`);

  fs.writeFileSync(currentPath, JSON.stringify(updatedObjects, null, 2));
  console.log(`Successfully updated ${currentPath}`);
}

fetchAdditionalSats();
