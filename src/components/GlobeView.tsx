import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Viewer, ImageryLayer } from 'resium';

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
}

export default function GlobeView({ active = false }: GlobeViewProps) {
  const [imageryProvider, setImageryProvider] = useState<any>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const lastInteractionTimeRef = useRef<number>(0);
  const isUserInteractingRef = useRef<boolean>(false);
  const rotationFactorRef = useRef<number>(1.0);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

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
      destination: Cesium.Cartesian3.fromDegrees(-45, 20, 3.2e7),
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

    // Mouse movement updates interaction timestamp when dragging
    handler.setInputAction(() => {
      if (isMouseDown) {
        lastInteractionTimeRef.current = Date.now();
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

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
      destination: Cesium.Cartesian3.fromDegrees(-45, 20, 2.2e7),
      duration: 1.8, // Faster, snappier camera flight
    });
  }, [viewer, active]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden', 
      background: 'transparent' 
    }}>
      {/* Transparent Viewer positioned above the background star layer */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 1,
        opacity: (active && isGlobeReady) ? 1 : 0,
        transition: 'opacity 1.0s cubic-bezier(0.25, 1, 0.5, 1)'
      }}>
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
        </Viewer>
      </div>
    </div>
  );
}
