import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Viewer, ImageryLayer, Entity, BillboardGraphics, CylinderGraphics } from 'resium';
import { useISSData } from '../hooks/useISSData';

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
  issFocusTrigger?: number;
}

export default function GlobeView({ active = false, targetLocation = null, onSelectLocation, issFocusTrigger = 0 }: GlobeViewProps) {
  const { latitude: issLat, longitude: issLng, timestamp: issTimestamp } = useISSData();
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
    }
  }, []);

  // Native Cesium properties for smooth animation loop (avoiding React state re-renders)
  const baseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const baseColorRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseColorRef = useRef<Cesium.CallbackProperty | null>(null);

  // ISS Marker Properties
  const issTargetRef = useRef<{ lat: number; lng: number } | null>(null);
  const issPositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusBasePositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusPulsePositionProperty = useRef<Cesium.CallbackProperty | null>(null);
  const issScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const issColorRef = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusPulseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const issFocusPulseColorRef = useRef<Cesium.CallbackProperty | null>(null);

  // Sync latest hook telemetry values to ref
  useEffect(() => {
    if (issLat !== null && issLng !== null) {
      issTargetRef.current = { lat: issLat, lng: issLng };
    }
  }, [issLat, issLng]);

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

  if (!issPositionProperty.current && typeof window !== 'undefined') {
    let currentLat = 0;
    let currentLng = 0;
    let initialized = false;

    issPositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!issTargetRef.current) return undefined as any;
      const target = issTargetRef.current;
      if (!initialized) {
        currentLat = target.lat;
        currentLng = target.lng;
        initialized = true;
      } else {
        // Smoothly interpolate towards target
        currentLat += (target.lat - currentLat) * 0.03;
        
        let diffLng = target.lng - currentLng;
        if (diffLng > 180) diffLng -= 360;
        if (diffLng < -180) diffLng += 360;
        currentLng += diffLng * 0.03;
        
        if (currentLng > 180) currentLng -= 360;
        if (currentLng < -180) currentLng += 360;
      }

      // Positioned at ISS orbital height (~420 km)
      return Cesium.Cartesian3.fromDegrees(currentLng, currentLat, 420000);
    }, false);

    issFocusBasePositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!issTargetRef.current) return undefined as any;
      // Slightly lower (419.8 km) to avoid Z-fighting
      return Cesium.Cartesian3.fromDegrees(currentLng, currentLat, 419800);
    }, false);

    issFocusPulsePositionProperty.current = new Cesium.CallbackProperty(() => {
      if (!issTargetRef.current) return undefined as any;
      // Slightly lower (419.9 km) to avoid Z-fighting
      return Cesium.Cartesian3.fromDegrees(currentLng, currentLat, 419900);
    }, false);

    issScaleRef.current = new Cesium.CallbackProperty(() => {
      if (isISSFocusedRef.current) {
        return 1.05;
      }
      const t = (Date.now() % 4000) / 4000 * Math.PI * 2;
      return 0.75 + 0.05 * Math.sin(t); // Breathing scale
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
      return Cesium.Color.fromCssColorString('#c084fc').withAlpha(alpha);
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
    } else {
      setViewer(null);
    }
  };

  // Set up Cesium viewer settings when instance is resolved
  useEffect(() => {
    if (!viewer) return;

    const scene = viewer.scene;

    // Configure scene properties for lighting and atmosphere
    scene.globe.enableLighting = false;

    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.show = true;
    }
    scene.globe.showGroundAtmosphere = true;

    // Enable high-fidelity realistic rendering features
    viewer.resolutionScale = Math.max(window.devicePixelRatio || 1.0, 2.0); // Ensure high-resolution rendering on modern displays
    scene.globe.showWaterEffect = true; // Ocean waves and sun specular reflection on water
    scene.globe.dynamicAtmosphereLighting = false; // Disable dynamic atmosphere lighting since globe lighting is off
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
      layer.brightness = 0.85;
      layer.contrast = 1.2;
      layer.saturation = 1.1;
      layer.gamma = 1.2;
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
      
      let isHoveringISS = false;
      let isHoveringClickable = false;

      if (viewer) {
        // Track mouse position in state for tooltip
        setMousePos({ x: movement.endPosition.x, y: movement.endPosition.y });

        // Pick object under mouse
        const pickedObject = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id === 'iss-entity') {
          isHoveringISS = true;
          isHoveringClickable = true;
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

      setHoveredEntity(isHoveringISS ? 'iss' : null);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Left click selects coordinates or picks entities
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      if (!viewer) return;
      
      const pickedObject = viewer.scene.pick(movement.position);
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id === 'iss-entity') {
        // Clicked the ISS! Show the popup
        setPopupEntity('iss');
        // Pause auto rotation to let user read the info
        lastInteractionTimeRef.current = Date.now();
        isUserInteractingRef.current = true;
        rotationFactorRef.current = 0;
        return;
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

      if (isISSFocusedRef.current && issLabelRef.current && issTargetRef.current) {
        const issCartesian = Cesium.Cartesian3.fromDegrees(
          issTargetRef.current.lng,
          issTargetRef.current.lat,
          420000
        );

        const cameraPosition = viewer.camera.position;
        const occluder = new Cesium.EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, cameraPosition);
        const isVisible = occluder.isPointVisible(issCartesian);

        if (isVisible) {
          const projectToWindow = Cesium.SceneTransforms.worldToWindowCoordinates || Cesium.SceneTransforms.wgs84ToWindowCoordinates;
          const windowPos = projectToWindow(viewer.scene, issCartesian);
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
    const targetLon = targetLocation.lng ?? targetLocation.lon ?? 0;
    const targetLat = targetLocation.lat;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, currentHeight),
      duration: 1.8, // Smooth cinematic 1.8 seconds flight duration (for globe clicks/searches)
    });
  }, [viewer, targetLocation]);

  // Fly camera to focus on the ISS when issFocusTrigger changes
  useEffect(() => {
    if (issFocusTrigger === 0 || !viewer || !issTargetRef.current) return;

    // Reset interaction timer to pause auto-rotation
    lastInteractionTimeRef.current = Date.now();
    isUserInteractingRef.current = true;
    rotationFactorRef.current = 0;

    const targetLon = issTargetRef.current.lng;
    const targetLat = issTargetRef.current.lat;
    const issCartesian = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 420000);

    // Check if the ISS is already visible on screen
    let isVisible = false;
    const occluder = new Cesium.EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
    const isPointVisible = occluder.isPointVisible(issCartesian);
    
    if (isPointVisible) {
      const projectToWindow = Cesium.SceneTransforms.worldToWindowCoordinates || Cesium.SceneTransforms.wgs84ToWindowCoordinates;
      const windowPos = projectToWindow(viewer.scene, issCartesian);
      if (windowPos) {
        const canvas = viewer.scene.canvas;
        if (windowPos.x >= 0 && windowPos.x <= canvas.width &&
            windowPos.y >= 0 && windowPos.y <= canvas.height) {
          isVisible = true;
        }
      }
    }

    const currentHeight = viewer.camera.positionCartographic.height;
    
    // Smooth height adjustment: if visible, keep height. If not visible, target comfortable orbital perspective
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
  }, [issFocusTrigger, viewer]);

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
  }, [viewer, targetLocation]);

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
        className={`globe-viewer-wrapper ${targetLocation ? "has-target" : ""}`}
        style={{ 
          opacity: (active && isGlobeReady) ? 1 : 0,
        }}
      >
        <Viewer
          ref={viewerRef}
          full
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          contextOptions={CONTEXT_OPTIONS}
          imageryProvider={false}
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
          
          {/* Live ISS Marker - Focused backing glow / targeting reticle */}
          {issLat !== null && issLng !== null && issFocusBasePositionProperty.current && isISSFocused && issFocusBaseImage && (
            <Entity
              id="iss-focus-base"
              name="ISS Focus Base"
              position={issFocusBasePositionProperty.current}
            >
              <BillboardGraphics
                image={issFocusBaseImage}
                scale={0.9}
                color={Cesium.Color.WHITE}
                width={80}
                height={80}
              />
            </Entity>
          )}

          {/* Live ISS Marker - Focused pulse outer ring */}
          {issLat !== null && issLng !== null && issFocusPulsePositionProperty.current && isISSFocused && issFocusPulseImage && issFocusPulseScaleRef.current && issFocusPulseColorRef.current && (
            <Entity
              id="iss-focus-pulse"
              name="ISS Focus Pulse"
              position={issFocusPulsePositionProperty.current}
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
          {issLat !== null && issLng !== null && issPositionProperty.current && issMarkerImage && (
            <Entity
              id="iss-entity"
              name="ISS"
              position={issPositionProperty.current}
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

          {targetLocation && baseMarkerImage && pulseMarkerImage && (
            <Entity
              position={Cesium.Cartesian3.fromDegrees(targetLocation.lng ?? targetLocation.lon ?? 0, targetLocation.lat)}
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
      {hoveredEntity === 'iss' && (
        <div 
          className="fixed z-[100] pointer-events-none bg-slate-950/85 border border-[#c084fc]/35 text-white rounded-lg p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(192,132,252,0.18)] backdrop-blur-md font-outfit"
          style={{
            left: `${mousePos.x + 15}px`,
            top: `${mousePos.y + 15}px`,
          }}
        >
          <div className="text-[10px] font-semibold font-orbitron tracking-wider text-[#c084fc]">
            ISS
          </div>
          <div className="text-[9px] text-slate-300">
            International Space Station
          </div>
        </div>
      )}

      {/* Detail click popup overlay */}
      {popupEntity === 'iss' && (
        <div 
          className="fixed left-1/2 bottom-12 md:bottom-16 -translate-x-1/2 z-[100] w-[240px] md:w-[260px] bg-slate-950/90 border border-[#c084fc]/45 text-white rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.65),0_0_24px_rgba(192,132,252,0.25)] backdrop-blur-md font-outfit animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex justify-between items-center border-b border-[#c084fc]/25 pb-2 mb-2.5">
            <h4 className="text-[11px] font-bold font-orbitron tracking-wider text-[#c084fc] uppercase">
              ISS Telemetry
            </h4>
            <button 
              onClick={() => setPopupEntity(null)}
              className="text-slate-400 hover:text-white border-none bg-transparent cursor-pointer text-xs transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Latitude</span>
              <span className="font-mono text-slate-300">
                {issLat !== null ? `${issLat.toFixed(4)}°` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Longitude</span>
              <span className="font-mono text-slate-300">
                {issLng !== null ? `${issLng.toFixed(4)}°` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-[#c084fc]/15 pt-2 mt-1">
              <span className="text-slate-500 font-medium">Last Updated</span>
              <span className="font-mono text-slate-300">
                {issTimestamp !== null ? new Date(issTimestamp * 1000).toLocaleTimeString() : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating ISS label when focused */}
      <div 
        ref={issLabelRef}
        className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-950/85 border border-[#c084fc]/50 text-white rounded-lg px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(192,132,252,0.25)] backdrop-blur-md font-outfit text-center transition-all duration-300"
        style={{ display: 'none', position: 'fixed' }}
      >
        <div className="text-[10px] font-bold font-orbitron tracking-wider text-[#c084fc] leading-none mb-1">
          ISS
        </div>
        <div className="text-[8px] text-slate-300 uppercase tracking-widest font-semibold whitespace-nowrap">
          International Space Station
        </div>
      </div>
    </div>
  );
}
