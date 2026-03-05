export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#404060" />
      <directionalLight
        position={[50, 80, 50]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#b1e1ff', '#b97a20', 0.4]} />
    </>
  );
}
