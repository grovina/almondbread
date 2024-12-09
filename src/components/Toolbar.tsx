import { FunctionSquare, Loader } from 'lucide-react';
import React from 'react';

interface ToolbarProps {
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onClear: () => void;
  onShowMandelbrot: () => void;
  isGridEnabled: boolean;
  zoomLevel: number;
  isComputing?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onReset,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onClear,
  onShowMandelbrot,
  isGridEnabled,
  zoomLevel,
  isComputing = false,
}) => {
  return (
    <div className="toolbar">
      <button
        className="tool-button"
        onClick={onReset}
        title="Reset View"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
      </button>

      <button
        className="tool-button"
        onClick={onZoomIn}
        title="Zoom In"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      <button
        className="tool-button"
        onClick={onZoomOut}
        title="Zoom Out"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </button>

      <div className="tool-separator" />

      <button
        className={`tool-button ${isGridEnabled ? 'active' : ''}`}
        onClick={onToggleGrid}
        title="Toggle Grid"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
        </svg>
      </button>

      <button
        className="tool-button tool-danger"
        onClick={onClear}
        title="Clear Points"
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>

      <div className="tool-separator" />

      <button
        className="tool-button mandelbrot"
        onClick={onShowMandelbrot}
        title={isComputing ? "Cancel computation" : "Show Mandelbrot set"}
      >
        {isComputing ? (
          <Loader className="animate-spin" />
        ) : (
          <FunctionSquare />
        )}
      </button>

      <div className="zoom-level">
        {`${zoomLevel.toFixed(1)}x`}
      </div>
    </div>
  );
}; 