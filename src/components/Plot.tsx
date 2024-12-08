import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlotOptions, PlotState, Point } from '../types';

interface PlotProps {
  options: PlotOptions;
  state: PlotState;
  onPointClick: (point: Point) => void;
  onZoomChange: (transform: ViewTransform) => void;
  maxIterations: number;
  width: number;
  height: number;
}

interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

export const Plot: React.FC<PlotProps> = ({ options, state, onPointClick, onZoomChange, maxIterations, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);

  // Define initial scales
  const xScale = scaleLinear()
    .domain(options.xRange)
    .range([0, width]);

  const yScale = scaleLinear()
    .domain(options.yRange)
    .range([height, 0]); // Inverted Y-axis

  useEffect(() => {
    if (!canvasRef.current) return;

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        setTransform(event.transform);
        onZoomChange({
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y
        });
      });

    select(canvasRef.current)
      .call(zoomBehavior);

    return () => {
      select(canvasRef.current).on('.zoom', null);
    };
  }, [onZoomChange]);

  // Handle canvas drawing
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = width * dpr;
    const scaledHeight = height * dpr;

    // Resize canvas for high DPI displays
    canvasRef.current.width = scaledWidth;
    canvasRef.current.height = scaledHeight;
    ctx.scale(dpr, dpr);

    // Apply the zoom transform to scales
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw points
    const pointSize = 2;
    state.points.forEach((result, key) => {
      const [x, y] = key.split(',').map(parseFloat);
      const screenX = newXScale(x);
      const screenY = newYScale(y);

      const color = result.behavior === 'converges' 
        ? 'black'
        : `hsl(${result.escapeTime! / maxIterations * 360}, 100%, ${(1 - result.escapeTime! / maxIterations) * 50 + 25}%)`;

      ctx.fillStyle = color;
      ctx.fillRect(screenX - pointSize / 2, screenY - pointSize / 2, pointSize, pointSize);
    });

    // Highlight selected point
    if (state.selectedPoint) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      const screenX = newXScale(state.selectedPoint.x);
      const screenY = newYScale(state.selectedPoint.y);
      ctx.beginPath();
      ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }, [state.points, state.selectedPoint, transform, width, height, xScale, yScale, maxIterations]);

  // Handle clicks
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Invert the transform to get domain coordinates
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);
    const domainX = newXScale.invert(x);
    const domainY = newYScale.invert(y);

    onPointClick({ x: domainX, y: domainY });
  }, [xScale, yScale, transform, onPointClick]);

  return (
    <div className="plot" style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      />
    </div>
  );
}; 