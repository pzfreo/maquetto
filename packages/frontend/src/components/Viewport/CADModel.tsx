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
        let meshCount = 0;
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
          }
        });
        // Build123d's export_gltf converts mm to meters (per glTF spec).
        // We apply a 1000x scale at the group level when rendering.
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log(`[Viewport] glTF loaded: ${meshCount} meshes, size=(${(size.x * 1000).toFixed(1)}, ${(size.y * 1000).toFixed(1)}, ${(size.z * 1000).toFixed(1)})mm`);
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

    const allMeshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);
      }
    });

    // When Build123d exports a Compound, the glTF may contain a fused
    // assembly mesh *plus* individual child meshes, giving us more meshes
    // than parts.  Take only the last parts.length meshes (the children).
    let meshes: THREE.Mesh[];
    if (allMeshes.length > parts.length) {
      console.warn(
        `[Viewport] Mesh count (${allMeshes.length}) > part count (${parts.length}). ` +
        `Skipping first ${allMeshes.length - parts.length} meshes (assembly duplicates).`,
      );
      meshes = allMeshes.slice(allMeshes.length - parts.length);
    } else if (allMeshes.length < parts.length) {
      console.warn(
        `[Viewport] Mesh count (${allMeshes.length}) < part count (${parts.length}). ` +
        `Some parts may not render.`,
      );
      meshes = allMeshes;
    } else {
      meshes = allMeshes;
    }

    // Update the scene's world matrix so we can compute each mesh's
    // absolute transform within the glTF (without the 1000x scale —
    // that's applied at the <group> level in the JSX).
    scene.updateMatrixWorld(true);

    return meshes.map((mesh, index) => {
      const partMeta = parts[index];
      if (!partMeta) return null;

      // Compute the mesh's world transform within the glTF scene,
      // then detach and bake it as the mesh's local transform.
      // This flattens the hierarchy so each mesh can be rendered
      // independently while keeping its correct position.
      const worldMatrix = mesh.matrixWorld.clone();
      mesh.removeFromParent();
      mesh.matrix.copy(worldMatrix);
      mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);

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
    <group ref={groupRef} scale={1000}>
      {extractedMeshes.map(({ mesh, partId }) => {
        const isHidden = hiddenPartIds.includes(partId);
        const isSelected = selectedPartIds.includes(partId);

        // Set visibility and selection directly on the Three.js object
        // to avoid R3F primitive prop-update quirks.
        mesh.visible = !isHidden;
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
          />
        );
      })}
    </group>
  );
}
