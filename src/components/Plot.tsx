import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import React, { useCallback, useEffect, useRef } from 'react';
import { AnalysisResult, PlotOptions, PlotState, Point } from '../types';

interface PlotProps {
  options: PlotOptions;
  state: PlotState;
  onPointClick: (point: Point) => void;
  onZoomChange: (transform: ViewTransform) => void;
  transform: ViewTransform;
  maxIterations: number;
  width: number;
  height: number;
  onShowMandelbrot?: (xRange: [number, number], yRange: [number, number], transform: ViewTransform) => void;
}

interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

function getVisibleRange(transform: ViewTransform, options: PlotOptions): { 
  xRange: [number, number], 
  yRange: [number, number] 
} {
  return {
    xRange: [
      options.xRange[0] + (-transform.x / transform.k) * (options.xRange[1] - options.xRange[0]) / options.width,
      options.xRange[1] + (-transform.x / transform.k) * (options.xRange[1] - options.xRange[0]) / options.width
    ],
    yRange: [
      options.yRange[0] + (-transform.y / transform.k) * (options.yRange[1] - options.yRange[0]) / options.height,
      options.yRange[1] + (-transform.y / transform.k) * (options.yRange[1] - options.yRange[0]) / options.height
    ]
  };
}

export const Plot: React.FC<PlotProps> = ({ options, state, onPointClick, onZoomChange, transform, maxIterations, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Define scales for domain to screen conversion
  const xScale = scaleLinear()
    .domain(options.xRange)
    .range([0, width]);

  const yScale = scaleLinear()
    .domain(options.yRange)
    .range([height, 0]); // Flip Y axis to match mathematical coordinates

  // Initialize canvases
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = width * dpr;
    const scaledHeight = height * dpr;
    
    if (canvasRef.current) {
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      canvasRef.current.width = scaledWidth;
      canvasRef.current.height = scaledHeight;
    }

    offscreenRef.current = document.createElement('canvas');
    offscreenRef.current.width = scaledWidth;
    offscreenRef.current.height = scaledHeight;
  }, [width, height]);

  // Setup zoom behavior with proper centering
  useEffect(() => {
    if (!canvasRef.current) return;

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        onZoomChange({
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y
        });
      });

    select(canvasRef.current)
      .call(zoomBehavior);

    // Set initial transform
    if (transform.k !== 1 || transform.x !== 0 || transform.y !== 0) {
      const d3Transform = zoomIdentity
        .translate(transform.x, transform.y)
        .scale(transform.k);
      
      select(canvasRef.current)
        .call(zoomBehavior.transform, d3Transform);
    }

    return () => {
      select(canvasRef.current).on('.zoom', null);
    };
  }, [onZoomChange]);

  // Render points to offscreen canvas
  const renderToCanvas = useCallback((points: Map<string, AnalysisResult>) => {
    const canvas = offscreenRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const pointSize = Math.max(1, Math.min(2, 1 / transform.k));

    points.forEach((result, key) => {
      const [x, y] = key.split(',').map(parseFloat);
      const screenX = xScale(x);
      const screenY = yScale(y);
      
      const color = result.behavior === 'converges' 
        ? 'black'
        : `hsl(${result.escapeTime! / maxIterations * 360}, 100%, ${(1 - result.escapeTime! / maxIterations) * 50 + 25}%)`;

      ctx.fillStyle = color;
      ctx.fillRect(screenX - pointSize/2, screenY - pointSize/2, pointSize, pointSize);
    });

    ctx.restore();
  }, [transform.k, xScale, yScale, maxIterations]);

  // Draw to visible canvas
  useEffect(() => {
    if (!canvasRef.current || !offscreenRef.current) return;

    renderToCanvas(state.points);

    const ctx = canvasRef.current.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, width * dpr, height * dpr);
    ctx.save();
    
    // Scale for DPI
    ctx.scale(dpr, dpr);
    
    // Apply zoom transform
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw the offscreen canvas
    ctx.drawImage(
      offscreenRef.current,
      0, 0, width, height,
      0, 0, width, height
    );

    ctx.restore();
  }, [state.points, transform, width, height, renderToCanvas]);

  // Handle clicks
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to domain coordinates
    const domainX = xScale.invert((x - transform.x) / transform.k);
    const domainY = yScale.invert((y - transform.y) / transform.k);

    onPointClick({ x: domainX, y: domainY });
  }, [xScale, yScale, transform, onPointClick]);

  return (
    <div className="plot" style={{ width, height, position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {state.selectedPoint && (
          <circle
            cx={xScale(state.selectedPoint.x) * transform.k + transform.x}
            cy={yScale(state.selectedPoint.y) * transform.k + transform.y}
            r={3}
            className="selected-point"
          />
        )}
      </svg>
    </div>
  );
}; 