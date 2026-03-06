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
  const hiddenPartIds = useAppStore((s) => s.hiddenPartIds);
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
    };
  }, [data]);

  // Apply per-part materials, selection highlighting, and visibility.
  // Match meshes to parts by traversal order index (build123d's export_gltf
  // names meshes "COMPOUND", "COMPOUND_1" etc., not our part IDs).
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

    meshes.forEach((mesh, index) => {
      const partMeta = parts[index];
      if (!partMeta) return;

      // Store part ID on mesh for click detection
      mesh.userData.partId = partMeta.id;

      // Visibility
      mesh.visible = !hiddenPartIds.includes(partMeta.id);

      // Material
      const isSelected = selectedPartIds.includes(partMeta.id);
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...partMeta.color),
        metalness: 0.1,
        roughness: 0.6,
        emissive: isSelected
          ? new THREE.Color(0.15, 0.15, 0.15)
          : new THREE.Color(0, 0, 0),
        side: THREE.DoubleSide,
      });
    });
  }, [scene, parts, selectedPartIds, hiddenPartIds]);

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
        // Look up the part ID stashed on the mesh during material assignment
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
