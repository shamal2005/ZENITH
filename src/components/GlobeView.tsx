import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Viewer, ImageryLayer, Entity, BillboardGraphics, CylinderGraphics, PointGraphics } from 'resium';
import { useSpacecraftTracking } from '../hooks/useSpacecraftTracking';
import { useOrbitalDebris } from '../hooks/useOrbitalDebris';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

// Low-level WebGL context options must be defined statically to prevent Resium
// from recreating the Viewer instance on every render cycle.
const CONTEXT_OPTIONS = {
  webgl: {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance' as const
  },
};

interface GlobeViewProps {
  active?: boolean;
  targetLocation?: { lat: number; lng: number; label: string } | null;
  onSelectLocation?: (loc: { lat: number; lng: number }) => void;
  selectedSpacecraftId?: string;
  spacecraftFocusTrigger?: number;
  onSelectSpacecraft?: (id: string, triggerFocus?: boolean) => void;
  isGraveyard?: boolean;
  selectedFeaturedObjectId?: string | null;
  onSelectFeaturedObject?: (id: string | null) => void;
}

export default function GlobeView({ 
  active = false, 
  targetLocation = null, 
  onSelectLocation, 
  selectedSpacecraftId = "iss",
  spacecraftFocusTrigger = 0,
  onSelectSpacecraft,
  isGraveyard = false,
  selectedFeaturedObjectId = null,
  onSelectFeaturedObject,
}: GlobeViewProps) {
  const { spacecrafts } = useSpacecraftTracking();
  const { debris } = useOrbitalDebris(isGraveyard);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [popupEntity, setPopupEntity] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [imageryProvider, setImageryProvider] = useState<any>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const lastInteractionTimeRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);
  const rotationFactorRef = useRef<number>(1.0);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  const [issFocusBaseImage, setIssFocusBaseImage] = useState<string>('');
  const [issFocusPulseImage, setIssFocusPulseImage] = useState<string>('');
  const [isISSFocused, setIsISSFocused] = useState(false);
  const isISSFocusedRef = useRef(false);
  const issLabelRef = useRef<HTMLDivElement | null>(null);

  const selectedSpacecraftIdRef = useRef(selectedSpacecraftId);
  useEffect(() => {
    selectedSpacecraftIdRef.current = selectedSpacecraftId;
  }, [selectedSpacecraftId]);

  const isGraveyardRef = useRef(isGraveyard);
  useEffect(() => {
    isGraveyardRef.current = isGraveyard;
  }, [isGraveyard]);

  const selectedFeaturedObjectIdRef = useRef(selectedFeaturedObjectId);
  useEffect(() => {
    selectedFeaturedObjectIdRef.current = selectedFeaturedObjectId;
  }, [selectedFeaturedObjectId]);

  const onSelectFeaturedObjectRef = useRef(onSelectFeaturedObject);
  useEffect(() => {
    onSelectFeaturedObjectRef.current = onSelectFeaturedObject;
  }, [onSelectFeaturedObject]);

  const debrisRef = useRef(debris);
  useEffect(() => {
    debrisRef.current = debris;
  }, [debris]);

  const wasGraveyardRef = useRef(false);

  useEffect(() => {
    isISSFocusedRef.current = isISSFocused;
    if (!isISSFocused && issLabelRef.current) {
      issLabelRef.current.style.display = 'none';
    }
  }, [isISSFocused]);

  // Keep callback ref updated to prevent stale closures in Cesium event handlers
  const onSelectLocationRef = useRef(onSelectLocation);
  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
    if (!onSelectLocation && viewer?.scene?.canvas) {
      viewer.scene.canvas.classList.remove('globe-hover-pointer');
    }
  }, [onSelectLocation, viewer]);

  // Dynamic canvas images for premium tracking marker
  const [baseMarkerImage, setBaseMarkerImage] = useState<string>('');
  const [pulseMarkerImage, setPulseMarkerImage] = useState<string>('');
  const [issMarkerImage, setIssMarkerImage] = useState<string>('');
  const [tiangongMarkerImage, setTiangongMarkerImage] = useState<string>('');
  const [starlinkMarkerImage, setStarlinkMarkerImage] = useState<string>('');
  const [hubbleMarkerImage, setHubbleMarkerImage] = useState<string>('');
  const [landsatMarkerImage, setLandsatMarkerImage] = useState<string>('');
  const [rocketMarkerImage, setRocketMarkerImage] = useState<string>('');
  const [inactiveSatelliteMarkerImage, setInactiveSatelliteMarkerImage] = useState<string>('');
  const [featuredMarkerImage, setFeaturedMarkerImage] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Static base canvas targeting reticle
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = 128;
      baseCanvas.height = 128;
      const ctx = baseCanvas.getContext('2d');
      if (ctx) {
        const cx = 64;
        const cy = 64;

        // Soft outer glow (translucent radial gradient)
        const glowGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
        glowGrad.addColorStop(0, 'rgba(5, 255, 195, 0.4)');
        glowGrad.addColorStop(0.5, 'rgba(5, 255, 195, 0.08)');
        glowGrad.addColorStop(1, 'rgba(5, 255, 195, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.fill();

        // Thin circular tracking ring
        ctx.strokeStyle = 'rgba(5, 255, 195, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Small central white core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#05ffc3';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        setBaseMarkerImage(baseCanvas.toDataURL());
      }

      // 2. Pulse outer ring canvas
      const pulseCanvas = document.createElement('canvas');
      pulseCanvas.width = 128;
      pulseCanvas.height = 128;
      const pCtx = pulseCanvas.getContext('2d');
      if (pCtx) {
        const cx = 64;
        const cy = 64;

        pCtx.strokeStyle = 'rgba(5, 255, 195, 0.65)';
        pCtx.lineWidth = 1.2;
        pCtx.beginPath();
        pCtx.arc(cx, cy, 30, 0, Math.PI * 2);
        pCtx.stroke();

        setPulseMarkerImage(pulseCanvas.toDataURL());
      }

      // 3. Custom ISS visual marker (Satellite icon with panels and cyan glow)
      const issCanvas = document.createElement('canvas');
      issCanvas.width = 128;
      issCanvas.height = 128;
      const iCtx = issCanvas.getContext('2d');
      if (iCtx) {
        const cx = 64;
        const cy = 64;

        // Subtle outer purple glow
        const glowGrad = iCtx.createRadialGradient(cx, cy, 2, cx, cy, 32);
        glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
        glowGrad.addColorStop(0.4, 'rgba(192, 132, 252, 0.2)');
        glowGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        iCtx.fillStyle = glowGrad;
        iCtx.beginPath();
        iCtx.arc(cx, cy, 32, 0, Math.PI * 2);
        iCtx.fill();

        // Central white core (ISS module)
        iCtx.fillStyle = '#ffffff';
        iCtx.beginPath();
        iCtx.arc(cx, cy, 5, 0, Math.PI * 2);
        iCtx.fill();
        iCtx.strokeStyle = '#c084fc';
        iCtx.lineWidth = 1.5;
        iCtx.stroke();

        // Main truss line (connecting panels)
        iCtx.strokeStyle = '#c084fc';
        iCtx.lineWidth = 2.0;
        iCtx.beginPath();
        iCtx.moveTo(cx - 24, cy);
        iCtx.lineTo(cx + 24, cy);
        iCtx.stroke();

        // Solar panels left
        iCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        iCtx.strokeStyle = '#c084fc';
        iCtx.lineWidth = 1.0;
        iCtx.fillRect(cx - 24, cy - 10, 8, 20);
        iCtx.strokeRect(cx - 24, cy - 10, 8, 20);

        // Solar panels right
        iCtx.fillRect(cx + 16, cy - 10, 8, 20);
        iCtx.strokeRect(cx + 16, cy - 10, 8, 20);

        // Radiators/antenna details
        iCtx.strokeStyle = '#c084fc';
        iCtx.lineWidth = 1.5;
        iCtx.beginPath();
        iCtx.moveTo(cx, cy - 12);
        iCtx.lineTo(cx, cy + 12);
        iCtx.stroke();

        setIssMarkerImage(issCanvas.toDataURL());
      }

      // 4. ISS Focus Base Image (purple targeting reticle)
      const issFocusBaseCanvas = document.createElement('canvas');
      issFocusBaseCanvas.width = 128;
      issFocusBaseCanvas.height = 128;
      const ifbCtx = issFocusBaseCanvas.getContext('2d');
      if (ifbCtx) {
        const cx = 64;
        const cy = 64;

        // Soft outer glow (translucent radial gradient)
        const glowGrad = ifbCtx.createRadialGradient(cx, cy, 4, cx, cy, 46);
        glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.4)');
        glowGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.08)');
        glowGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        ifbCtx.fillStyle = glowGrad;
        ifbCtx.beginPath();
        ifbCtx.arc(cx, cy, 46, 0, Math.PI * 2);
        ifbCtx.fill();

        // Thin circular tracking ring
        ifbCtx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
        ifbCtx.lineWidth = 1.2;
        ifbCtx.beginPath();
        ifbCtx.arc(cx, cy, 22, 0, Math.PI * 2);
        ifbCtx.stroke();

        // Small central white core
        ifbCtx.fillStyle = '#ffffff';
        ifbCtx.beginPath();
        ifbCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ifbCtx.fill();
        ifbCtx.strokeStyle = '#c084fc';
        ifbCtx.lineWidth = 1.5;
        ifbCtx.stroke();

        setIssFocusBaseImage(issFocusBaseCanvas.toDataURL());
      }

      // 5. ISS Focus Pulse Image (purple pulsing ring)
      const issFocusPulseCanvas = document.createElement('canvas');
      issFocusPulseCanvas.width = 128;
      issFocusPulseCanvas.height = 128;
      const ifpCtx = issFocusPulseCanvas.getContext('2d');
      if (ifpCtx) {
        const cx = 64;
        const cy = 64;

        ifpCtx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
        ifpCtx.lineWidth = 1.2;
        ifpCtx.beginPath();
        ifpCtx.arc(cx, cy, 30, 0, Math.PI * 2);
        ifpCtx.stroke();

        setIssFocusPulseImage(issFocusPulseCanvas.toDataURL());
      }

      // 6. Tiangong Marker (T-shape Chinese Space Station with solar wings)
      const tiangongCanvas = document.createElement('canvas');
      tiangongCanvas.width = 128;
      tiangongCanvas.height = 128;
      const tCtx = tiangongCanvas.getContext('2d');
      if (tCtx) {
        const cx = 64;
        const cy = 64;

        // Subtle gold glow
        const glowGrad = tCtx.createRadialGradient(cx, cy, 2, cx, cy, 32);
        glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
        glowGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.2)');
        glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        tCtx.fillStyle = glowGrad;
        tCtx.beginPath();
        tCtx.arc(cx, cy, 32, 0, Math.PI * 2);
        tCtx.fill();

        // Core module (central cylinder)
        tCtx.fillStyle = '#ffffff';
        tCtx.strokeStyle = '#fbbf24';
        tCtx.lineWidth = 1.5;
        tCtx.fillRect(cx - 4, cy - 14, 8, 28);
        tCtx.strokeRect(cx - 4, cy - 14, 8, 28);

        // Cross module (forming T-shape)
        tCtx.fillRect(cx - 12, cy - 4, 24, 8);
        tCtx.strokeRect(cx - 12, cy - 4, 24, 8);

        // Left massive solar array
        tCtx.fillStyle = 'rgba(56, 189, 248, 0.9)'; // Cyan solar panel cells
        tCtx.fillRect(cx - 28, cy - 6, 12, 12);
        tCtx.strokeRect(cx - 28, cy - 6, 12, 12);

        // Right massive solar array
        tCtx.fillRect(cx + 16, cy - 6, 12, 12);
        tCtx.strokeRect(cx + 16, cy - 6, 12, 12);

        setTiangongMarkerImage(tiangongCanvas.toDataURL());
      }

      // 7. Starlink Marker (Flat panel body with a single massive long solar panel wing)
      const starlinkCanvas = document.createElement('canvas');
      starlinkCanvas.width = 128;
      starlinkCanvas.height = 128;
      const sCtx = starlinkCanvas.getContext('2d');
      if (sCtx) {
        const cx = 64;
        const cy = 64;

        // Subtle blue-cyan glow
        const glowGrad = sCtx.createRadialGradient(cx, cy, 2, cx, cy, 28);
        glowGrad.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
        glowGrad.addColorStop(0.4, 'rgba(34, 211, 238, 0.2)');
        glowGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
        sCtx.fillStyle = glowGrad;
        sCtx.beginPath();
        sCtx.arc(cx, cy, 28, 0, Math.PI * 2);
        sCtx.fill();

        // Starlink Flat Body (slanted rectangle)
        sCtx.fillStyle = '#ffffff';
        sCtx.strokeStyle = '#22d3ee';
        sCtx.lineWidth = 1.5;
        
        sCtx.beginPath();
        sCtx.moveTo(cx - 8, cy - 3);
        sCtx.lineTo(cx + 8, cy - 3);
        sCtx.lineTo(cx + 4, cy + 3);
        sCtx.lineTo(cx - 12, cy + 3);
        sCtx.closePath();
        sCtx.fill();
        sCtx.stroke();

        // Single long solar array extending upwards/sideways
        sCtx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        sCtx.fillRect(cx - 4, cy - 24, 8, 18);
        sCtx.strokeRect(cx - 4, cy - 24, 8, 18);

        // Divider lines on solar panel
        sCtx.strokeStyle = '#22d3ee';
        sCtx.lineWidth = 1;
        sCtx.beginPath();
        sCtx.moveTo(cx - 4, cy - 15);
        sCtx.lineTo(cx + 4, cy - 15);
        sCtx.moveTo(cx - 4, cy - 9);
        sCtx.lineTo(cx + 4, cy - 9);
        sCtx.stroke();

        setStarlinkMarkerImage(starlinkCanvas.toDataURL());
      }

      // 8. Hubble Marker (Cylindrical tube telescope body with two side wing panels)
      const hubbleCanvas = document.createElement('canvas');
      hubbleCanvas.width = 128;
      hubbleCanvas.height = 128;
      const hCtx = hubbleCanvas.getContext('2d');
      if (hCtx) {
        const cx = 64;
        const cy = 64;

        // Subtle silver/white glow
        const glowGrad = hCtx.createRadialGradient(cx, cy, 2, cx, cy, 32);
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        glowGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        hCtx.fillStyle = glowGrad;
        hCtx.beginPath();
        hCtx.arc(cx, cy, 32, 0, Math.PI * 2);
        hCtx.fill();

        // Main cylindrical tube body (slanted for cinematic 3D perspective)
        hCtx.fillStyle = '#e2e8f0';
        hCtx.strokeStyle = '#94a3b8';
        hCtx.lineWidth = 1.5;
        
        // Telescope tube
        hCtx.beginPath();
        hCtx.arc(cx, cy, 8, 0, Math.PI * 2);
        hCtx.fill();
        hCtx.stroke();

        // Main cylinder extension
        hCtx.fillStyle = '#cbd5e1';
        hCtx.fillRect(cx - 8, cy - 18, 16, 18);
        hCtx.strokeRect(cx - 8, cy - 18, 16, 18);

        // Open aperture door at the top
        hCtx.strokeStyle = '#94a3b8';
        hCtx.beginPath();
        hCtx.moveTo(cx - 8, cy - 18);
        hCtx.quadraticCurveTo(cx - 14, cy - 24, cx - 6, cy - 26);
        hCtx.stroke();

        // Left solar panel wing
        hCtx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        hCtx.fillRect(cx - 24, cy - 12, 12, 6);
        hCtx.strokeRect(cx - 24, cy - 12, 12, 6);

        // Right solar panel wing
        hCtx.fillRect(cx + 12, cy - 12, 12, 6);
        hCtx.strokeRect(cx + 12, cy - 12, 12, 6);

        setHubbleMarkerImage(hubbleCanvas.toDataURL());
      }

      // 9. Landsat Marker (Central sensor box with dual large solar panels on left/right)
      const landsatCanvas = document.createElement('canvas');
      landsatCanvas.width = 128;
      landsatCanvas.height = 128;
      const lCtx = landsatCanvas.getContext('2d');
      if (lCtx) {
        const cx = 64;
        const cy = 64;

        // Subtle emerald green glow
        const glowGrad = lCtx.createRadialGradient(cx, cy, 2, cx, cy, 32);
        glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
        glowGrad.addColorStop(0.4, 'rgba(16, 185, 129, 0.2)');
        glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        lCtx.fillStyle = glowGrad;
        lCtx.beginPath();
        lCtx.arc(cx, cy, 32, 0, Math.PI * 2);
        lCtx.fill();

        // Central sensor module (white octagonal/hexagonal core)
        lCtx.fillStyle = '#ffffff';
        lCtx.strokeStyle = '#10b981';
        lCtx.lineWidth = 1.5;
        lCtx.beginPath();
        lCtx.moveTo(cx - 7, cy - 10);
        lCtx.lineTo(cx + 7, cy - 10);
        lCtx.lineTo(cx + 10, cy);
        lCtx.lineTo(cx + 7, cy + 10);
        lCtx.lineTo(cx - 7, cy + 10);
        lCtx.lineTo(cx - 10, cy);
        lCtx.closePath();
        lCtx.fill();
        lCtx.stroke();

        // Sensor aperture center detail
        lCtx.fillStyle = '#10b981';
        lCtx.beginPath();
        lCtx.arc(cx, cy, 3, 0, Math.PI * 2);
        lCtx.fill();

        // Solar panel arms
        lCtx.strokeStyle = '#10b981';
        lCtx.lineWidth = 2.0;
        lCtx.beginPath();
        lCtx.moveTo(cx - 24, cy);
        lCtx.lineTo(cx - 10, cy);
        lCtx.moveTo(cx + 10, cy);
        lCtx.lineTo(cx + 24, cy);
        lCtx.stroke();

        // Left solar wing
        lCtx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        lCtx.fillRect(cx - 24, cy - 8, 12, 16);
        lCtx.strokeRect(cx - 24, cy - 8, 12, 16);

        // Right solar wing
        lCtx.fillRect(cx + 12, cy - 8, 12, 16);
        lCtx.strokeRect(cx + 12, cy - 8, 12, 16);

        setLandsatMarkerImage(landsatCanvas.toDataURL());
      }

      // 10. Rocket Body Marker (stylized orange rocket icon)
      const rocketCanvas = document.createElement('canvas');
      rocketCanvas.width = 64;
      rocketCanvas.height = 64;
      const rBodyCtx = rocketCanvas.getContext('2d');
      if (rBodyCtx) {
        const cx = 32;
        const cy = 32;

        // Orange glow
        const glowGrad = rBodyCtx.createRadialGradient(cx, cy, 2, cx, cy, 20);
        glowGrad.addColorStop(0, 'rgba(249, 115, 22, 0.6)');
        glowGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
        glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        rBodyCtx.fillStyle = glowGrad;
        rBodyCtx.beginPath();
        rBodyCtx.arc(cx, cy, 20, 0, Math.PI * 2);
        rBodyCtx.fill();

        // Stylized Rocket Shape (pointing straight up)
        rBodyCtx.fillStyle = '#f97316';
        rBodyCtx.strokeStyle = '#ea580c';
        rBodyCtx.lineWidth = 1.5;

        // Body
        rBodyCtx.beginPath();
        rBodyCtx.moveTo(cx, cy - 12); // nose cone tip
        rBodyCtx.bezierCurveTo(cx + 5, cy - 4, cx + 5, cy + 6, cx + 4, cy + 8); // right side
        rBodyCtx.lineTo(cx - 4, cy + 8); // bottom
        rBodyCtx.bezierCurveTo(cx - 5, cy + 6, cx - 5, cy - 4, cx, cy - 12); // left side
        rBodyCtx.fill();
        rBodyCtx.stroke();

        // Left Fin
        rBodyCtx.fillStyle = '#ea580c';
        rBodyCtx.beginPath();
        rBodyCtx.moveTo(cx - 4, cy + 2);
        rBodyCtx.lineTo(cx - 9, cy + 9);
        rBodyCtx.lineTo(cx - 4, cy + 8);
        rBodyCtx.closePath();
        rBodyCtx.fill();

        // Right Fin
        rBodyCtx.beginPath();
        rBodyCtx.moveTo(cx + 4, cy + 2);
        rBodyCtx.lineTo(cx + 9, cy + 9);
        rBodyCtx.lineTo(cx + 4, cy + 8);
        rBodyCtx.closePath();
        rBodyCtx.fill();

        // Flame / exhaust glow
        rBodyCtx.fillStyle = '#fdba74';
        rBodyCtx.beginPath();
        rBodyCtx.moveTo(cx - 2, cy + 8);
        rBodyCtx.lineTo(cx, cy + 13);
        rBodyCtx.lineTo(cx + 2, cy + 8);
        rBodyCtx.closePath();
        rBodyCtx.fill();

        setRocketMarkerImage(rocketCanvas.toDataURL());
      }

      // 11. Inactive Satellite Marker (stylized slate gray satellite icon)
      const satelliteCanvas = document.createElement('canvas');
      satelliteCanvas.width = 64;
      satelliteCanvas.height = 64;
      const sBodyCtx = satelliteCanvas.getContext('2d');
      if (sBodyCtx) {
        const cx = 32;
        const cy = 32;

        // Gray glow
        const glowGrad = sBodyCtx.createRadialGradient(cx, cy, 2, cx, cy, 24);
        glowGrad.addColorStop(0, 'rgba(148, 163, 184, 0.55)');
        glowGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.15)');
        glowGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
        sBodyCtx.fillStyle = glowGrad;
        sBodyCtx.beginPath();
        sBodyCtx.arc(cx, cy, 24, 0, Math.PI * 2);
        sBodyCtx.fill();

        // Stylized Satellite Shape
        // Central body (circle)
        sBodyCtx.fillStyle = '#ffffff';
        sBodyCtx.strokeStyle = '#94a3b8';
        sBodyCtx.lineWidth = 1.5;
        sBodyCtx.beginPath();
        sBodyCtx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        sBodyCtx.fill();
        sBodyCtx.stroke();

        // Solar panels (left and right rectangles)
        sBodyCtx.fillStyle = '#64748b';
        sBodyCtx.strokeStyle = '#94a3b8';
        sBodyCtx.lineWidth = 1;
        
        // Left panel
        sBodyCtx.fillRect(cx - 16, cy - 3, 10, 6);
        sBodyCtx.strokeRect(cx - 16, cy - 3, 10, 6);

        // Right panel
        sBodyCtx.fillRect(cx + 6, cy - 3, 10, 6);
        sBodyCtx.strokeRect(cx + 6, cy - 3, 10, 6);

        // Connection bars
        sBodyCtx.strokeStyle = '#94a3b8';
        sBodyCtx.lineWidth = 1.2;
        sBodyCtx.beginPath();
        sBodyCtx.moveTo(cx - 6, cy);
        sBodyCtx.lineTo(cx + 6, cy);
        sBodyCtx.stroke();

        // Small antenna pointing down
        sBodyCtx.beginPath();
        sBodyCtx.moveTo(cx, cy + 4.5);
        sBodyCtx.lineTo(cx, cy + 8);
        sBodyCtx.stroke();
        sBodyCtx.fillStyle = '#94a3b8';
        sBodyCtx.beginPath();
        sBodyCtx.arc(cx, cy + 8, 1, 0, Math.PI * 2);
        sBodyCtx.fill();

        setInactiveSatelliteMarkerImage(satelliteCanvas.toDataURL());
      }

      // 12. Featured Object Marker (gold/amber glowing reticle)
      const featuredCanvas = document.createElement('canvas');
      featuredCanvas.width = 128;
      featuredCanvas.height = 128;
      const fCtx = featuredCanvas.getContext('2d');
      if (fCtx) {
        const cx = 64;
        const cy = 64;

        // Rich gold radial glow
        const glowGrad = fCtx.createRadialGradient(cx, cy, 4, cx, cy, 48);
        glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.65)');
        glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        fCtx.fillStyle = glowGrad;
        fCtx.beginPath();
        fCtx.arc(cx, cy, 48, 0, Math.PI * 2);
        fCtx.fill();

        // Golden outer ring
        fCtx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
        fCtx.lineWidth = 2.0;
        fCtx.beginPath();
        fCtx.arc(cx, cy, 18, 0, Math.PI * 2);
        fCtx.stroke();

        // Four tick marks
        fCtx.lineWidth = 2.5;
        fCtx.beginPath();
        fCtx.moveTo(cx - 24, cy); fCtx.lineTo(cx - 14, cy);
        fCtx.moveTo(cx + 14, cy); fCtx.lineTo(cx + 24, cy);
        fCtx.moveTo(cx, cy - 24); fCtx.lineTo(cx, cy - 14);
        fCtx.moveTo(cx, cy + 14); fCtx.lineTo(cx, cy + 24);
        fCtx.stroke();

        // White core with golden border
        fCtx.fillStyle = '#ffffff';
        fCtx.beginPath();
        fCtx.arc(cx, cy, 6, 0, Math.PI * 2);
        fCtx.fill();
        fCtx.strokeStyle = '#f59e0b';
        fCtx.lineWidth = 1.5;
        fCtx.stroke();

        setFeaturedMarkerImage(featuredCanvas.toDataURL());
      }
    }
  }, []);

  // Native Cesium properties for smooth animation loop (avoiding React state re-renders)
  const baseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const baseColorRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseColorRef = useRef<Cesium.CallbackProperty | null>(null);

  // Featured Objects pulsing properties
  const featuredScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const featuredColorRef = useRef<Cesium.CallbackProperty | null>(null);

  // Spacecraft Marker Properties
  const issTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const issPositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const issScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const issColorRef = useRef<Cesium.CallbackProperty | null>(null);

  const hubbleTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const hubblePositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const hubbleScaleRef = useRef<Cesium.CallbackProperty | null>(null);

  const tiangongTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const tiangongPositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const tiangongScaleRef = useRef<Cesium.CallbackProperty | null>(null);

  const starlinkTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const starlinkPositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const starlinkScaleRef = useRef<Cesium.CallbackProperty | null>(null);

  const landsatTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const landsatPositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const landsatScaleRef = useRef<Cesium.CallbackProperty | null>(null);

  // Unified Focus position properties
  const focusBasePositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const focusPulsePositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusPulseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusPulseColorRef = useRef<Cesium.CallbackProperty | null>(null);

  // Sync latest hook telemetry values to refs
  const issData = spacecrafts.find((s) => s.id === "iss");
  const hubbleData = spacecrafts.find((s) => s.id === "hubble");
  const tiangongData = spacecrafts.find((s) => s.id === "tiangong");
  const starlinkData = spacecrafts.find((s) => s.id === "starlink");
  const landsatData = spacecrafts.find((s) => s.id === "landsat");

  useEffect(() => {
    if (issData && issData.latitude !== null && issData.longitude !== null) {
      issTargetRef.current = { lat: issData.latitude, lng: issData.longitude };
    }
  }, [issData?.latitude, issData?.longitude]);

  useEffect(() => {
    if (hubbleData && hubbleData.latitude !== null && hubbleData.longitude !== null) {
      hubbleTargetRef.current = { lat: hubbleData.latitude, lng: hubbleData.longitude };
    }
  }, [hubbleData?.latitude, hubbleData?.longitude]);

  useEffect(() => {
    if (tiangongData && tiangongData.latitude !== null && tiangongData.longitude !== null) {
      tiangongTargetRef.current = { lat: tiangongData.latitude, lng: tiangongData.longitude };
    }
  }, [tiangongData?.latitude, tiangongData?.longitude]);

  useEffect(() => {
    if (starlinkData && starlinkData.latitude !== null && starlinkData.longitude !== null) {
      starlinkTargetRef.current = { lat: starlinkData.latitude, lng: starlinkData.longitude };
    }
  }, [starlinkData?.latitude, starlinkData?.longitude]);

  useEffect(() => {
    if (landsatData && landsatData.latitude !== null && landsatData.longitude !== null) {
      landsatTargetRef.current = { lat: landsatData.latitude, lng: landsatData.longitude };
    }
  }, [landsatData?.latitude, landsatData?.longitude]);

  if (!baseScaleRef.current && typeof window !== 'undefined') {
    baseScaleRef.current = new Cesium.CallbackProperty(() => {
      const t = (Date.now() % 3000) / 3000 * Math.PI * 2;
      return 1.0 + 0.04 * Math.sin(t);
    }, false);

    baseColorRef.current = new Cesium.CallbackProperty(() => {
      const t = (Date.now() % 3000) / 3000 * Math.PI * 2;
      const alpha = 0.85 + 0.15 * Math.sin(t);
      return Cesium.Color.WHITE.withAlpha(alpha);
    }, false);

    pulseScaleRef.current = new Cesium.CallbackProperty(() => {
      const elapsed = Date.now() % 2500;
      const progress = elapsed / 2500;
      return 0.7 + progress * 1.1;
    }, false);

    pulseColorRef.current = new Cesium.CallbackProperty(() => {
      const elapsed = Date.now() % 2500;
      const progress = elapsed / 2500;
      const alpha = 0.85 * (1.0 - progress);
      return Cesium.Color.WHITE.withAlpha(alpha);
    }, false);
  }

  if (!featuredScaleRef.current && typeof window !== 'undefined') {
    featuredScaleRef.current = new Cesium.CallbackProperty(() => {
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 1.0 + 0.12 * Math.sin(t);
    }, false);

    featuredColorRef.current = new Cesium.CallbackProperty(() => {
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      const alpha = 0.8 + 0.2 * Math.sin(t);
      return Cesium.Color.WHITE.withAlpha(alpha);
    }, false);
  }

  if (!issPositionProperty.current && typeof window !== 'undefined') {
    let issCurrentLat = 0;
    let issCurrentLng = 0;
    let issInitialized = false;

    issPositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!issTargetRef.current) return undefined as any;
      const target = issTargetRef.current;
      if (!issInitialized) {
        issCurrentLat = target.lat;
        issCurrentLng = target.lng;
        issInitialized = true;
      } else {
        issCurrentLat += (target.lat - issCurrentLat) * 0.03;
        let diffLng = target.lng - issCurrentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        issCurrentLng += diffLng * 0.03;
        if (issCurrentLng > 180) issCurrentLng -= 360;
        if (issCurrentLng < -180) issCurrentLng += 360;
      }
      return Cesium.Cartesian3.fromDegrees(issCurrentLng, issCurrentLat, 420000);
    }, false);

    let hubbleCurrentLat = 0;
    let hubbleCurrentLng = 0;
    let hubbleInitialized = false;

    hubblePositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!hubbleTargetRef.current) return undefined as any;
      const target = hubbleTargetRef.current;
      if (!hubbleInitialized) {
        hubbleCurrentLat = target.lat;
        hubbleCurrentLng = target.lng;
        hubbleInitialized = true;
      } else {
        hubbleCurrentLat += (target.lat - hubbleCurrentLat) * 0.03;
        let diffLng = target.lng - hubbleCurrentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        hubbleCurrentLng += diffLng * 0.03;
        if (hubbleCurrentLng > 180) hubbleCurrentLng -= 360;
        if (hubbleCurrentLng < -180) hubbleCurrentLng += 360;
      }
      return Cesium.Cartesian3.fromDegrees(hubbleCurrentLng, hubbleCurrentLat, 540000);
    }, false);

    let tiangongCurrentLat = 0;
    let tiangongCurrentLng = 0;
    let tiangongInitialized = false;

    tiangongPositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!tiangongTargetRef.current) return undefined as any;
      const target = tiangongTargetRef.current;
      if (!tiangongInitialized) {
        tiangongCurrentLat = target.lat;
        tiangongCurrentLng = target.lng;
        tiangongInitialized = true;
      } else {
        tiangongCurrentLat += (target.lat - tiangongCurrentLat) * 0.03;
        let diffLng = target.lng - tiangongCurrentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        tiangongCurrentLng += diffLng * 0.03;
        if (tiangongCurrentLng > 180) tiangongCurrentLng -= 360;
        if (tiangongCurrentLng < -180) tiangongCurrentLng += 360;
      }
      return Cesium.Cartesian3.fromDegrees(tiangongCurrentLng, tiangongCurrentLat, 390000);
    }, false);

    let starlinkCurrentLat = 0;
    let starlinkCurrentLng = 0;
    let starlinkInitialized = false;

    starlinkPositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!starlinkTargetRef.current) return undefined as any;
      const target = starlinkTargetRef.current;
      if (!starlinkInitialized) {
        starlinkCurrentLat = target.lat;
        starlinkCurrentLng = target.lng;
        starlinkInitialized = true;
      } else {
        starlinkCurrentLat += (target.lat - starlinkCurrentLat) * 0.03;
        let diffLng = target.lng - starlinkCurrentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        starlinkCurrentLng += diffLng * 0.03;
        if (starlinkCurrentLng > 180) starlinkCurrentLng -= 360;
        if (starlinkCurrentLng < -180) starlinkCurrentLng += 360;
      }
      return Cesium.Cartesian3.fromDegrees(starlinkCurrentLng, starlinkCurrentLat, 550000);
    }, false);

    let landsatCurrentLat = 0;
    let landsatCurrentLng = 0;
    let landsatInitialized = false;

    landsatPositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!landsatTargetRef.current) return undefined as any;
      const target = landsatTargetRef.current;
      if (!landsatInitialized) {
        landsatCurrentLat = target.lat;
        landsatCurrentLng = target.lng;
        landsatInitialized = true;
      } else {
        landsatCurrentLat += (target.lat - landsatCurrentLat) * 0.03;
        let diffLng = target.lng - landsatCurrentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        landsatCurrentLng += diffLng * 0.03;
        if (landsatCurrentLng > 180) landsatCurrentLng -= 360;
        if (landsatCurrentLng < -180) landsatCurrentLng += 360;
      }
      return Cesium.Cartesian3.fromDegrees(landsatCurrentLng, landsatCurrentLat, 705000);
    }, false);

    focusBasePositionProperty.current = new Cesium.CallbackProperty(() => {
      const activeId = selectedSpacecraftIdRef.current;
      if (activeId === "iss" && issTargetRef.current) {
        const cart = issPositionProperty.current?.getValue(new Cesium.JulianDate());
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height - 200);
        }
      } else if (activeId === "hubble" && hubbleTargetRef.current) {
        const cart = hubblePositionProperty.current?.getValue(new Cesium.JulianDate());
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height - 200);
        }
      } else if (activeId === "tiangong" && tiangongTargetRef.current) {
        const cart = tiangongPositionProperty.current?.getValue(new Cesium.JulianDate());
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height - 200);
        }
      } else if (activeId === "starlink" && starlinkTargetRef.current) {
        const cart = starlinkPositionProperty.current?.getValue(new Cesium.JulianDate());
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height - 200);
        }
      } else if (activeId === "landsat" && landsatTargetRef.current) {
        const cart = landsatPositionProperty.current?.getValue(new Cesium.JulianDate());
        if (cart) {
          const carto = Cesium.Cartographic.fromCartesian(cart);
          return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height - 200);
        }
      }
      return undefined as any;
    }, false);

    focusPulsePositionProperty.current = new Cesium.CallbackProperty(() => {
      const cart = focusBasePositionProperty.current?.getValue(new Cesium.JulianDate());
      if (cart) {
        const carto = Cesium.Cartographic.fromCartesian(cart);
        return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height + 100);
      }
      return undefined as any;
    }, false);

    issScaleRef.current = new Cesium.CallbackProperty(() => {
      if (selectedSpacecraftIdRef.current === 'iss' && isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t);
    }, false);

    hubbleScaleRef.current = new Cesium.CallbackProperty(() => {
      if (selectedSpacecraftIdRef.current === 'hubble' && isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t);
    }, false);

    tiangongScaleRef.current = new Cesium.CallbackProperty(() => {
      if (selectedSpacecraftIdRef.current === 'tiangong' && isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t);
    }, false);

    starlinkScaleRef.current = new Cesium.CallbackProperty(() => {
      if (selectedSpacecraftIdRef.current === 'starlink' && isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t);
    }, false);

    landsatScaleRef.current = new Cesium.CallbackProperty(() => {
      if (selectedSpacecraftIdRef.current === 'landsat' && isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t);
    }, false);

    issColorRef.current = new Cesium.CallbackProperty(() => {
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      const alpha = 0.85 + 0.15 * Math.sin(t);
      return Cesium.Color.WHITE.withAlpha(alpha);
    }, false);

    issFocusPulseScaleRef.current = new Cesium.CallbackProperty(() => {
      const elapsed = Date.now() % 1500;
      const progress = elapsed / 1500;
      return 0.5 + progress * 1.5;
    }, false);

    issFocusPulseColorRef.current = new Cesium.CallbackProperty(() => {
      const elapsed = Date.now() % 1500;
      const progress = elapsed / 1500;
      const alpha = 0.8 * (1.0 - progress);
      const colorStr = selectedSpacecraftIdRef.current === 'tiangong' 
        ? '#fbbf24' 
        : selectedSpacecraftIdRef.current === 'hubble'
        ? '#38bdf8'
        : selectedSpacecraftIdRef.current === 'starlink'
        ? '#ec4899'
        : selectedSpacecraftIdRef.current === 'landsat'
        ? '#10b981'
        : '#c084fc';
      return Cesium.Color.fromCssColorString(colorStr).withAlpha(alpha);
    }, false);
  }

  // Load imagery provider asynchronously (Cesium v100+ standard)
  useEffect(() => {
    let active = true;

    async function loadProvider() {
      try {
        // Try to load Ion satellite imagery (Asset ID 2 is Bing Maps Satellite)
        const provider = await Cesium.IonImageryProvider.fromAssetId(2);
        if (active) {
          setImageryProvider(provider);
        }
      } catch (error) {
        console.warn('Ion satellite imagery failed to load, falling back to local NaturalEarthII:', error);
        try {
          const fallbackUrl = Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII');
          const provider = await Cesium.TileMapServiceImageryProvider.fromUrl(fallbackUrl);
          if (active) {
            setImageryProvider(provider);
          }
        } catch (fallbackError) {
          console.error('Fallback imagery also failed to load:', fallbackError);
        }
      }
    }

    loadProvider();

    return () => {
      active = false;
    };
  }, []);

  // Callback ref to capture when Resium's Viewer component is mounted
  const viewerRef = (node: any) => {
    if (node?.cesiumElement) {
      setViewer(node.cesiumElement);
      if (typeof window !== 'undefined') {
        (window as any).viewer = node.cesiumElement;
      }
    } else {
      setViewer(null);
    }
  };

  // Set up Cesium viewer settings when instance is resolved
  useEffect(() => {
    if (!viewer) return;

    const scene = viewer.scene;

    // Configure scene properties for lighting and atmosphere
    scene.globe.enableLighting = true;

    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.show = true;
    }
    scene.globe.showGroundAtmosphere = true;

    // Enable clock animation to update the real sun lighting position automatically
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1.0;
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());

    // Enable high-fidelity realistic rendering features
    viewer.resolutionScale = Math.max(window.devicePixelRatio || 1.0, 2.0); // Ensure high-resolution rendering on modern displays
    scene.globe.showWaterEffect = true; // Ocean waves and sun specular reflection on water
    scene.globe.dynamicAtmosphereLighting = true; // Enable dynamic atmosphere lighting for day/night scattering
    scene.globe.maximumScreenSpaceError = 0.4; // Load much higher detail tiles for maximum texture sharpness
    scene.globe.depthTestAgainstTerrain = false; // Disable depth test against terrain so imagery is always visible
    
    if (scene.postProcessStages && scene.postProcessStages.fxaa) {
      scene.postProcessStages.fxaa.enabled = true; // Fast approximate anti-aliasing to smooth edge pixels
    }

    // Load Cesium World Terrain for 3D mountains and valley topography
    try {
      const terrain = Cesium.Terrain.fromWorldTerrain();
      viewer.scene.setTerrain(terrain);
    } catch (error) {
      console.warn('Failed to load world terrain:', error);
    }
    
    // Disable skybox and moon completely to allow custom background to show through
    scene.skyBox = undefined as any;
    scene.moon = undefined as any;
    
    // Disable order independent translucency and HDR to ensure transparency works (safely caught if read-only)
    try {
      (scene as any).orderIndependentTranslucency = false;
    } catch (e) {
      console.warn('orderIndependentTranslucency is read-only in this version of Cesium.');
    }
    try {
      scene.highDynamicRange = false;
    } catch (e) {
      console.warn('highDynamicRange is read-only in this version of Cesium.');
    }
    scene.backgroundColor = new Cesium.Color(0.0, 0.0, 0.0, 0.0);

    // Apply custom imagery settings
    const applyLayerSettings = (layer: Cesium.ImageryLayer) => {
      if (isGraveyardRef.current) {
        layer.brightness = 0.65;
        layer.contrast = 1.35;
        layer.saturation = 0.75;
        layer.gamma = 1.2;
      } else {
        layer.brightness = 1.0;
        layer.contrast = 1.15;
        layer.saturation = 1.1;
        layer.gamma = 1.6;
      }
    };

    // Apply to existing layers
    for (let i = 0; i < viewer.imageryLayers.length; i++) {
      applyLayerSettings(viewer.imageryLayers.get(i));
    }

    // Apply to any layers added in the future
    const removeLayerAddedListener = viewer.imageryLayers.layerAdded.addEventListener((layer) => {
      applyLayerSettings(layer);
    });

    // Safety timeout to ensure globe is faded in even on slow network connections
    const safetyTimeout = setTimeout(() => {
      setIsGlobeReady(true);
    }, 800);

    // Fade in once initial tiles are loaded
    const removeTileLoadListener = viewer.scene.globe.tileLoadProgressEvent.addEventListener((queueLength) => {
      if (queueLength === 0) {
        setIsGlobeReady(true);
      }
    });

    // Set initial camera view further out for a smooth zoom-in effect
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-45, 20, 2.4e7),
    });

    const canvas = viewer.scene.canvas;
    const handler = new Cesium.ScreenSpaceEventHandler(canvas);
    
    let isMouseDown = false;

    const startInteraction = () => {
      isMouseDown = true;
      isUserInteractingRef.current = true;
      rotationFactorRef.current = 0;
      lastInteractionTimeRef.current = Date.now();
    };

    const stopInteraction = () => {
      isMouseDown = false;
      lastInteractionTimeRef.current = Date.now();
    };

    // Left click/drag
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(stopInteraction, Cesium.ScreenSpaceEventType.LEFT_UP);
    
    // Right click/drag (panning/zooming)
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
    handler.setInputAction(stopInteraction, Cesium.ScreenSpaceEventType.RIGHT_UP);

    // Middle click/drag (rotation/tilt)
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    handler.setInputAction(stopInteraction, Cesium.ScreenSpaceEventType.MIDDLE_UP);

    // Mouse movement: updates interaction timestamp when dragging, and handles hover pointer style
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      if (isMouseDown) {
        lastInteractionTimeRef.current = Date.now();
      }
      
      if (isGraveyardRef.current) {
        setHoveredEntity(null);
        let isHoveringFeatured = false;
        if (viewer) {
          const pickedObject = viewer.scene.pick(movement.endPosition);
          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entId = pickedObject.id.id;
            const found = debrisRef.current.find(d => d.id === entId);
            if (found && found.category === 'featured') {
              isHoveringFeatured = true;
            }
          }
        }
        if (viewer?.scene?.canvas) {
          if (isHoveringFeatured) {
            viewer.scene.canvas.classList.add('globe-hover-pointer');
          } else {
            viewer.scene.canvas.classList.remove('globe-hover-pointer');
          }
        }
        return;
      }
      
      let hoveredSatId: string | null = null;
      let isHoveringClickable = false;

      if (viewer) {
        // Track mouse position in state for tooltip
        setMousePos({ x: movement.endPosition.x, y: movement.endPosition.y });

        // Pick object under mouse
        const pickedObject = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entId = pickedObject.id.id;
          if (entId === 'iss-entity' || entId === 'hubble-entity' || entId === 'tiangong-entity' || entId === 'starlink-entity' || entId === 'landsat-entity') {
            hoveredSatId = entId.replace('-entity', '');
            isHoveringClickable = true;
          }
        }

        // Standard terrain select pointer
        if (onSelectLocationRef.current) {
          const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
          if (cartesian) {
            isHoveringClickable = true;
          }
        }

        if (isHoveringClickable) {
          viewer.scene.canvas.classList.add('globe-hover-pointer');
        } else {
          viewer.scene.canvas.classList.remove('globe-hover-pointer');
        }
      }

      setHoveredEntity(hoveredSatId);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Left click selects coordinates or picks entities
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      if (!viewer) return;
      
      if (isGraveyardRef.current) {
        setPopupEntity(null);
        const pickedObject = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entId = pickedObject.id.id;
          const found = debrisRef.current.find(d => d.id === entId);
          if (found && found.category === 'featured') {
            if (onSelectFeaturedObjectRef.current) {
              onSelectFeaturedObjectRef.current(found.id);
            }
            lastInteractionTimeRef.current = Date.now();
            isUserInteractingRef.current = true;
            rotationFactorRef.current = 0;
            return;
          }
        }
        if (onSelectFeaturedObjectRef.current) {
          onSelectFeaturedObjectRef.current(null);
        }
        return;
      }
      
      const pickedObject = viewer.scene.pick(movement.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entId = pickedObject.id.id;
        if (entId === 'iss-entity' || entId === 'hubble-entity' || entId === 'tiangong-entity' || entId === 'starlink-entity' || entId === 'landsat-entity') {
          const scId = entId.replace('-entity', '');
          // Clicked a spacecraft! Show the popup
          setPopupEntity(scId);
          if (onSelectSpacecraft) {
            onSelectSpacecraft(scId, false); // select it in panel without refocusing camera
          }
          // Pause auto rotation to let user read the info
          lastInteractionTimeRef.current = Date.now();
          isUserInteractingRef.current = true;
          rotationFactorRef.current = 0;
          return;
        }
      }

      // If clicked elsewhere, close popup
      setPopupEntity(null);

      // Select coordinates on the globe (only if onSelectLocation callback is active)
      if (onSelectLocationRef.current) {
        const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          onSelectLocationRef.current({ lat, lng: lon });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Zoom/Wheel interaction
    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
      rotationFactorRef.current = 0;
      lastInteractionTimeRef.current = Date.now();
    }, Cesium.ScreenSpaceEventType.WHEEL);

    // Touch gesture pinch zoom/rotate
    handler.setInputAction(() => {
      isUserInteractingRef.current = true;
      rotationFactorRef.current = 0;
      lastInteractionTimeRef.current = Date.now();
    }, Cesium.ScreenSpaceEventType.PINCH_START);

    handler.setInputAction(() => {
      lastInteractionTimeRef.current = Date.now();
    }, Cesium.ScreenSpaceEventType.PINCH_END);

    // Auto-rotation around Earth's Z axis
    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const now = Date.now();
      const timeSinceInteraction = now - lastInteractionTimeRef.current;

      if (timeSinceInteraction > 5000) {
        isUserInteractingRef.current = false;
        // Ramp rotation factor from 0 to 1 over 1.5 seconds
        rotationFactorRef.current = Math.min(
          1.0,
          rotationFactorRef.current + 0.01
        );
      }

      if (!isUserInteractingRef.current) {
        const rotationSpeed = 0.05 * rotationFactorRef.current;
        viewer.scene.camera.rotateRight(rotationSpeed * (Math.PI / 180));
      }

      if (!isGraveyardRef.current && isISSFocusedRef.current && issLabelRef.current && selectedSpacecraftIdRef.current) {
        let target = null;
        let height = 420000;
        if (selectedSpacecraftIdRef.current === 'iss') {
          target = issTargetRef.current;
          height = 420000;
        } else if (selectedSpacecraftIdRef.current === 'hubble') {
          target = hubbleTargetRef.current;
          height = 540000;
        } else if (selectedSpacecraftIdRef.current === 'tiangong') {
          target = tiangongTargetRef.current;
          height = 390000;
        } else if (selectedSpacecraftIdRef.current === 'starlink') {
          target = starlinkTargetRef.current;
          height = 550000;
        } else if (selectedSpacecraftIdRef.current === 'landsat') {
          target = landsatTargetRef.current;
          height = 705000;
        }

        if (target) {
          const satCartesian = Cesium.Cartesian3.fromDegrees(
            target.lng,
            target.lat,
            height
          );

          const cameraPosition = viewer.camera.position;
          const occluder = new (Cesium as any).EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, cameraPosition);
          const isVisible = occluder.isPointVisible(satCartesian);

          if (isVisible) {
            const projectToWindow = Cesium.SceneTransforms.worldToWindowCoordinates || (Cesium.SceneTransforms as any).wgs84ToWindowCoordinates;
            const windowPos = projectToWindow(viewer.scene, satCartesian);
            if (windowPos) {
              issLabelRef.current.style.display = 'block';
              issLabelRef.current.style.left = `${windowPos.x}px`;
              issLabelRef.current.style.top = `${windowPos.y - 45}px`;
            } else {
              issLabelRef.current.style.display = 'none';
            }
          } else {
            issLabelRef.current.style.display = 'none';
          }
        } else {
          issLabelRef.current.style.display = 'none';
        }
      } else if (issLabelRef.current) {
        issLabelRef.current.style.display = 'none';
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      removeTileLoadListener();
      removeListener();
      removeLayerAddedListener();
      handler.destroy();
    };
  }, [viewer]);

  // Fly camera to focus when active becomes true
  useEffect(() => {
    if (!viewer || !active) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-45, 20, 1.65e7),
      duration: 1.8, // Faster, snappier camera flight
    });
  }, [viewer, active]);

  // Fly camera to targetLocation when coords change
  useEffect(() => {
    if (!viewer || !targetLocation) return;

    // Pause auto-rotation for 5 seconds by resetting interaction timer
    lastInteractionTimeRef.current = Date.now();
    isUserInteractingRef.current = true;
    rotationFactorRef.current = 0;

    const currentHeight = viewer.camera.positionCartographic.height;
    const targetLon = targetLocation.lng ?? (targetLocation as any).lon ?? 0;
    const targetLat = targetLocation.lat;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, currentHeight),
      duration: 1.8, // Smooth cinematic 1.8 seconds flight duration
    });
  }, [viewer, targetLocation]);

  // Fly camera to focus on the selected spacecraft when spacecraftFocusTrigger changes
  useEffect(() => {
    if (spacecraftFocusTrigger === 0 || !viewer || !selectedSpacecraftId) return;

    // Reset interaction timer to pause auto-rotation
    lastInteractionTimeRef.current = Date.now();
    isUserInteractingRef.current = true;
    rotationFactorRef.current = 0;

    // Get selected spacecraft position
    let target = null;
    let height = 420000;
    if (selectedSpacecraftId === 'iss') {
      target = issTargetRef.current;
      height = 420000;
    } else if (selectedSpacecraftId === 'hubble') {
      target = hubbleTargetRef.current;
      height = 540000;
    } else if (selectedSpacecraftId === 'tiangong') {
      target = tiangongTargetRef.current;
      height = 390000;
    } else if (selectedSpacecraftId === 'starlink') {
      target = starlinkTargetRef.current;
      height = 550000;
    } else if (selectedSpacecraftId === 'landsat') {
      target = landsatTargetRef.current;
      height = 705000;
    }

    if (!target) return;

    const targetLon = target.lng;
    const targetLat = target.lat;
    const cartesian = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, height);

    // Check if the spacecraft is already visible on screen
    let isVisible = false;
    const occluder = new (Cesium as any).EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
    const isPointVisible = occluder.isPointVisible(cartesian);
    
    if (isPointVisible) {
      const projectToWindow = Cesium.SceneTransforms.worldToWindowCoordinates || (Cesium.SceneTransforms as any).wgs84ToWindowCoordinates;
      const windowPos = projectToWindow(viewer.scene, cartesian);
      if (windowPos) {
        const canvas = viewer.scene.canvas;
        if (windowPos.x >= 0 && windowPos.x <= canvas.width &&
            windowPos.y >= 0 && windowPos.y <= canvas.height) {
          isVisible = true;
        }
      }
    }

    const currentHeight = viewer.camera.positionCartographic.height;
    
    // Smooth height adjustment
    const targetHeight = isVisible 
      ? currentHeight 
      : Math.max(7.0e6, Math.min(currentHeight, 1.2e7));

    const destination = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, targetHeight);
    const duration = isVisible ? 1.5 : 2.2;

    viewer.camera.flyTo({
      destination,
      duration,
    });

    setIsISSFocused(true);
    const timer = setTimeout(() => {
      setIsISSFocused(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [spacecraftFocusTrigger, viewer]);

  const prevSelectedFeaturedRef = useRef<string | null>(null);

  // Camera flight when a featured object is selected or deselected in Graveyard Mode
  useEffect(() => {
    if (!viewer || !isGraveyard) return;

    if (selectedFeaturedObjectId) {
      const targetObj = debrisRef.current.find(d => d.id === selectedFeaturedObjectId);
      if (targetObj) {
        lastInteractionTimeRef.current = Date.now();
        isUserInteractingRef.current = true;
        rotationFactorRef.current = 0;

        const currentTime = viewer.clock.currentTime;
        const positionCartesian = targetObj.positionProperty.getValue(currentTime);
        if (positionCartesian) {
          let isVisible = false;
          const occluder = new (Cesium as any).EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
          const isPointVisible = occluder.isPointVisible(positionCartesian);
          
          if (isPointVisible) {
            const projectToWindow = Cesium.SceneTransforms.worldToWindowCoordinates || (Cesium.SceneTransforms as any).wgs84ToWindowCoordinates;
            const windowPos = projectToWindow(viewer.scene, positionCartesian);
            if (windowPos) {
              const canvas = viewer.scene.canvas;
              if (windowPos.x >= 0 && windowPos.x <= canvas.width &&
                  windowPos.y >= 0 && windowPos.y <= canvas.height) {
                isVisible = true;
              }
            }
          }

          if (!isVisible) {
            const currentHeight = viewer.camera.positionCartographic.height;
            const cartographic = Cesium.Cartographic.fromCartesian(positionCartesian);
            const targetLon = Cesium.Math.toDegrees(cartographic.longitude);
            const targetLat = Cesium.Math.toDegrees(cartographic.latitude);
            const destination = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, currentHeight);

            viewer.camera.flyTo({
              destination,
              duration: 2.0,
            });
          }
        }
      }
    } else if (prevSelectedFeaturedRef.current !== null && isGraveyard) {
      const currentTime = viewer.clock.currentTime;
      let lon = -45;
      let lat = 20;

      try {
        if ((Cesium as any).Simon1994PlanetaryPositions) {
          const sunPos = (Cesium as any).Simon1994PlanetaryPositions.computeSunPositionInEarthFixed(currentTime);
          if (Cesium.defined(sunPos)) {
            const nightPos = Cesium.Cartesian3.negate(sunPos, new Cesium.Cartesian3());
            const nightCarto = Cesium.Cartographic.fromCartesian(nightPos);
            if (nightCarto) {
              lon = Cesium.Math.toDegrees(nightCarto.longitude);
              lat = Cesium.Math.toDegrees(nightCarto.latitude);
            }
          }
        }
      } catch (e) {}

      lastInteractionTimeRef.current = Date.now();
      isUserInteractingRef.current = true;
      rotationFactorRef.current = 0;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1.8e7),
        duration: 2.0,
      });
    }

    prevSelectedFeaturedRef.current = selectedFeaturedObjectId ?? null;
  }, [viewer, selectedFeaturedObjectId, isGraveyard]);

  // Continuously resize Cesium viewer canvas during layout width transition (1.2 seconds)
  useEffect(() => {
    if (!viewer) return;

    let startTime = Date.now();
    let frameId: number;

    const resizeLoop = () => {
      viewer.resize();
      if (Date.now() - startTime < 1300) {
        frameId = requestAnimationFrame(resizeLoop);
      }
    };

    frameId = requestAnimationFrame(resizeLoop);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [viewer, targetLocation, selectedFeaturedObjectId]);

  // Dynamically update globe settings when entering/exiting Graveyard Mode
  useEffect(() => {
    if (!viewer) return;

    const scene = viewer.scene;

    const applySettings = (layer: Cesium.ImageryLayer) => {
      if (isGraveyard) {
        layer.brightness = 0.65;
        layer.contrast = 1.35;
        layer.saturation = 0.75;
        layer.gamma = 1.2;
      } else {
        layer.brightness = 1.0;
        layer.contrast = 1.15;
        layer.saturation = 1.1;
        layer.gamma = 1.6;
      }
    };

    // Apply settings to all active imagery layers
    for (let i = 0; i < viewer.imageryLayers.length; i++) {
      applySettings(viewer.imageryLayers.get(i));
    }

    // Configure atmospheric scattering and hue/saturation/brightness shifts
    // to transform the standard blue glow to deep red/crimson.
    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.hueShift = isGraveyard ? -0.65 : 0.0;
      scene.skyAtmosphere.saturationShift = isGraveyard ? 0.3 : 0.0;
      scene.skyAtmosphere.brightnessShift = isGraveyard ? -0.15 : 0.0;
    }

    scene.globe.atmosphereHueShift = isGraveyard ? -0.65 : 0.0;
    scene.globe.atmosphereSaturationShift = isGraveyard ? 0.3 : 0.0;
    scene.globe.atmosphereBrightnessShift = isGraveyard ? -0.15 : 0.0;

    // Disabling dynamic atmosphere lighting in Graveyard Mode enables the atmospheric rim
    // glow to render uniformly around the entire circumference silhouette of the Earth.
    scene.globe.dynamicAtmosphereLighting = !isGraveyard;
    scene.globe.dynamicAtmosphereLightingFromSun = !isGraveyard;

    try {
      if ((scene as any).atmosphere) {
        (scene as any).atmosphere.dynamicLighting = isGraveyard 
          ? (Cesium as any).DynamicAtmosphereLightingType.NONE 
          : (Cesium as any).DynamicAtmosphereLightingType.SUNLIGHT;
      }
    } catch (e) {
      console.warn("Unified atmosphere lighting configuration skipped:", e);
    }

    // Handle camera flight to night side antipode or back to default Zenith view
    if (isGraveyard) {
      wasGraveyardRef.current = true;
      const currentTime = viewer.clock.currentTime;
      let lon = -45;
      let lat = 20;

      try {
        if ((Cesium as any).Simon1994PlanetaryPositions) {
          const sunPos = (Cesium as any).Simon1994PlanetaryPositions.computeSunPositionInEarthFixed(currentTime);
          if (Cesium.defined(sunPos)) {
            // Antipode point is opposite of the sun position vector (facing midnight/dark side center)
            const nightPos = Cesium.Cartesian3.negate(sunPos, new Cesium.Cartesian3());
            const nightCarto = Cesium.Cartographic.fromCartesian(nightPos);
            if (nightCarto) {
              lon = Cesium.Math.toDegrees(nightCarto.longitude);
              lat = Cesium.Math.toDegrees(nightCarto.latitude);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to compute precise sun positions:", e);
      }

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1.8e7),
        duration: 2.0,
      });
    } else if (wasGraveyardRef.current) {
      wasGraveyardRef.current = false;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-45, 20, 1.65e7),
        duration: 2.0,
      });
    }
  }, [viewer, isGraveyard]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden', 
      background: 'transparent' 
    }}>
      {/* Transparent Viewer positioned above the background star layer */}
      <div 
        className={`globe-viewer-wrapper ${targetLocation ? "has-target" : ""} ${isGraveyard ? "in-graveyard" : ""} ${selectedFeaturedObjectId ? "has-featured" : ""}`}
        style={{ 
          opacity: (active && isGlobeReady) ? 1 : 0,
        }}
      >
        <Viewer
          ref={viewerRef}
          full
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          contextOptions={CONTEXT_OPTIONS}
          {...{ imageryProvider: false } as any}
          skyBox={false}
          timeline={false}
          animation={false}
          baseLayerPicker={false}
          homeButton={false}
          navigationHelpButton={false}
          sceneModePicker={false}
          geocoder={false}
          fullscreenButton={false}
          selectionIndicator={false}
          infoBox={false}
        >
          {imageryProvider && <ImageryLayer imageryProvider={imageryProvider} />}

          {/* Orbital Debris Layer (glowing red points, orange rockets, gray satellites) in Graveyard Mode */}
          {isGraveyard && debris.map((d) => {
            if (d.category === 'debris') {
              return (
                <Entity
                  key={d.id}
                  id={d.id}
                  position={d.positionProperty as any}
                >
                  <PointGraphics
                    color={Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.85)}
                    pixelSize={2.5}
                    outlineColor={Cesium.Color.fromCssColorString('#991b1b').withAlpha(0.3)}
                    outlineWidth={4}
                  />
                </Entity>
              );
            } else if (d.category === 'rocketBody') {
              return rocketMarkerImage ? (
                <Entity
                  key={d.id}
                  id={d.id}
                  position={d.positionProperty as any}
                >
                  <BillboardGraphics
                    image={rocketMarkerImage}
                    width={36}
                    height={36}
                  />
                </Entity>
              ) : null;
            } else if (d.category === 'inactiveSatellite') {
              return inactiveSatelliteMarkerImage ? (
                <Entity
                  key={d.id}
                  id={d.id}
                  position={d.positionProperty as any}
                >
                  <BillboardGraphics
                    image={inactiveSatelliteMarkerImage}
                    width={45}
                    height={45}
                  />
                </Entity>
              ) : null;
            } else if (d.category === 'featured') {
              const isSelected = selectedFeaturedObjectId === d.id;
              return featuredMarkerImage ? (
                <Entity
                  key={d.id}
                  id={d.id}
                  position={d.positionProperty as any}
                >
                  <BillboardGraphics
                    image={featuredMarkerImage}
                    scale={isSelected ? 1.25 : (featuredScaleRef.current as any)}
                    color={isSelected ? Cesium.Color.WHITE : (featuredColorRef.current as any)}
                    width={50}
                    height={50}
                  />
                </Entity>
              ) : null;
            }
            return null;
          })}
          
          {/* Live Focused Marker - Focused backing glow / targeting reticle */}
          {!isGraveyard && selectedSpacecraftId && focusBasePositionProperty.current && isISSFocused && issFocusBaseImage && (
            <Entity
              id="spacecraft-focus-base"
              name="Spacecraft Focus Base"
              position={focusBasePositionProperty.current as any}
            >
              <BillboardGraphics
                image={issFocusBaseImage}
                scale={0.9}
                color={
                  selectedSpacecraftId === 'tiangong' 
                    ? Cesium.Color.fromCssColorString('#fbbf24') 
                    : selectedSpacecraftId === 'hubble'
                    ? Cesium.Color.fromCssColorString('#38bdf8')
                    : Cesium.Color.fromCssColorString('#c084fc')
                }
                width={80}
                height={80}
              />
            </Entity>
          )}

          {/* Live Focused Marker - Focused pulse outer ring */}
          {!isGraveyard && selectedSpacecraftId && focusPulsePositionProperty.current && isISSFocused && issFocusPulseImage && issFocusPulseScaleRef.current && issFocusPulseColorRef.current && (
            <Entity
              id="spacecraft-focus-pulse"
              name="Spacecraft Focus Pulse"
              position={focusPulsePositionProperty.current as any}
            >
              <BillboardGraphics
                image={issFocusPulseImage}
                scale={issFocusPulseScaleRef.current as any}
                color={issFocusPulseColorRef.current as any}
                width={100}
                height={100}
              />
            </Entity>
          )}

          {/* Live ISS Marker - Main Marker */}
          {!isGraveyard && issData?.latitude !== null && issData?.longitude !== null && issPositionProperty.current && issMarkerImage && (
            <Entity
              id="iss-entity"
              name="ISS"
              position={issPositionProperty.current as any}
            >
              <BillboardGraphics
                image={issMarkerImage}
                scale={issScaleRef.current as any}
                color={issColorRef.current as any}
                width={72}
                height={72}
              />
            </Entity>
          )}

          {/* Hubble Marker */}
          {!isGraveyard && hubbleData?.latitude !== null && hubbleData?.longitude !== null && hubblePositionProperty.current && hubbleMarkerImage && (
            <Entity
              id="hubble-entity"
              name="Hubble"
              position={hubblePositionProperty.current as any}
            >
              <BillboardGraphics
                image={hubbleMarkerImage}
                scale={hubbleScaleRef.current as any}
                color={issColorRef.current as any}
                width={72}
                height={72}
              />
            </Entity>
          )}

          {/* Tiangong Marker */}
          {!isGraveyard && tiangongData?.latitude !== null && tiangongData?.longitude !== null && tiangongPositionProperty.current && tiangongMarkerImage && (
            <Entity
              id="tiangong-entity"
              name="Tiangong"
              position={tiangongPositionProperty.current as any}
            >
              <BillboardGraphics
                image={tiangongMarkerImage}
                scale={tiangongScaleRef.current as any}
                color={issColorRef.current as any}
                width={72}
                height={72}
              />
            </Entity>
          )}

          {/* Starlink Marker */}
          {!isGraveyard && starlinkData?.latitude !== null && starlinkData?.longitude !== null && starlinkPositionProperty.current && starlinkMarkerImage && (
            <Entity
              id="starlink-entity"
              name="Starlink"
              position={starlinkPositionProperty.current as any}
            >
              <BillboardGraphics
                image={starlinkMarkerImage}
                scale={starlinkScaleRef.current as any}
                color={issColorRef.current as any}
                width={72}
                height={72}
              />
            </Entity>
          )}

          {/* Landsat Marker */}
          {!isGraveyard && landsatData?.latitude !== null && landsatData?.longitude !== null && landsatPositionProperty.current && landsatMarkerImage && (
            <Entity
              id="landsat-entity"
              name="Landsat"
              position={landsatPositionProperty.current as any}
            >
              <BillboardGraphics
                image={landsatMarkerImage}
                scale={landsatScaleRef.current as any}
                color={issColorRef.current as any}
                width={72}
                height={72}
              />
            </Entity>
          )}

          {!isGraveyard && targetLocation && baseMarkerImage && pulseMarkerImage && (
            <Entity
              position={Cesium.Cartesian3.fromDegrees(targetLocation.lng ?? (targetLocation as any).lon ?? 0, targetLocation.lat)}
              name="Target Location"
            >
              {/* Pulsing ring billboard */}
              <BillboardGraphics
                image={pulseMarkerImage}
                scale={pulseScaleRef.current as any}
                color={pulseColorRef.current as any}
                width={128}
                height={128}
              />
              {/* Fixed target center & glow billboard */}
              <BillboardGraphics
                image={baseMarkerImage}
                scale={baseScaleRef.current as any}
                color={baseColorRef.current as any}
                width={128}
                height={128}
              />
              {/* Volumetric vertical light beacon */}
              <CylinderGraphics
                length={2000000.0} // 2000 km length (extends 1000 km above surface, 1000 km clipped inside Earth)
                topRadius={12000.0} // 12 km radius
                bottomRadius={12000.0}
                material={new Cesium.ColorMaterialProperty(
                  new Cesium.CallbackProperty(() => {
                    const t = (Date.now() % 3000) / 3000 * Math.PI * 2;
                    const alpha = 0.07 + 0.03 * Math.sin(t); // Gentle breathing opacity
                    return Cesium.Color.fromCssColorString('#05ffc3').withAlpha(alpha);
                  }, false)
                )}
                outline={false}
              />
            </Entity>
          )}
        </Viewer>
      </div>

      {/* Hover Tooltip Overlay */}
      {!isGraveyard && hoveredEntity && (
        <div 
          className={`fixed z-[100] pointer-events-none bg-slate-950/85 border text-white rounded-lg p-2.5 backdrop-blur-md font-outfit ${
            hoveredEntity === 'tiangong' 
              ? 'border-amber-500/35 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(251,191,36,0.18)]' 
              : hoveredEntity === 'hubble'
              ? 'border-sky-500/35 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(56,189,248,0.18)]'
              : hoveredEntity === 'starlink'
              ? 'border-pink-500/35 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(236,72,153,0.18)]'
              : hoveredEntity === 'landsat'
              ? 'border-emerald-500/35 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(16,185,129,0.18)]'
              : 'border-[#c084fc]/35 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(192,132,252,0.18)]'
          }`}
          style={{
            left: `${mousePos.x + 15}px`,
            top: `${mousePos.y + 15}px`,
          }}
        >
          <div className={`text-[10px] font-semibold font-orbitron tracking-wider ${
            hoveredEntity === 'tiangong' 
              ? 'text-amber-400' 
              : hoveredEntity === 'hubble'
              ? 'text-sky-400'
              : hoveredEntity === 'starlink'
              ? 'text-pink-400'
              : hoveredEntity === 'landsat'
              ? 'text-emerald-400'
              : 'text-[#c084fc]'
          }`}>
            {hoveredEntity === 'tiangong' 
              ? 'TIANGONG' 
              : hoveredEntity === 'hubble' 
              ? 'HUBBLE' 
              : hoveredEntity === 'starlink'
              ? 'STARLINK'
              : hoveredEntity === 'landsat'
              ? 'LANDSAT 9'
              : 'ISS'}
          </div>
          <div className="text-[9px] text-slate-300">
            {hoveredEntity === 'tiangong' 
              ? 'Tiangong Space Station' 
              : hoveredEntity === 'hubble'
              ? 'Hubble Space Telescope'
              : hoveredEntity === 'starlink'
              ? 'Starlink Satellite'
              : hoveredEntity === 'landsat'
              ? 'Landsat 9 Satellite'
              : 'International Space Station'}
          </div>
        </div>
      )}

      {/* Detail click popup overlay */}
      {!isGraveyard && popupEntity && (
        <div 
          className={`fixed left-1/2 bottom-12 md:bottom-16 -translate-x-1/2 z-[100] w-[240px] md:w-[260px] bg-slate-950/90 border text-white rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-md font-outfit animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            popupEntity === 'tiangong' 
              ? 'border-amber-500/45 shadow-[0_0_24px_rgba(251,191,36,0.25)]' 
              : popupEntity === 'hubble'
              ? 'border-sky-500/45 shadow-[0_0_24px_rgba(56,189,248,0.25)]'
              : popupEntity === 'starlink'
              ? 'border-pink-500/45 shadow-[0_0_24px_rgba(236,72,153,0.25)]'
              : popupEntity === 'landsat'
              ? 'border-emerald-500/45 shadow-[0_0_24px_rgba(16,185,129,0.25)]'
              : 'border-[#c084fc]/45 shadow-[0_0_24px_rgba(192,132,252,0.25)]'
          }`}
        >
          <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2.5">
            <h4 className={`text-[11px] font-bold font-orbitron tracking-wider uppercase ${
              popupEntity === 'tiangong' 
                ? 'text-amber-400' 
                : popupEntity === 'hubble'
                ? 'text-sky-400'
                : popupEntity === 'starlink'
                ? 'text-pink-400'
                : popupEntity === 'landsat'
                ? 'text-emerald-400'
                : 'text-[#c084fc]'
            }`}>
              {popupEntity === 'tiangong' 
                ? 'Tiangong Telemetry' 
                : popupEntity === 'hubble'
                ? 'Hubble Telemetry'
                : popupEntity === 'starlink'
                ? 'Starlink Telemetry'
                : popupEntity === 'landsat'
                ? 'Landsat 9 Telemetry'
                : 'ISS Telemetry'}
            </h4>
            <button 
              onClick={() => setPopupEntity(null)}
              className="text-slate-400 hover:text-white border-none bg-transparent cursor-pointer text-xs transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5 text-[10px]">
            {(() => {
              const sc = spacecrafts.find(s => s.id === popupEntity);
              return (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Latitude</span>
                    <span className="font-mono text-slate-300">
                      {sc?.latitude !== null && sc?.latitude !== undefined ? `${sc.latitude.toFixed(4)}°` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Longitude</span>
                    <span className="font-mono text-slate-300">
                      {sc?.longitude !== null && sc?.longitude !== undefined ? `${sc.longitude.toFixed(4)}°` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Altitude</span>
                    <span className="font-mono text-slate-300">
                      {sc?.altitude !== null && sc?.altitude !== undefined ? `${sc.altitude.toFixed(1)} km` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                    <span className="text-slate-500 font-medium">Last Updated</span>
                    <span className="font-mono text-slate-300">
                      {sc?.timestamp !== null && sc?.timestamp !== undefined ? new Date(sc.timestamp * 1000).toLocaleTimeString() : "N/A"}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Floating Spacecraft label when focused */}
      <div 
        ref={issLabelRef}
        className={`fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-950/85 border text-white rounded-lg px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md font-outfit text-center transition-all duration-300 ${
          selectedSpacecraftId === 'tiangong' 
            ? 'border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.25)]' 
            : selectedSpacecraftId === 'hubble'
            ? 'border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
            : selectedSpacecraftId === 'starlink'
            ? 'border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.25)]'
            : selectedSpacecraftId === 'landsat'
            ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
            : 'border-[#c084fc]/50 shadow-[0_0_12px_rgba(192,132,252,0.25)]'
        }`}
        style={{ display: 'none', position: 'fixed' }}
      >
        <div className={`text-[10px] font-bold font-orbitron tracking-wider leading-none mb-1 ${
          selectedSpacecraftId === 'tiangong' 
            ? 'text-amber-400' 
            : selectedSpacecraftId === 'hubble'
            ? 'text-sky-400'
            : selectedSpacecraftId === 'starlink'
            ? 'text-pink-400'
            : selectedSpacecraftId === 'landsat'
            ? 'text-emerald-400'
            : 'text-[#c084fc]'
        }`}>
          {selectedSpacecraftId === 'tiangong' 
            ? 'CSS' 
            : selectedSpacecraftId === 'hubble'
            ? 'HST'
            : selectedSpacecraftId === 'starlink'
            ? 'SL-1209'
            : selectedSpacecraftId === 'landsat'
            ? 'LDST9'
            : 'ISS'}
        </div>
        <div className="text-[8px] text-slate-300 uppercase tracking-widest font-semibold whitespace-nowrap">
          {selectedSpacecraftId === 'tiangong' 
            ? 'Tiangong Space Station' 
            : selectedSpacecraftId === 'hubble'
            ? 'Hubble Space Telescope'
            : selectedSpacecraftId === 'starlink'
            ? 'Starlink Satellite'
            : selectedSpacecraftId === 'landsat'
            ? 'Landsat 9 Satellite'
            : 'International Space Station'}
        </div>
      </div>
    </div>
  );
}
