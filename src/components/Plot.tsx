import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom, ZoomBehavior } from 'd3-zoom';
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
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown>>();

  // Define scales
  const xScale = scaleLinear()
    .domain(options.xRange)
    .range([0, width]);

  const yScale = scaleLinear()
    .domain(options.yRange)
    .range([height, 0]);

  // Create offscreen canvas for caching
  useEffect(() => {
    offscreenRef.current = document.createElement('canvas');
    offscreenRef.current.width = width;
    offscreenRef.current.height = height;
  }, [width, height]);

  // Render points to offscreen canvas
  const renderToCanvas = useCallback((points: Map<string, AnalysisResult>) => {
    const canvas = offscreenRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    // Get visible range in domain coordinates
    const { xRange, yRange } = getVisibleRange(transform, options);

    // Debug: log initial points
    console.log('Initial points:', points.size);

    // Group points by color first
    const colorGroups = new Map<string, Point[]>();
    points.forEach((result, key) => {
      const [x, y] = key.split(',').map(parseFloat);
      
      // Check if point is within visible range
      if (x < xRange[0] || x > xRange[1] || y < yRange[0] || y > yRange[1]) {
        return;
      }

      const color = result.behavior === 'converges' 
        ? 'black'
        : `hsl(${result.escapeTime! / maxIterations * 360}, 100%, ${(1 - result.escapeTime! / maxIterations) * 50 + 25}%)`;

      if (!colorGroups.has(color)) {
        colorGroups.set(color, []);
      }
      colorGroups.get(color)!.push({ x, y });
    });

    // Debug: log points after color grouping
    console.log('Points after color grouping:', 
      Array.from(colorGroups.entries()).map(([color, points]) => 
        `${color}: ${points.length}`
      )
    );

    // Draw points by color
    colorGroups.forEach((points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(p => {
        const screenX = xScale(p.x);
        const screenY = yScale(p.y);
        const size = 2.5;
        ctx.rect(screenX - size/2, screenY - size/2, size, size);
      });
      ctx.fill();
    });
  }, [width, height, xScale, yScale, maxIterations, transform, options]);

  // Update visible canvas and render points
  useEffect(() => {
    console.log('Canvas dimensions:', { width, height });
    if (!canvasRef.current) return;

    // Render points to offscreen canvas first
    renderToCanvas(state.points);
    console.log('Points rendered:', state.points.size);

    // Then update visible canvas with transform
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    
    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    
    // Draw cached content
    ctx.drawImage(offscreen, 0, 0);
    
    ctx.restore();
  }, [state.points, transform, width, height, renderToCanvas, options.xRange, options.yRange]);

  // Setup zoom behavior
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        onZoomChange(event.transform);
      });

    zoomBehaviorRef.current = zoomBehavior;
    select(canvasRef.current).call(zoomBehavior);

    return () => {
      select(canvasRef.current!).on('.zoom', null);
    };
  }, [onZoomChange]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get coordinates in screen space
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert to domain coordinates
    const domainX = xScale.invert((screenX - transform.x) / transform.k);
    const domainY = yScale.invert((screenY - transform.y) / transform.k);

    onPointClick({ x: domainX, y: domainY });
  }, [xScale, yScale, transform, onPointClick]);

  return (
    <div className="plot">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="plot-canvas"
        onClick={handleCanvasClick}
      />
      <svg className="plot-overlay">
        {state.selectedPoint && (
          <circle
            cx={xScale(state.selectedPoint.x)}
            cy={yScale(state.selectedPoint.y)}
            r={3}
            className="selected-point"
          />
        )}
      </svg>
    </div>
  );
}; 