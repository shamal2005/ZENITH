import fs from 'fs';
import path from 'path';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FEATURED_DETAILS = [
  {
    id: "feat-5",
    noradId: 5,
    category: "featured",
    name: "VANGUARD 1",
    line1: "1 00005U 58002B   26177.12648589  .00000123  00000-0  18933-4 0  9997",
    line2: "2 00005  34.2520 220.1259 1843910 326.5492  20.4190 10.85239108920152"
  },
  {
    id: "feat-11",
    noradId: 11,
    category: "featured",
    name: "VANGUARD 2",
    line1: "1 00011U 59001A   26176.99120485  .00000210  00000-0  21955-4 0  9992",
    line2: "2 00011  32.8812 210.4501 1650392 312.4590  30.4590 11.85923918239015"
  },
  {
    id: "feat-29",
    noradId: 29,
    category: "featured",
    name: "TIROS 1",
    line1: "1 00029U 60002B   26176.95204812  .00000560  00000-0  34105-4 0  9995",
    line2: "2 00029  48.3912 205.1209 0031920 280.1290  75.4912 14.12093812839015"
  },
  {
    id: "feat-634",
    noradId: 634,
    category: "featured",
    name: "SYNCOM 2",
    line1: "1 00634U 63031A   26173.90030891 -.00000035  00000+0  00000+0 0  9992",
    line2: "2 00634  29.9712 300.3677 0007055 200.4960 160.8805  1.00262480230421"
  },
  {
    id: "feat-858",
    noradId: 858,
    category: "featured",
    name: "SYNCOM 3",
    line1: "1 00858U 64047A   26175.86840883 -.00000201  00000+0  00000+0 0  9990",
    line2: "2 00858   6.9847  64.4157 0003125 156.1878  88.9582  1.00399641 53541"
  },
  {
    id: "feat-1317",
    noradId: 1317,
    category: "featured",
    name: "INTELSAT 1-F1 (EARLY BIRD)",
    line1: "1 01317U 65028A   26177.25094253  .00000056  00000+0  00000+0 0  9995",
    line2: "2 01317   7.1778  63.6381 0006376 142.9251  31.2857  1.00187924127263"
  },
  {
    id: "feat-2608",
    noradId: 2608,
    category: "featured",
    name: "ATS 1",
    line1: "1 02608U 66110A   26176.91155104 -.00000176  00000+0  00000+0 0  9991",
    line2: "2 02608   4.9940  69.8202 0006090 187.3674 136.7472  1.00298388134885"
  },
  {
    id: "feat-3029",
    noradId: 3029,
    category: "featured",
    name: "ATS 3",
    line1: "1 03029U 67111A   26177.24942469 -.00000080  00000+0  00000+0 0  9990",
    line2: "2 03029   3.2005  78.2805 0015742  34.4402 146.2460  1.00272003214726"
  },
  {
    id: "feat-4250",
    noradId: 4250,
    category: "featured",
    name: "SKYNET 1A",
    line1: "1 04250U 69101A   26177.25582497 -.00000087  00000+0  00000+0 0  9997",
    line2: "2 04250   0.4632  80.3253 0024531 160.5368  22.0677  1.00269151134606"
  },
  {
    id: "feat-22675",
    noradId: 22675,
    category: "featured",
    name: "COSMOS 2251",
    line1: "1 22675U 93036A   26177.19520485  .00000185  00000+0  67812-4 0  9993",
    line2: "2 22675  82.9510 178.4520 0015090 260.4591 100.1293 15.12093812839210"
  },
  {
    id: "feat-27386",
    noradId: 27386,
    category: "featured",
    name: "ENVISAT",
    line1: "1 27386U 02009A   26177.30083383  .00000073  00000+0  37354-4 0  9993",
    line2: "2 27386  98.3838 128.4162 0001411  87.5719  39.8745 14.39066774274797"
  },
  {
    id: "feat-4353",
    noradId: 4353,
    category: "featured",
    name: "NATO 2A",
    line1: "1 04353U 70021A   26177.25540175 -.00000085  00000+0  00000+0 0  9999",
    line2: "2 04353   0.4248 312.9346 0002135 268.0597  41.1192  1.00281174125854"
  }
];

async function compileFeaturedOnly() {
  const currentPath = "c:/Users/muham/OneDrive/zenith 2.0/celestial-eye-opener/src/lib/graveyard-objects-fallback.json";
  
  let currentObjects = [];
  try {
    const data = fs.readFileSync(currentPath, 'utf8');
    currentObjects = JSON.parse(data);
    console.log(`Loaded ${currentObjects.length} current objects from ${currentPath}`);
  } catch (err) {
    console.warn("Could not read current fallback file, starting fresh.");
  }

  // Filter current objects to keep rocket bodies and inactive satellites that are not in the featured list
  const rocketBodies = currentObjects.filter(
    obj => obj.category === 'rocketBody' && !FEATURED_DETAILS.some(f => f.noradId === obj.noradId)
  ).slice(0, 20);

  const inactiveSatellites = currentObjects.filter(
    obj => obj.category === 'inactiveSatellite' && !FEATURED_DETAILS.some(f => f.noradId === obj.noradId)
  ).slice(0, 30);

  console.log(`Filtered: ${rocketBodies.length} rocket bodies, ${inactiveSatellites.length} inactive satellites.`);

  const finalGraveyardObjects = [];

  // Add the featured objects (fetching if possible, otherwise using hardcoded values)
  console.log("Fetching latest TLEs for Featured Objects...");
  for (const feat of FEATURED_DETAILS) {
    try {
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${feat.noradId}&FORMAT=3le`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 3) {
          finalGraveyardObjects.push({
            id: feat.id,
            noradId: feat.noradId,
            category: feat.category,
            name: lines[0],
            line1: lines[1],
            line2: lines[2]
          });
          console.log(`Successfully fetched TLE for Featured ${feat.name}`);
          await delay(200);
          continue;
        }
      }
      console.warn(`Fetch returned not ok for ${feat.name}. Using cached TLE.`);
    } catch (err) {
      console.warn(`Connection error fetching TLE for ${feat.name}. Using cached TLE: ${err.message}`);
    }
    finalGraveyardObjects.push(feat);
  }

  // Append rocket bodies and inactive satellites
  finalGraveyardObjects.push(...rocketBodies);
  finalGraveyardObjects.push(...inactiveSatellites);

  console.log(`Compiled total of ${finalGraveyardObjects.length} graveyard objects (Featured: ${FEATURED_DETAILS.length}, R/Bs: ${rocketBodies.length}, Sats: ${inactiveSatellites.length}).`);
  
  fs.writeFileSync(currentPath, JSON.stringify(finalGraveyardObjects, null, 2));
  console.log(`Successfully updated ${currentPath}`);
}

compileFeaturedOnly();
