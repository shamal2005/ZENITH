import fs from 'fs';
import path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3, backoff = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      console.warn(`[Retry ${i+1}/${retries}] HTTP error fetching ${url}: ${res.status}`);
    } catch (err) {
      console.warn(`[Retry ${i+1}/${retries}] Network error fetching ${url}: ${err.message}`);
    }
    await delay(backoff * (i + 1));
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// Historically significant orbital objects
const FEATURED_IDS = [
  5,     // Vanguard 1 (Oldest human-made object in orbit)
  11,    // Vanguard 2 (First cloud-cover weather satellite, 1959)
  29,    // Tiros 1 (First successful weather satellite, 1960)
  634,   // Syncom 2 (First geosynchronous satellite, 1963)
  858,   // Syncom 3 (First geostationary satellite, 1964)
  1317,  // Intelsat 1-F1 (Early Bird, first commercial GEO satellite, 1965)
  2608,  // ATS 1 (Applications Technology Satellite, 1966)
  3029,  // ATS 3 (Applications Technology Satellite, 1967)
  4250,  // Skynet 1A (UK's first military comms satellite, 1969)
  22675, // Cosmos 2251 (Famous collision participant)
  27386, // Envisat (Massive defunct observation satellite)
  4353   // Nato 2A (Early NATO communication satellite)
];

async function fetchFeaturedAndGraveyard() {
  console.log("Fetching SATCAT records for visual and GPZ...");
  
  try {
    const visualRes = await fetchWithRetry('https://celestrak.org/satcat/records.php?GROUP=visual');
    const visualRecords = await visualRes.json();
    await delay(500); // pause to not hammer the server

    const gpzRes = await fetchWithRetry('https://celestrak.org/satcat/records.php?SPECIAL=GPZ');
    const gpzRecords = await gpzRes.json();
    await delay(500); // pause

    // Filter rocket bodies and inactive satellites excluding the featured ones
    const candidateRBs = visualRecords.filter(
      r => r.OBJECT_TYPE === 'R/B' && r.DECAY_DATE === '' && !FEATURED_IDS.includes(r.NORAD_CAT_ID)
    );

    const candidateSats = [
      ...visualRecords.filter(r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-'),
      ...gpzRecords.filter(r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-')
    ].filter(r => !FEATURED_IDS.includes(r.NORAD_CAT_ID));

    // Remove duplicates from candidateSats based on NORAD_CAT_ID
    const uniqueSatsMap = new Map();
    for (const sat of candidateSats) {
      uniqueSatsMap.set(sat.NORAD_CAT_ID, sat);
    }
    const uniqueSats = Array.from(uniqueSatsMap.values());

    console.log(`Found ${candidateRBs.length} candidate rocket bodies.`);
    console.log(`Found ${uniqueSats.length} candidate inactive satellites.`);

    const selectedRBs = candidateRBs.slice(0, 20);
    const selectedSats = uniqueSats.slice(0, 30);

    const graveyardObjects = [];

    // 1. Fetch TLEs for Featured Objects
    console.log("Fetching TLEs for Featured Historical Objects...");
    let featCount = 0;
    for (const id of FEATURED_IDS) {
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=3le`;
        const res = await fetchWithRetry(url);
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          graveyardObjects.push({
            id: `feat-${id}`,
            noradId: id,
            category: "featured",
            name: lines[0],
            line1: lines[1],
            line2: lines[2]
          });
          featCount++;
          console.log(`[Featured ${featCount}/${FEATURED_IDS.length}] Fetched ${id}: ${lines[0]}`);
        }
        await delay(300);
      } catch (err) {
        console.error(`Error fetching Featured ${id}:`, err.message);
      }
    }

    // 2. Fetch TLEs for Rocket Bodies
    console.log("Fetching TLEs for Rocket Bodies...");
    let rbCount = 0;
    for (const rb of selectedRBs) {
      const catnr = rb.NORAD_CAT_ID;
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=3le`;
        const res = await fetchWithRetry(url);
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
        await delay(300);
      } catch (err) {
        console.error(`Error fetching RB ${catnr}:`, err.message);
      }
    }

    // 3. Fetch TLEs for Inactive Satellites
    console.log("Fetching TLEs for Inactive Satellites...");
    let satCount = 0;
    for (const sat of selectedSats) {
      const catnr = sat.NORAD_CAT_ID;
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catnr}&FORMAT=3le`;
        const res = await fetchWithRetry(url);
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
        await delay(300);
      } catch (err) {
        console.error(`Error fetching Satellite ${catnr}:`, err.message);
      }
    }

    console.log(`Saved Fallback TLE data.`);
    console.log(`Total featured: ${featCount}`);
    console.log(`Total rocket bodies: ${rbCount}`);
    console.log(`Total inactive satellites: ${satCount}`);
    console.log(`Total graveyard objects saved: ${graveyardObjects.length}`);

    const targetPath = "c:/Users/muham/OneDrive/zenith 2.0/celestial-eye-opener/src/lib/graveyard-objects-fallback.json";
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(graveyardObjects, null, 2));
    console.log(`Saved Fallback TLE data to ${targetPath}`);

  } catch (err) {
    console.error("Error fetching candidates:", err);
  }
}

fetchFeaturedAndGraveyard();
