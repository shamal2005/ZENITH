import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Viewer, ImageryLayer } from 'resium';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? '';

// Pre-allocated scratch variables for frame rotation logic to avoid GC overhead
const scratchMatrix = new Cesium.Matrix3();
const scratchPosition = new Cesium.Cartesian3();
const scratchDirection = new Cesium.Cartesian3();
const scratchUp = new Cesium.Cartesian3();

export default function GlobeView() {
  const [imageryProvider, setImageryProvider] = useState<any>(null);
  const lastInteractionTimeRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  // Track user interaction to pause/resume auto-rotation
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTimeRef.current = Date.now();
    };

    window.addEventListener('mousedown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('wheel', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
    };
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleReady = (instance: { viewer: Cesium.Viewer }) => {
    // Clean up any existing listener first
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const viewer = instance.viewer;
    const scene = viewer.scene;

    // Configure scene properties for lighting and atmosphere
    scene.globe.enableLighting = true;
    if (scene.skyAtmosphere) {
      scene.skyAtmosphere.show = true;
    }
    scene.globe.showGroundAtmosphere = true;
    if (scene.skyBox) {
      scene.skyBox.show = true;
    }
    scene.backgroundColor = Cesium.Color.BLACK;

    // Set initial camera view focused on Earth
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-45, 20, 2.2e7),
    });

    let lastTime = performance.now();

    // Auto-rotation around Earth's Z axis
    const removeListener = scene.postRender.addEventListener(() => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const timeSinceInteraction = Date.now() - lastInteractionTimeRef.current;

      // Smooth resume rotation after 5 seconds of inactivity
      let speedFactor = 0;
      if (timeSinceInteraction > 5000) {
        const rampUpTime = 2000; // 2 seconds to ramp back up to full speed
        const timeInRamp = timeSinceInteraction - 5000;
        speedFactor = Math.min(1, timeInRamp / rampUpTime);
      }

      if (speedFactor > 0) {
        // 1 full rotation (2 * PI rad) per 3 minutes (180 seconds)
        const baseSpeed = (2 * Math.PI) / 180;
        const angle = baseSpeed * speedFactor * delta;

        // Revolve the camera's position, direction, and up vectors around the Z axis
        const matrix = Cesium.Matrix3.fromRotationZ(angle, scratchMatrix);
        viewer.camera.position = Cesium.Matrix3.multiplyByVector(matrix, viewer.camera.position, scratchPosition);
        viewer.camera.direction = Cesium.Matrix3.multiplyByVector(matrix, viewer.camera.direction, scratchDirection);
        viewer.camera.up = Cesium.Matrix3.multiplyByVector(matrix, viewer.camera.up, scratchUp);
      }
    });

    cleanupRef.current = () => {
      removeListener();
    };
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000000' }}>
      <Viewer
        full
        style={{ width: '100%', height: '100%' }}
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
        onReady={handleReady}
      >
        {imageryProvider && <ImageryLayer imageryProvider={imageryProvider} />}
      </Viewer>
    </div>
  );
}
