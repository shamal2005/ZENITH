import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Viewer, ImageryLayer, Entity, BillboardGraphics, CylinderGraphics } from 'resium';

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
}

export default function GlobeView({ active = false, targetLocation = null, onSelectLocation }: GlobeViewProps) {
  const [imageryProvider, setImageryProvider] = useState<any>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const lastInteractionTimeRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);
  const rotationFactorRef = useRef<number>(1.0);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

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
    }
  }, []);

  // Native Cesium properties for smooth animation loop (avoiding React state re-renders)
  const baseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const baseColorRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseScaleRef = useRef<Cesium.CallbackProperty | null>(null);
  const pulseColorRef = useRef<Cesium.CallbackProperty | null>(null);

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
      if (viewer && onSelectLocationRef.current) {
        const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
        if (cartesian) {
          viewer.scene.canvas.classList.add('globe-hover-pointer');
        } else {
          viewer.scene.canvas.classList.remove('globe-hover-pointer');
        }
      } else if (viewer) {
        viewer.scene.canvas.classList.remove('globe-hover-pointer');
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Left click selects coordinates on the globe (only if onSelectLocation callback is active)
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      if (!viewer || !onSelectLocationRef.current) return;
      const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        onSelectLocationRef.current({ lat, lng: lon });
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
        className="globe-viewer-wrapper" 
        style={{ 
          opacity: (active && isGlobeReady) ? 1 : 0,
          transition: 'opacity 1.0s cubic-bezier(0.25, 1, 0.5, 1)'
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
    </div>
  );
}
