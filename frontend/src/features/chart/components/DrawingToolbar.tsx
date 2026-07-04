import type { DrawingType } from '../types/drawing.types';

interface DrawingToolbarProps {
  activeTool: DrawingType;
  onSelectTool: (tool: DrawingType) => void;
  onClearAll: () => void;
}

const TOOLS: { id: DrawingType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2z" />
      </svg>
    )
  },
  {
    id: 'trendline',
    label: 'Trend Line',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19L19 5" />
      </svg>
    )
  },
  {
    id: 'horizontal-line',
    label: 'Horizontal Line',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
      </svg>
    )
  },
  {
    id: 'vertical-line',
    label: 'Vertical Line',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16" />
      </svg>
    )
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <rect x="4" y="6" width="16" height="12" rx="2" />
      </svg>
    )
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M12 4v16M8 20h8" />
      </svg>
    )
  },
];

export const DrawingToolbar = ({ activeTool, onSelectTool, onClearAll }: DrawingToolbarProps) => {
  return (
    <div 
      className="flex flex-col w-12 border-r py-2 items-center shrink-0"
      style={{ 
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg-primary)',
      }}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => onSelectTool(tool.id)}
          className="w-10 h-10 mb-1 rounded flex items-center justify-center transition-colors"
          style={{
            color: activeTool === tool.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
            background: activeTool === tool.id ? 'var(--color-accent-dim)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (activeTool !== tool.id) {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.background = 'var(--color-bg-card)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTool !== tool.id) {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {tool.icon}
        </button>
      ))}

      <div className="mt-auto pt-2 border-t w-full flex flex-col items-center" style={{ borderColor: 'var(--color-border)' }}>
        <button
          title="Clear all drawings"
          onClick={onClearAll}
          className="w-10 h-10 rounded flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-danger)';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};
