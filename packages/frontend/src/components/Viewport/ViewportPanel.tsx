import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store';
import { SceneLighting } from './SceneLighting';
import { CADModel } from './CADModel';
import { PartLabels } from './PartLabels';
import { PartsPanel } from './PartsPanel';
import { ViewportHelper } from './ViewportHelper';

export function ViewportPanel() {
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
        {gltfData && <CADModel data={gltfData} />}
        <PartLabels />
        <ViewportHelper />
      </Canvas>
      <PartsPanel />
    </div>
  );
}
