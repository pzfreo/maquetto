import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store';

interface CADModelProps {
  data: ArrayBuffer;
}

export function CADModel({ data }: CADModelProps) {
  const parts = useAppStore((s) => s.parts);
  const selectedPartIds = useAppStore((s) => s.selectedPartIds);
  const togglePartSelection = useAppStore((s) => s.togglePartSelection);
  const setSelectedPartIds = useAppStore((s) => s.setSelectedPartIds);

  const [scene, setScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, raycaster, pointer } = useThree();

  // Load glTF from ArrayBuffer
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.parse(
      data,
      '',
      (gltf) => {
        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
            const geo = child.geometry;
            const pos = geo?.attributes?.position;
            const idx = geo?.index;
            console.log(`[Viewport] Mesh: name="${child.name}", vertices=${pos?.count ?? 0}, indexed=${!!idx}, indices=${idx?.count ?? 0}`);
            // Dump first vertex position to check coordinates
            if (pos && pos.count > 0) {
              console.log(`[Viewport]   vertex[0] = (${pos.getX(0).toFixed(4)}, ${pos.getY(0).toFixed(4)}, ${pos.getZ(0).toFixed(4)})`);
            }
            // Log mesh world transform
            child.updateWorldMatrix(true, false);
            const wp = new THREE.Vector3();
            child.getWorldPosition(wp);
            const ws = new THREE.Vector3();
            child.getWorldScale(ws);
            console.log(`[Viewport]   worldPos=(${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)}) worldScale=(${ws.x.toFixed(3)}, ${ws.y.toFixed(3)}, ${ws.z.toFixed(3)})`);
          }
        });
        // Log actual geometry bounds to detect scale issues
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log(`[Viewport] glTF loaded: ${gltf.scene.children.length} children, ${meshCount} meshes`);
        console.log(`[Viewport] Scene bounds: min=(${box.min.x.toFixed(3)}, ${box.min.y.toFixed(3)}, ${box.min.z.toFixed(3)}) max=(${box.max.x.toFixed(3)}, ${box.max.y.toFixed(3)}, ${box.max.z.toFixed(3)}) size=(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);
        setScene(gltf.scene);
      },
      (error) => {
        console.error('[Viewport] glTF parse error:', error);
      },
    );

    return () => {
      setScene(null);
    };
  }, [data]);

  // Apply per-part materials and selection highlighting
  // Build123d's export_gltf names meshes "COMPOUND", "COMPOUND_1", etc.
  // rather than our part IDs ("@1", "@2"), so we match by fallback.
  useEffect(() => {
    if (!scene) return;

    // Default to first part's color for all unmatched meshes
    const defaultPart = parts[0];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const partMeta = parts.find((p) => p.id === child.name) ?? defaultPart;
        if (partMeta) {
          const isSelected = selectedPartIds.includes(partMeta.id);
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(...partMeta.color),
            metalness: 0.1,
            roughness: 0.6,
            emissive: isSelected
              ? new THREE.Color(0.15, 0.15, 0.15)
              : new THREE.Color(0, 0, 0),
            side: THREE.DoubleSide,
          });
        }
      }
    });
  }, [scene, parts, selectedPartIds]);

  // Click handler for part selection
  useEffect(() => {
    if (!scene || !groupRef.current) return;

    const handleClick = (event: MouseEvent) => {
      const canvas = event.target as HTMLCanvasElement;
      if (canvas.tagName !== 'CANVAS') return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        groupRef.current!.children,
        true,
      );

      if (intersects.length > 0) {
        const hitMesh = intersects[0]!.object;
        // Find which part this mesh belongs to by matching name or defaulting to first part
        const partMeta = parts.find((p) => p.id === hitMesh.name) ?? parts[0];
        if (partMeta) {
          if (event.shiftKey) {
            togglePartSelection(partMeta.id);
          } else {
            setSelectedPartIds([partMeta.id]);
          }
        }
      } else if (!event.shiftKey) {
        setSelectedPartIds([]);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [
    scene,
    camera,
    raycaster,
    pointer,
    togglePartSelection,
    setSelectedPartIds,
  ]);

  if (!scene) return null;

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
