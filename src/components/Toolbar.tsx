import {
  BiAtom,
  BiGridAlt,
  BiReset,
  BiTargetLock,
  BiZoomIn,
  BiZoomOut
} from 'react-icons/bi';
import { IconButton } from './IconButton';

interface ToolbarProps {
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onClear: () => void;
  onShowMandelbrot: () => void;
  isGridEnabled: boolean;
  zoomLevel: number;
  isComputing: boolean;
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
  isComputing
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <IconButton
          icon={<BiReset />}
          onClick={onReset}
          tooltip="Reset View"
        />
        <IconButton
          icon={<BiZoomIn />}
          onClick={onZoomIn}
          tooltip="Zoom In"
        />
        <IconButton
          icon={<BiZoomOut />}
          onClick={onZoomOut}
          tooltip="Zoom Out"
        />
        <div className="zoom-level">×{zoomLevel.toFixed(1)}</div>
      </div>

      <div className="toolbar-group">
        <div className="mode-toggle-group">
          <IconButton
            icon={<BiTargetLock />}
            onClick={() => isGridEnabled && onToggleGrid()}
            tooltip="Single Point Mode"
            active={!isGridEnabled}
          >
            <span>Single</span>
          </IconButton>
          <IconButton
            icon={<BiGridAlt />}
            onClick={() => !isGridEnabled && onToggleGrid()}
            tooltip="Grid Mode"
            active={isGridEnabled}
          >
            <span>Grid</span>
          </IconButton>
        </div>
        <IconButton
          icon={<BiAtom />}
          onClick={onShowMandelbrot}
          tooltip={isComputing ? "Cancel Computation" : "Show Mandelbrot Set"}
          active={isComputing}
        />
      </div>
    </div>
  );
}; 