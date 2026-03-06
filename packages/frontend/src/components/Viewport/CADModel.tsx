import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useThree, useFrame } from '@react-three/fiber';
import { useAppStore } from '../../store';

interface CADModelProps {
  data: ArrayBuffer;
}

export function CADModel({ data }: CADModelProps) {
  const parts = useAppStore((s) => s.parts);
  const togglePartSelection = useAppStore((s) => s.togglePartSelection);
  const setSelectedPartIds = useAppStore((s) => s.setSelectedPartIds);

  const [scene, setScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const { camera, raycaster, pointer, invalidate } = useThree();

  // Load glTF from ArrayBuffer
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.parse(
      data,
      '',
      (gltf) => {
        // Build123d's export_gltf converts mm to meters (per glTF spec).
        // Scale back to mm so geometry matches our camera/grid/labels.
        gltf.scene.scale.setScalar(1000);

        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log(`[Viewport] glTF loaded: ${meshCount} meshes, size=(${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)})`);
        setScene(gltf.scene);
      },
      (error) => {
        console.error('[Viewport] glTF parse error:', error);
      },
    );

    return () => {
      setScene(null);
      meshMapRef.current.clear();
    };
  }, [data]);

  // Map meshes to parts by traversal order and apply materials.
  // Build123d's export_gltf names meshes "COMPOUND", "COMPOUND_1" etc.,
  // so we match by index order instead.
  useEffect(() => {
    if (!scene) return;

    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    if (meshes.length !== parts.length && parts.length > 0) {
      console.warn(
        `[Viewport] Mesh count (${meshes.length}) != part count (${parts.length}). ` +
        `Color/selection mapping may be incorrect.`,
      );
    }

    const newMap = new Map<string, THREE.Mesh>();

    meshes.forEach((mesh, index) => {
      const partMeta = parts[index];
      if (!partMeta) return;

      // Store part ID on mesh for click detection
      mesh.userData.partId = partMeta.id;
      newMap.set(partMeta.id, mesh);

      // Apply material with part color
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...partMeta.color),
        metalness: 0.1,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
    });

    meshMapRef.current = newMap;
    invalidate();
  }, [scene, parts, invalidate]);

  // Apply visibility and selection every frame.
  // Read directly from Zustand store to avoid stale closure issues in R3F's render loop.
  useFrame(() => {
    const map = meshMapRef.current;
    if (map.size === 0) return;

    const { hiddenPartIds, selectedPartIds } = useAppStore.getState();

    for (const [partId, mesh] of map) {
      mesh.visible = !hiddenPartIds.includes(partId);

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedPartIds.includes(partId)) {
        mat.emissive.setRGB(0.15, 0.15, 0.15);
      } else {
        mat.emissive.setRGB(0, 0, 0);
      }
    }
  });

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
        const partId = hitMesh.userData.partId as string | undefined;
        const partMeta = partId
          ? parts.find((p) => p.id === partId)
          : undefined;

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
    parts,
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
