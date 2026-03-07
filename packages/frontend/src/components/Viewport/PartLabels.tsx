import { Html } from '@react-three/drei';
import { useAppStore } from '../../store';

export function PartLabels() {
  const parts = useAppStore((s) => s.parts);
  const hiddenPartIds = useAppStore((s) => s.hiddenPartIds);
  const labelsVisible = useAppStore((s) => s.labelsVisible);

  if (!labelsVisible) return null;

  return (
    <>
      {parts
        .filter((part) => !hiddenPartIds.includes(part.id))
        .map((part) => {
          const bb = part.boundingBox;
          // Build123d uses Z-up, Three.js/glTF uses Y-up: swap Y and Z
          const centroid: [number, number, number] = [
            (bb.min[0] + bb.max[0]) / 2,
            (bb.min[2] + bb.max[2]) / 2,
            (bb.min[1] + bb.max[1]) / 2,
          ];

          const [r, g, b] = part.color;
          const cssColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

          const displayText = part.name ? `${part.id}: ${part.name}` : part.id;

          return (
            <Html
              key={part.id}
              position={centroid}
              center
              zIndexRange={[1, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  color: cssColor,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  border: `1px solid ${cssColor}`,
                }}
              >
                {displayText}
              </div>
            </Html>
          );
        })}
    </>
  );
}
