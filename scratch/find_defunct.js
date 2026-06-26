const groups = [
  'visual',
  'science',
  'weather',
  'geodetic',
  'amateur',
  'education',
  'military',
  'cubesat',
  'engineering',
  'globalstar',
  'orbcomm',
  'gps-ops',
  'glo-ops',
  'galileo',
  'beidou',
  'sbas',
  'nnss',
  'musson'
];

async function checkDefunct() {
  console.log("Checking groups for nonoperational payloads...");
  const nonOpList = [];

  for (const group of groups) {
    try {
      const res = await fetch(`https://celestrak.org/satcat/records.php?GROUP=${group}`);
      if (!res.ok) {
        console.log(`Group ${group} failed: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const nonop = data.filter(r => r.OBJECT_TYPE === 'PAY' && r.DECAY_DATE === '' && r.OPS_STATUS_CODE === '-');
      console.log(`Group ${group}: Total: ${data.length}, Nonoperational payloads: ${nonop.length}`);
      for (const item of nonop) {
        if (!nonOpList.some(x => x.NORAD_CAT_ID === item.NORAD_CAT_ID)) {
          nonOpList.push(item);
        }
      }
    } catch (e) {
      console.log(`Group ${group} error: ${e.message}`);
    }
  }

  console.log("Total unique nonoperational payloads found:", nonOpList.length);
  console.log("Sample of first 10:");
  console.log(nonOpList.slice(0, 10).map(x => `${x.NORAD_CAT_ID}: ${x.OBJECT_NAME}`));
}

checkDefunct();
