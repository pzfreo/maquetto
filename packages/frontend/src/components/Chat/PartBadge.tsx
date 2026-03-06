import { useAppStore } from '../../store';

interface PartBadgeProps {
  partId: string;
}

export function PartBadge({ partId }: PartBadgeProps) {
  const parts = useAppStore((s) => s.parts);
  const part = parts.find((p) => p.id === partId);

  const [r, g, b] = part?.color ?? [0.62, 0.62, 0.62];
  const cssColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 4px',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'monospace',
        background: `${cssColor}22`,
        color: cssColor,
        border: `1px solid ${cssColor}44`,
      }}
    >
      {part?.name ? `${partId}: ${part.name}` : partId}
    </span>
  );
}
