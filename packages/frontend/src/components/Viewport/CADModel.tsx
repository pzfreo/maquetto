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
        console.log(`[Viewport] glTF loaded (${gltf.scene.children.length} objects)`);
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
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const partMeta = parts.find((p) => p.id === child.name);
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
        let mesh = intersects[0]!.object;
        // Walk up to find named mesh
        while (mesh && !mesh.name.startsWith('@')) {
          mesh = mesh.parent as THREE.Object3D;
        }
        if (mesh?.name) {
          if (event.shiftKey) {
            togglePartSelection(mesh.name);
          } else {
            setSelectedPartIds([mesh.name]);
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
