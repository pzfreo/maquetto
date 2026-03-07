import { useAppStore } from '../../store';

export function PartsPanel() {
  const parts = useAppStore((s) => s.parts);
  const hiddenPartIds = useAppStore((s) => s.hiddenPartIds);
  const selectedPartIds = useAppStore((s) => s.selectedPartIds);
  const togglePartVisibility = useAppStore((s) => s.togglePartVisibility);
  const setSelectedPartIds = useAppStore((s) => s.setSelectedPartIds);
  const showAllParts = useAppStore((s) => s.showAllParts);
  const labelsVisible = useAppStore((s) => s.labelsVisible);
  const setLabelsVisible = useAppStore((s) => s.setLabelsVisible);

  if (parts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'rgba(22, 22, 42, 0.9)',
        border: '1px solid #2a2a3e',
        borderRadius: 6,
        padding: '6px 0',
        minWidth: 140,
        maxHeight: 300,
        overflowY: 'auto',
        zIndex: 10,
        fontSize: 12,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 10px 4px',
          borderBottom: '1px solid #2a2a3e',
        }}
      >
        <span style={{ color: '#888', fontWeight: 600, fontSize: 11 }}>
          Parts
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => setLabelsVisible(!labelsVisible)}
            title={labelsVisible ? 'Hide labels' : 'Show labels'}
            style={{
              background: 'none',
              border: 'none',
              color: labelsVisible ? '#6b8afd' : '#555',
              cursor: 'pointer',
              fontSize: 10,
              padding: 0,
            }}
          >
            Labels
          </button>
          {hiddenPartIds.length > 0 && (
            <button
              onClick={showAllParts}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b8afd',
                cursor: 'pointer',
                fontSize: 10,
                padding: 0,
              }}
            >
              Show All
            </button>
          )}
        </div>
      </div>
      {parts.map((part) => {
        const isHidden = hiddenPartIds.includes(part.id);
        const isSelected = selectedPartIds.includes(part.id);
        const [r, g, b] = part.color;
        const cssColor = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

        return (
          <div
            key={part.id}
            onClick={() => setSelectedPartIds([part.id])}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
              opacity: isHidden ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isSelected
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSelected
                ? 'rgba(255,255,255,0.05)'
                : 'transparent';
            }}
          >
            {/* Color swatch */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: cssColor,
                flexShrink: 0,
              }}
            />

            {/* Part name */}
            <span
              style={{
                flex: 1,
                color: '#ccc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {part.name ? `${part.id}: ${part.name}` : part.id}
            </span>

            {/* Eye toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePartVisibility(part.id);
              }}
              title={isHidden ? 'Show part' : 'Hide part'}
              style={{
                background: 'none',
                border: 'none',
                color: isHidden ? '#555' : '#888',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: 13,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isHidden ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708l11 11a.5.5 0 0 1-.708.708l-2.2-2.2A7.5 7.5 0 0 1 8 13c-3.5 0-6.5-2.5-7.6-5.3a.5.5 0 0 1 0-.4A10.7 10.7 0 0 1 3.5 4.2L2.146 2.854zM8 11a3 3 0 0 0 2.56-1.44L6.44 5.44A3 3 0 0 0 8 11zm0-8c3.5 0 6.5 2.5 7.6 5.3a.5.5 0 0 1 0 .4 10.7 10.7 0 0 1-1.6 2.5l-.72-.72A9.2 9.2 0 0 0 14.5 8 9.2 9.2 0 0 0 8 4a6.5 6.5 0 0 0-1.8.3l-.8-.8A7.5 7.5 0 0 1 8 3z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3C4.5 3 1.5 5.5.4 8.3a.5.5 0 0 0 0 .4C1.5 11.5 4.5 14 8 14s6.5-2.5 7.6-5.3a.5.5 0 0 0 0-.4C14.5 5.5 11.5 3 8 3zm0 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-1.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                </svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
