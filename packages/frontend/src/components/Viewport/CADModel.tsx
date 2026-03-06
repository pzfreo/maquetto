import { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store';

interface CADModelProps {
  data: ArrayBuffer;
}

interface ExtractedMesh {
  mesh: THREE.Mesh;
  partId: string;
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

  // Extract meshes from scene and pair with part metadata.
  // Build123d's export_gltf names meshes "COMPOUND", "COMPOUND_1" etc.,
  // so we match by traversal index order.
  const extractedMeshes = useMemo<ExtractedMesh[]>(() => {
    if (!scene || parts.length === 0) return [];

    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    if (meshes.length !== parts.length) {
      console.warn(
        `[Viewport] Mesh count (${meshes.length}) != part count (${parts.length}). ` +
        `Color/selection mapping may be incorrect.`,
      );
    }

    return meshes.map((mesh, index) => {
      const partMeta = parts[index];
      if (!partMeta) return null;

      // Detach from glTF scene so we can render individually
      mesh.removeFromParent();

      // Apply the glTF scene's scale to mesh world matrix
      mesh.applyMatrix4(scene.matrixWorld);

      mesh.userData.partId = partMeta.id;
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...partMeta.color),
        metalness: 0.1,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });

      return { mesh, partId: partMeta.id };
    }).filter((m): m is ExtractedMesh => m !== null);
  }, [scene, parts]);

  // Click handler for part selection
  useEffect(() => {
    if (!groupRef.current) return;

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
    camera,
    raycaster,
    pointer,
    parts,
    togglePartSelection,
    setSelectedPartIds,
  ]);

  return (
    <group ref={groupRef}>
      {extractedMeshes.map(({ mesh, partId }) => {
        const isHidden = hiddenPartIds.includes(partId);
        const isSelected = selectedPartIds.includes(partId);

        // Apply selection emissive
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          mat.emissive.setRGB(0.15, 0.15, 0.15);
        } else {
          mat.emissive.setRGB(0, 0, 0);
        }

        return (
          <primitive
            key={partId}
            object={mesh}
            visible={!isHidden}
          />
        );
      })}
    </group>
  );
}
