import { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '../../store';

interface CADModelProps {
  data: ArrayBuffer;
}

interface PartGroup {
  group: THREE.Group;
  partId: string;
}

/**
 * Find the N sub-trees in a glTF scene that correspond to parts.
 *
 * Build123d's export_gltf creates multiple meshes per shape (one per
 * face), so we can't do a 1:1 mesh↔part mapping.  Instead we look at
 * the scene hierarchy:
 *
 *  - Single shape  → scene may have 1 child group containing face meshes
 *  - Compound(N)   → scene has a wrapper group whose N children are parts
 *  - Direct match  → scene.children.length === partCount
 */
function findPartNodes(scene: THREE.Group, partCount: number): THREE.Object3D[] {
  const children = scene.children;

  // Direct children match part count
  if (children.length === partCount) {
    return [...children];
  }

  // Single wrapper group whose children match part count (Compound case)
  if (children.length === 1 && children[0]!.children.length === partCount) {
    return [...children[0]!.children];
  }

  // Single part — the entire scene is the one part
  if (partCount === 1) {
    return [scene];
  }

  // Fallback — take the first partCount children we can find
  console.warn(
    `[Viewport] Cannot map scene structure (${children.length} children) ` +
    `to ${partCount} parts. Falling back to first ${partCount} children.`,
  );
  return children.slice(0, partCount);
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

  // Group scene nodes by part.
  // Build123d's export_gltf creates multiple meshes per shape (one per
  // face), so a single Box → 6 meshes.  We match at the *group* level
  // in the scene hierarchy, not the individual mesh level.
  const partGroups = useMemo<PartGroup[]>(() => {
    if (!scene || parts.length === 0) return [];

    scene.updateMatrixWorld(true);

    const nodes = findPartNodes(scene, parts.length);

    let totalMeshes = 0;
    return nodes.map((node, index) => {
      const partMeta = parts[index];
      if (!partMeta) return null;

      // Create a new group and move all meshes from this node into it,
      // baking world transforms so each group renders independently.
      const group = new THREE.Group();
      group.userData.partId = partMeta.id;

      const meshes: THREE.Mesh[] = [];
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
      totalMeshes += meshes.length;

      for (const mesh of meshes) {
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

        group.add(mesh);
      }

      return { group, partId: partMeta.id };
    }).filter((g): g is PartGroup => g !== null);
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
      {partGroups.map(({ group, partId }) => {
        const isHidden = hiddenPartIds.includes(partId);
        const isSelected = selectedPartIds.includes(partId);

        // Set visibility on the group (affects all child meshes).
        group.visible = !isHidden;

        // Set selection emissive on every mesh in the group.
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (isSelected) {
              mat.emissive.setRGB(0.15, 0.15, 0.15);
            } else {
              mat.emissive.setRGB(0, 0, 0);
            }
          }
        });

        return (
          <primitive
            key={partId}
            object={group}
          />
        );
      })}
    </group>
  );
}
