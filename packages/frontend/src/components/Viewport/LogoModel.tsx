import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Static 3D cube logo shown in the viewport while the CAD engine loads.
 * Built as a single THREE.Group and rendered via <primitive> so React's
 * reconciler never touches its transforms.
 */
export function LogoModel() {
  const group = useMemo(() => {
    const blue = '#4a9eff';
    const purple = '#7c5cfc';
    const s = 20;

    const v = {
      ftl: [-s, s, s],   ftr: [s, s, s],
      fbl: [-s, -s, s],  fbr: [s, -s, s],
      btl: [-s, s, -s],  btr: [s, s, -s],
      bbl: [-s, -s, -s], bbr: [s, -s, -s],
    };

    const topMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(blue), metalness: 0.3, roughness: 0.4,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    });
    const leftMat = new THREE.MeshStandardMaterial({
      color: '#2a2a4e', metalness: 0.2, roughness: 0.6, side: THREE.DoubleSide,
    });
    const rightMat = new THREE.MeshStandardMaterial({
      color: '#1a1a35', metalness: 0.2, roughness: 0.6, side: THREE.DoubleSide,
    });

    function makeQuadGeo(a: number[], b: number[], c: number[], d: number[]) {
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      return geo;
    }

    function makeLine(points: number[][], color: string, opacity = 0.7) {
      const geo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      );
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      return new THREE.Line(geo, mat);
    }

    const g = new THREE.Group();

    // Faces
    const faceData = [
      { geo: makeQuadGeo(v.ftl, v.ftr, v.btr, v.btl), mat: topMat },
      { geo: makeQuadGeo(v.ftl, v.btl, v.bbl, v.fbl), mat: leftMat },
      { geo: makeQuadGeo(v.ftr, v.ftl, v.fbl, v.fbr), mat: rightMat },
      { geo: makeQuadGeo(v.btr, v.ftr, v.fbr, v.bbr), mat: rightMat },
      { geo: makeQuadGeo(v.btl, v.btr, v.bbr, v.bbl), mat: leftMat },
      { geo: makeQuadGeo(v.fbl, v.fbr, v.bbr, v.bbl), mat: topMat },
    ];
    for (const f of faceData) {
      g.add(new THREE.Mesh(f.geo, f.mat));
    }

    // Edges
    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(s * 2, s * 2, s * 2));
    const edgeMat = new THREE.LineBasicMaterial({ color: blue, linewidth: 2 });
    g.add(new THREE.LineSegments(edgesGeo, edgeMat));

    // "M" letter
    g.add(makeLine([
      [-s * 0.6, -s * 0.6, s + 0.1], [-s * 0.6, s * 0.4, s + 0.1],
      [-s * 0.1, -s * 0.1, s + 0.1], [s * 0.4, s * 0.4, s + 0.1],
      [s * 0.4, -s * 0.6, s + 0.1],
    ], blue, 0.8));

    // Chevron
    g.add(makeLine([
      [s + 0.1, s * 0.3, s * 0.3],
      [s + 0.1, 0, -s * 0.1],
      [s + 0.1, -s * 0.3, s * 0.3],
    ], purple, 0.8));

    // Cursor
    g.add(makeLine([
      [s + 0.1, -s * 0.5, -s * 0.1], [s + 0.1, -s * 0.5, -s * 0.5],
    ], purple, 0.8));

    g.rotation.y = Math.PI / 6;
    return g;
  }, []);

  return <primitive object={group} />;
}
