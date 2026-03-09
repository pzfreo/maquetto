import { useEffect, useCallback, memo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Grid, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store';
import { SceneLighting } from './SceneLighting';
import { CADModel } from './CADModel';
import { PartLabels } from './PartLabels';
import { PartsPanel } from './PartsPanel';
import { ViewportHelper } from './ViewportHelper';
import { LogoModel } from './LogoModel';

/** Registers a screenshot capture function with the store so other layers can use it. */
function ScreenshotRegistrar() {
  const gl = useThree((s) => s.gl);
  const capture = useCallback((): string | null => {
    try {
      return gl.domElement.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [gl]);

  useEffect(() => {
    useAppStore.getState().setCaptureScreenshot(capture);
    return () => useAppStore.getState().setCaptureScreenshot(null);
  }, [capture]);

  return null;
}

/**
 * Loading text overlay — separate component so its re-renders from
 * engine status updates don't touch ViewportPanel or the Canvas.
 */
function LoadingOverlay() {
  const gltfData = useAppStore((s) => s.gltfData);
  const phase = useAppStore((s) => s.engineStatus.phase);
  const progress = useAppStore((s) => s.engineStatus.progress);

  if (gltfData) return null;
  if (phase === 'ready') return null;

  const label = phase === 'error'
    ? 'Engine failed to load'
    : `Loading${progress > 0 ? ` (${progress}%)` : '...'}`;

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#8888aa',
      fontSize: '14px',
      fontFamily: 'system-ui, sans-serif',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      {label}
    </div>
  );
}

export const ViewportPanel = memo(function ViewportPanel() {
  const gltfData = useAppStore((s) => s.gltfData);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [80, 60, 80], fov: 50, near: 0.1, far: 2000 }}
      >
        <ScreenshotRegistrar />
        <SceneLighting />
        <Environment preset="apartment" />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        <Grid
          infiniteGrid
          cellSize={10}
          sectionSize={50}
          fadeDistance={400}
          fadeStrength={1}
          cellColor="#333355"
          sectionColor="#444466"
        />
        {gltfData ? <CADModel data={gltfData} /> : <LogoModel />}
        <PartLabels />
        <ViewportHelper />
        <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
          <GizmoViewcube
            faces={['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']}
            color="#2a2a40"
            textColor="#ccccdd"
            hoverColor="#4455cc"
            strokeColor="#444466"
            opacity={0.9}
          />
        </GizmoHelper>
      </Canvas>
      <LoadingOverlay />
      <PartsPanel />
    </div>
  );
});
