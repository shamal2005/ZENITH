import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { X, Navigation, Clock, Globe as GlobeIcon } from "lucide-react";

// ============================================================
// Data & Geocoding Types
// ============================================================

interface LocationData {
  name: string;
  region: string;
  lat: number;
  lon: number;
  isOcean?: boolean;
}

const LOCATIONS: LocationData[] = [
  // Americas
  { name: "New York", region: "United States", lat: 40.7128, lon: -74.0060 },
  { name: "Los Angeles", region: "United States", lat: 34.0522, lon: -118.2437 },
  { name: "Chicago", region: "United States", lat: 41.8781, lon: -87.6298 },
  { name: "Toronto", region: "Canada", lat: 43.6532, lon: -79.3832 },
  { name: "Vancouver", region: "Canada", lat: 49.2827, lon: -123.1207 },
  { name: "Mexico City", region: "Mexico", lat: 19.4326, lon: -99.1332 },
  { name: "Bogota", region: "Colombia", lat: 4.7110, lon: -74.0721 },
  { name: "Lima", region: "Peru", lat: -12.0464, lon: -77.0428 },
  { name: "Santiago", region: "Chile", lat: -33.4489, lon: -70.6693 },
  { name: "Rio de Janeiro", region: "Brazil", lat: -22.9068, lon: -43.1729 },
  { name: "Buenos Aires", region: "Argentina", lat: -34.6037, lon: -58.3816 },
  
  // Europe
  { name: "London", region: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { name: "Paris", region: "France", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin", region: "Germany", lat: 52.5200, lon: 13.4050 },
  { name: "Rome", region: "Italy", lat: 41.9028, lon: 12.4964 },
  { name: "Madrid", region: "Spain", lat: 40.4168, lon: -3.7038 },
  { name: "Moscow", region: "Russia", lat: 55.7558, lon: 37.6173 },
  { name: "Reykjavik", region: "Iceland", lat: 64.1466, lon: -21.9426 },
  
  // Africa & Middle East
  { name: "Cairo", region: "Egypt", lat: 30.0444, lon: 31.2357 },
  { name: "Lagos", region: "Nigeria", lat: 6.5244, lon: 3.3792 },
  { name: "Nairobi", region: "Kenya", lat: -1.2921, lon: 36.8219 },
  { name: "Cape Town", region: "South Africa", lat: -33.9249, lon: 18.4241 },
  { name: "Casablanca", region: "Morocco", lat: 33.5731, lon: -7.5898 },
  { name: "Istanbul", region: "Turkey", lat: 41.0082, lon: 28.9784 },
  { name: "Riyadh", region: "Saudi Arabia", lat: 24.7136, lon: 46.6753 },
  { name: "Dubai", region: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },

  // Asia
  { name: "Mumbai", region: "India", lat: 19.0760, lon: 72.8777 },
  { name: "New Delhi", region: "India", lat: 28.6139, lon: 77.2090 },
  { name: "Beijing", region: "China", lat: 39.9042, lon: 116.4074 },
  { name: "Shanghai", region: "China", lat: 31.2304, lon: 121.4737 },
  { name: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Seoul", region: "South Korea", lat: 37.5665, lon: 126.9780 },
  { name: "Bangkok", region: "Thailand", lat: 13.7563, lon: 100.5018 },
  { name: "Singapore", region: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Jakarta", region: "Indonesia", lat: -6.2088, lon: 106.8456 },
  { name: "Manila", region: "Philippines", lat: 14.5995, lon: 120.9842 },
  
  // Oceania & Polar
  { name: "Sydney", region: "Australia", lat: -33.8688, lon: 151.2093 },
  { name: "Perth", region: "Australia", lat: -31.9505, lon: 115.8605 },
  { name: "Auckland", region: "New Zealand", lat: -36.8485, lon: 174.7633 },
  { name: "Honolulu", region: "Hawaii, USA", lat: 21.3069, lon: -157.8583 },
  { name: "Nuuk", region: "Greenland", lat: 64.1743, lon: -51.7373 },
  { name: "Vladivostok", region: "Russia", lat: 43.1198, lon: 131.8869 },
  { name: "Antananarivo", region: "Madagascar", lat: -18.8792, lon: 47.5079 },
  
  // Oceans
  { name: "North Atlantic", region: "Atlantic Region", lat: 30, lon: -40, isOcean: true },
  { name: "South Atlantic", region: "Atlantic Region", lat: -30, lon: -15, isOcean: true },
  { name: "North Pacific", region: "Pacific Region", lat: 35, lon: -160, isOcean: true },
  { name: "South Pacific", region: "Pacific Region", lat: -35, lon: -120, isOcean: true },
  { name: "Indian Ocean", region: "Indian Region", lat: -20, lon: 80, isOcean: true },
  { name: "Southern Ocean", region: "Antarctic Region", lat: -65, lon: 0, isOcean: true },
  { name: "Arctic Ocean", region: "Polar Region", lat: 85, lon: 0, isOcean: true }
];

// Simplified Continent Boundaries for 3D point generation
const CONTINENTS = [
  // North America
  [[-168, 65], [-100, 75], [-50, 75], [-50, 60], [-78, 25], [-72, 15], [-77, 8], [-90, 14], [-100, 18], [-105, 20], [-115, 30], [-125, 33], [-125, 48], [-140, 60], [-168, 65]],
  // South America
  [[-80, 12], [-70, 10], [-45, -5], [-35, -7], [-40, -22], [-70, -53], [-75, -53], [-72, -40], [-80, -20], [-80, 12]],
  // Africa
  [[-17, 32], [30, 30], [33, 10], [50, 10], [40, -15], [20, -34], [15, -34], [10, -10], [-10, 5], [-17, 15], [-17, 32]],
  // Eurasia
  [[-10, 65], [10, 70], [30, 70], [60, 75], [100, 75], [140, 70], [170, 65], [170, 40], [140, 25], [120, 15], [108, 1], [100, 10], [80, 5], [75, 15], [45, 10], [35, 15], [30, 30], [10, 35], [-10, 35], [-10, 50], [-10, 65]],
  // India
  [[68, 24], [78, 8], [88, 22], [80, 25], [68, 24]],
  // Indochina / SE Asia
  [[95, 22], [100, 5], [108, 10], [108, 20], [95, 22]],
  // Australia
  [[113, -25], [143, -15], [153, -28], [140, -38], [115, -35], [113, -25]],
  // Greenland
  [[-60, 80], [-30, 80], [-40, 60], [-55, 60], [-60, 80]],
  // Madagascar
  [[47, -12], [50, -25], [43, -25], [45, -12], [47, -12]],
  // Antarctica
  [[-180, -72], [180, -72], [180, -85], [-180, -85], [-180, -72]]
];

// Helper: Point in polygon check
function isPointInPolygon(point: [number, number], vs: number[][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const checkIsLand = (lat: number, lon: number) => {
  const point: [number, number] = [lon, lat];
  for (const poly of CONTINENTS) {
    if (isPointInPolygon(point, poly)) return true;
  }
  return false;
};

// Haversine formula to compute distance in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert decimal coordinates to Degrees Minutes Seconds (DMS)
function convertToDMS(dd: number, isLat: boolean) {
  const absDd = Math.abs(dd);
  const degrees = Math.floor(absDd);
  const minutesNotTruncated = (absDd - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  let direction = "";
  if (isLat) {
    direction = dd >= 0 ? "N" : "S";
  } else {
    direction = dd >= 0 ? "E" : "W";
  }

  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

// Geocode coordinates to the nearest location name
function reverseGeocode(lat: number, lon: number) {
  let nearestLoc: LocationData | null = null;
  let minDistance = Infinity;

  // Find nearest major city
  const landLocations = LOCATIONS.filter((l) => !l.isOcean);
  for (const loc of landLocations) {
    const dist = getDistance(lat, lon, loc.lat, loc.lon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLoc = loc;
    }
  }

  // If the nearest city is within 2400km, claim "Near City"
  if (minDistance < 2400 && nearestLoc) {
    return {
      name: nearestLoc.name,
      region: nearestLoc.region,
      distance: Math.round(minDistance),
      isOcean: false
    };
  }

  // Otherwise, find the nearest ocean region
  let nearestOcean: LocationData | null = null;
  let minOceanDist = Infinity;
  const oceanLocations = LOCATIONS.filter((l) => l.isOcean);
  for (const loc of oceanLocations) {
    const dist = getDistance(lat, lon, loc.lat, loc.lon);
    if (dist < minOceanDist) {
      minOceanDist = dist;
      nearestOcean = loc;
    }
  }

  if (nearestOcean) {
    return {
      name: `${nearestOcean.name} Ocean`,
      region: nearestOcean.region,
      distance: Math.round(minOceanDist),
      isOcean: true
    };
  }

  return {
    name: "Open Water",
    region: "Unknown Coordinates",
    distance: 0,
    isOcean: true
  };
}

// Estimate timezone offset from longitude (roughly 15 degrees per hour)
function estimateTimezoneOffset(lon: number) {
  const rawOffset = lon / 15;
  const roundedOffset = Math.round(rawOffset * 2) / 2; // round to nearest 30 mins
  const sign = roundedOffset >= 0 ? "+" : "";
  if (roundedOffset === 0) return "UTC";
  return `UTC${sign}${roundedOffset}`;
}

// ============================================================
// Globe React Component
// ============================================================

interface GlobeProps {
  isGraveyard?: boolean;
}

export default function Globe({ isGraveyard = false }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI State for selected location card
  const [selectedLoc, setSelectedLoc] = useState<{
    lat: number;
    lon: number;
    dmsLat: string;
    dmsLon: string;
    name: string;
    region: string;
    timezone: string;
    distance: number;
    isOcean: boolean;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(isGraveyard ? 0x0a0202 : 0x02040a, 0.08);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // 3. Ambient & Highlight Lights
    const ambientLight = new THREE.AmbientLight(isGraveyard ? 0x100505 : 0x060f26, isGraveyard ? 1.0 : 2.0);
    scene.add(ambientLight);

    const pointLightLeft = new THREE.PointLight(isGraveyard ? 0xdc2626 : 0x0ea5e9, isGraveyard ? 4.0 : 6.0, 50);
    pointLightLeft.position.set(-6, 3, 5);
    scene.add(pointLightLeft);

    const pointLightRight = new THREE.PointLight(isGraveyard ? 0x991b1b : 0x6366f1, isGraveyard ? 3.0 : 5.0, 50);
    pointLightRight.position.set(6, -2, 5);
    scene.add(pointLightRight);

    // 4. Globe Root Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Initial tilt to represent Earth's axial tilt (23.5 degrees)
    globeGroup.rotation.x = 0.25;
    globeGroup.rotation.y = 1.8; // start facing Americas/Pacific

    // 5. Globe Parts
    const GLOBE_RADIUS = 2.0;

    // Inner Dark Core Sphere
    const innerCoreGeo = new THREE.SphereGeometry(GLOBE_RADIUS - 0.02, 32, 32);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      transparent: true,
      opacity: 0.95
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    globeGroup.add(innerCoreMesh);

    // Grid lines geometry helper
    const gridLinesGroup = new THREE.Group();
    globeGroup.add(gridLinesGroup);

    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.2
    });

    // Add longitudinal rings (meridians)
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const theta = (j * Math.PI) / 32;
        points.push(
          new THREE.Vector3(
            GLOBE_RADIUS * Math.sin(theta) * Math.cos(angle),
            GLOBE_RADIUS * Math.cos(theta),
            GLOBE_RADIUS * Math.sin(theta) * Math.sin(angle)
          )
        );
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, gridMaterial);
      gridLinesGroup.add(line);
    }

    // Add latitudinal rings (parallels)
    for (let i = 1; i < 8; i++) {
      const theta = (i * Math.PI) / 8;
      const r = GLOBE_RADIUS * Math.sin(theta);
      const y = GLOBE_RADIUS * Math.cos(theta);
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const phi = (j * Math.PI) / 32;
        points.push(new THREE.Vector3(r * Math.cos(phi), y, r * Math.sin(phi)));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, gridMaterial);
      gridLinesGroup.add(line);
    }

    // 6. Programmatic Dot Matrix (Land vs Water)
    const landPositions: number[] = [];
    const waterPositions: number[] = [];

    const latSteps = 70;
    const lonSteps = 140;

    for (let i = 0; i < latSteps; i++) {
      const lat = -80 + (i * 160) / latSteps; // sample -80 to 80
      const phi = (lat * Math.PI) / 180;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let j = 0; j < lonSteps; j++) {
        const lon = -180 + (j * 360) / lonSteps;
        const theta = (lon * Math.PI) / 180;

        const isLand = checkIsLand(lat, lon);

        // Convert to Cartesian 3D coordinates
        // Y-up convention
        const x = cosPhi * Math.sin(theta);
        const y = sinPhi;
        const z = cosPhi * Math.cos(theta);

        if (isLand) {
          // Push slightly elevated above core
          const r = GLOBE_RADIUS + 0.02;
          landPositions.push(x * r, y * r, z * r);
        } else {
          // Push flat on core
          const r = GLOBE_RADIUS;
          waterPositions.push(x * r, y * r, z * r);
        }
      }
    }

    // Land Points Mesh
    const landGeom = new THREE.BufferGeometry();
    landGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(landPositions, 3)
    );
    const landPointsMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.038,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    const landPoints = new THREE.Points(landGeom, landPointsMat);
    globeGroup.add(landPoints);

    // Water Points Mesh (subtle background grid)
    const waterGeom = new THREE.BufferGeometry();
    waterGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(waterPositions, 3)
    );
    const waterPointsMat = new THREE.PointsMaterial({
      color: 0x0f172a,
      size: 0.02,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true
    });
    const waterPoints = new THREE.Points(waterGeom, waterPointsMat);
    globeGroup.add(waterPoints);

    // 7. Glowing Atmospheric Halo Sprite
    const createGlowTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        if (isGraveyard) {
          gradient.addColorStop(0, "rgba(239, 68, 68, 1)");
          gradient.addColorStop(0.2, "rgba(220, 38, 38, 0.45)");
          gradient.addColorStop(0.45, "rgba(185, 28, 28, 0.15)");
          gradient.addColorStop(0.7, "rgba(153, 27, 27, 0.02)");
          gradient.addColorStop(1, "rgba(153, 27, 27, 0)");
        } else {
          gradient.addColorStop(0, "rgba(56, 189, 248, 1)");
          gradient.addColorStop(0.2, "rgba(56, 189, 248, 0.45)");
          gradient.addColorStop(0.45, "rgba(56, 189, 248, 0.15)");
          gradient.addColorStop(0.7, "rgba(56, 189, 248, 0.02)");
          gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    const glowSpriteMat = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.55
    });
    const glowSprite = new THREE.Sprite(glowSpriteMat);
    glowSprite.scale.set(5.2, 5.2, 1.0);
    scene.add(glowSprite);

    // 8. Background Particle Field (Stars in the distance)
    const starGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 500; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = -20 - Math.random() * 40; // place deep in background
      starPositions.push(x, y, z);
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 9. Click Interactive Invisible Sphere for Raycasting
    const raycastSphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.02, 32, 32);
    const raycastSphereMat = new THREE.MeshBasicMaterial({
      visible: false // invisible but collidable
    });
    const raycastSphere = new THREE.Mesh(raycastSphereGeo, raycastSphereMat);
    globeGroup.add(raycastSphere);

    // 10. Click Marker Ring
    const createRingTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw double ring
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(32, 32, 24, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(32, 32, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing center dot
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(32, 32, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    };

    const markerGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    const markerMaterial = new THREE.MeshBasicMaterial({
      map: createRingTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.visible = false;
    globeGroup.add(marker);

    // ============================================================
    // Drag & Interactive State Controllers
    // ============================================================
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragMoveDelta = 0; // tracking distance to distinguish drag vs click

    // Slerp Rotation Lock Target
    let targetRotation: THREE.Quaternion | null = null;
    let slerpSpeed = 0.08;

    // Camera Zoom Limits
    let targetCameraZ = 6.0;

    // Raycast elements
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      dragMoveDelta = 0;
      targetRotation = null; // stop any automatic transition
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      dragMoveDelta += Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Rotate around world Y-axis and local X-axis
      const rotationSpeed = 0.0035;
      globeGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaX * rotationSpeed);
      globeGroup.rotateOnAxis(new THREE.Vector3(1, 0, 0), deltaY * rotationSpeed);

      dragStart = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging = false;

      // If pointer barely moved, count it as a click!
      if (dragMoveDelta < 6) {
        // Calculate normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(raycastSphere);

        if (intersects.length > 0) {
          const hit = intersects[0];
          const localPoint = hit.point.clone();
          globeGroup.worldToLocal(localPoint); // convert hit point to globe's local space

          // Compute Latitude and Longitude from Local Cartesian Point
          const r = GLOBE_RADIUS;
          const lat = Math.asin(localPoint.y / r) * (180 / Math.PI);
          const lon = Math.atan2(localPoint.x, localPoint.z) * (180 / Math.PI);

          // Position the click marker on the surface, orienting it to face outward
          marker.position.copy(localPoint.clone().multiplyScalar(1.015)); // lift slightly
          
          // Align marker normal with the local surface normal (which is just localPoint normalized)
          const localNormal = localPoint.clone().normalize();
          const upVector = new THREE.Vector3(0, 1, 0);
          marker.quaternion.setFromUnitVectors(upVector, localNormal);
          marker.visible = true;

          // Perform offline reverse geocoding
          const geoInfo = reverseGeocode(lat, lon);
          const timezone = estimateTimezoneOffset(lon);

          setSelectedLoc({
            lat: Math.round(lat * 1000) / 1000,
            lon: Math.round(lon * 1000) / 1000,
            dmsLat: convertToDMS(lat, true),
            dmsLon: convertToDMS(lon, false),
            name: geoInfo.name,
            region: geoInfo.region,
            timezone: timezone,
            distance: geoInfo.distance,
            isOcean: geoInfo.isOcean
          });

          // Setup slerp target rotation to center the clicked point
          // The target quaternion should align the local clicked point with the screen space front vector (0, 0, 1)
          const targetLocalDir = localPoint.clone().normalize();
          const targetWorldDir = new THREE.Vector3(0, 0, 1);
          
          // Compute the quaternion rotation needed to align targetLocalDir with targetWorldDir
          const alignQuat = new THREE.Quaternion().setFromUnitVectors(targetLocalDir, targetWorldDir);
          
          // Compute target rotation in world space for the globe group
          // Combine current rotation to transition smoothly
          targetRotation = alignQuat.multiply(globeGroup.quaternion);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Adjust camera distance
      const zoomSpeed = 0.003;
      targetCameraZ = Math.max(3.3, Math.min(9.0, targetCameraZ + e.deltaY * zoomSpeed));
    };

    const canvas = canvasRef.current;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // ============================================================
    // Animation Loop
    // ============================================================
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // 1. Slow, ambient rotation when not dragging/centering
      if (!isDragging && !targetRotation) {
        globeGroup.rotation.y += 0.0012;
      }

      // 2. Slerp rotate to center clicked point
      if (targetRotation) {
        globeGroup.quaternion.slerp(targetRotation, slerpSpeed);
        
        // Stop slerp when we get very close
        if (globeGroup.quaternion.angleTo(targetRotation) < 0.002) {
          globeGroup.quaternion.copy(targetRotation);
          targetRotation = null;
        }
      }

      // 3. Smooth camera zoom transition
      camera.position.z += (targetCameraZ - camera.position.z) * 0.1;

      // 4. Animate click marker (pulse effect)
      if (marker.visible) {
        const pulseScale = 1.0 + 0.15 * Math.sin(time * 8.0);
        marker.scale.setScalar(pulseScale);
      }

      // 5. Render
      renderer.render(scene, camera);
    };

    animate();

    // ============================================================
    // Resize Handler
    // ============================================================
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // ============================================================
    // Cleanup
    // ============================================================
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (canvas) {
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("wheel", handleWheel);
      }
      
      // Dipose geometries and materials
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      landGeom.dispose();
      landPointsMat.dispose();
      waterGeom.dispose();
      waterPointsMat.dispose();
      glowSpriteMat.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      raycastSphereGeo.dispose();
      raycastSphereMat.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      
      renderer.dispose();
    };
  }, []);

  const closeCard = () => {
    setSelectedLoc(null);
  };

  return (
    <div className="globe-canvas-container" ref={containerRef}>
      <canvas className="globe-canvas" ref={canvasRef} />

      {/* Glassmorphic Info Card Overlay */}
      <div className={`location-info-card${selectedLoc ? " active" : ""}`}>
        {selectedLoc && (
          <>
            <div className="card-header">
              <h3 className="flex items-center gap-1.5 font-semibold">
                <GlobeIcon className="w-4 h-4 text-sky-400" />
                CELESTIAL EYE
              </h3>
              <button className="close-btn" onClick={closeCard} aria-label="Close details">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="location-name">{selectedLoc.name}</div>
            <div className="location-region">{selectedLoc.region}</div>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-500" /> LATITUDE
                </span>
                <span className="info-value">{selectedLoc.dmsLat}</span>
                <span className="info-value text-[10px] text-slate-500">
                  {selectedLoc.lat}°
                </span>
              </div>

              <div className="info-item">
                <span className="info-label flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-500 rotate-90" /> LONGITUDE
                </span>
                <span className="info-value">{selectedLoc.dmsLon}</span>
                <span className="info-value text-[10px] text-slate-500">
                  {selectedLoc.lon}°
                </span>
              </div>

              <div className="info-item">
                <span className="info-label flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" /> TIMEZONE
                </span>
                <span className="info-value">{selectedLoc.timezone}</span>
              </div>

              {!selectedLoc.isOcean && selectedLoc.distance > 0 && (
                <div className="info-item">
                  <span className="info-label">ACCURACY</span>
                  <span className="info-value">±{selectedLoc.distance} km</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
