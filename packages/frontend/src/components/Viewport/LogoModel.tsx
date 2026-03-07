import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 3D version of the Maquetto logo — an isometric cube with "M" and ">_".
 * Shown in the viewport while the CAD engine loads.
 */
export function LogoModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const blue = '#4a9eff';
  const purple = '#7c5cfc';
  const edgeMat = new THREE.LineBasicMaterial({ color: blue, linewidth: 2 });

  // Cube dimensions (centered at origin)
  const s = 20; // half-size

  // 8 vertices of the cube
  const v = {
    ftl: [-s, s, s],   // front-top-left
    ftr: [s, s, s],    // front-top-right
    fbl: [-s, -s, s],  // front-bottom-left
    fbr: [s, -s, s],   // front-bottom-right
    btl: [-s, s, -s],  // back-top-left
    btr: [s, s, -s],   // back-top-right
    bbl: [-s, -s, -s], // back-bottom-left
    bbr: [s, -s, -s],  // back-bottom-right
  } as const;

  // Face materials
  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(blue),
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85,
  });
  const leftMat = new THREE.MeshStandardMaterial({
    color: '#2a2a4e',
    metalness: 0.2,
    roughness: 0.6,
  });
  const rightMat = new THREE.MeshStandardMaterial({
    color: '#1a1a35',
    metalness: 0.2,
    roughness: 0.6,
  });

  // Helper: create a line from points array [[x,y,z], ...]
  function makeLine(points: readonly (readonly number[])[], color: string, opacity = 0.7) {
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const lineObj = new THREE.Line(geo, mat);
    return <primitive object={lineObj} />;
  }

  // "M" on front face (z = s), mapped to face coordinates
  const mPoints = [
    [-s * 0.6, -s * 0.6, s + 0.1],
    [-s * 0.6, s * 0.4, s + 0.1],
    [-s * 0.1, -s * 0.1, s + 0.1],
    [s * 0.4, s * 0.4, s + 0.1],
    [s * 0.4, -s * 0.6, s + 0.1],
  ] as const;

  // ">_" on right face (x = s)
  const chevronPoints = [
    [s + 0.1, s * 0.2, s * 0.4],
    [s + 0.1, -s * 0.1, 0],
    [s + 0.1, s * 0.2, -s * 0.4],
  ] as const;

  const cursorPoints = [
    [s + 0.1, -s * 0.3, -s * 0.1],
    [s + 0.1, -s * 0.3, -s * 0.6],
  ] as const;

  // Build face geometries
  function makeQuad(
    a: readonly number[], b: readonly number[],
    c: readonly number[], d: readonly number[],
    mat: THREE.Material,
  ) {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      ...a, ...b, ...c, ...a, ...c, ...d,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return <mesh geometry={geo} material={mat} />;
  }

  return (
    <group ref={groupRef}>
      {/* Cube faces */}
      {makeQuad(v.ftl, v.ftr, v.btr, v.btl, topMat)}   {/* top */}
      {makeQuad(v.ftl, v.btl, v.bbl, v.fbl, leftMat)}   {/* left */}
      {makeQuad(v.ftr, v.ftl, v.fbl, v.fbr, rightMat)}   {/* front */}
      {makeQuad(v.btr, v.ftr, v.fbr, v.bbr, rightMat)}   {/* right */}
      {makeQuad(v.btl, v.btr, v.bbr, v.bbl, leftMat)}    {/* back */}
      {makeQuad(v.fbl, v.fbr, v.bbr, v.bbl, topMat)}     {/* bottom */}

      {/* Wireframe edges */}
      <lineSegments material={edgeMat}>
        <edgesGeometry args={[new THREE.BoxGeometry(s * 2, s * 2, s * 2)]} />
      </lineSegments>

      {/* "M" letterform */}
      {makeLine(mPoints, blue, 0.8)}

      {/* ">" chevron */}
      {makeLine(chevronPoints, purple, 0.8)}

      {/* "_" cursor */}
      {makeLine(cursorPoints, purple, 0.8)}
    </group>
  );
}
