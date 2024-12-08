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

    // Batch points by color for better performance
    const batches = new Map<string, Point[]>();
    
    points.forEach((result, key) => {
      const [x, y] = key.split(',').map(parseFloat);
      const color = result.behavior === 'converges' 
        ? 'black'
        : `hsl(${result.escapeTime! / maxIterations * 360}, 100%, ${(1 - result.escapeTime! / maxIterations) * 50 + 25}%)`;
      
      if (!batches.has(color)) batches.set(color, []);
      batches.get(color)!.push({ x, y });
    });

    // Draw points by color batches
    batches.forEach((points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(p => {
        const screenX = xScale(p.x);
        const screenY = yScale(p.y);
        ctx.rect(screenX, screenY, 1, 1);
      });
      ctx.fill();
    });
  }, [width, height, xScale, yScale, maxIterations]);

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
  }, [state.points, transform, width, height, renderToCanvas]);

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

  const handleZoomIn = useCallback(() => {
    if (!canvasRef.current || !zoomBehaviorRef.current) return;
    select(canvasRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1.5);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!canvasRef.current || !zoomBehaviorRef.current) return;
    select(canvasRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 0.75);
  }, []);

  const handleReset = useCallback(() => {
    if (!canvasRef.current || !zoomBehaviorRef.current) return;
    select(canvasRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, zoom().transform);
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get coordinates relative to canvas
    const x = (event.clientX - rect.left - transform.x) / transform.k;
    const y = (event.clientY - rect.top - transform.y) / transform.k;

    // Convert to domain coordinates
    const xScale = scaleLinear()
      .domain([options.xRange[0], options.xRange[1]])
      .range([0, options.width]);

    const yScale = scaleLinear()
      .domain([options.yRange[0], options.yRange[1]])
      .range([options.height, 0]);

    const domainX = xScale.invert(x);
    const domainY = yScale.invert(y);

    onPointClick({ x: domainX, y: domainY });
  }, [options, onPointClick, transform]);

  return (
    <div className="plot">
      <div className="plot-controls">
        <button onClick={handleZoomIn} className="plot-control" title="Zoom In">+</button>
        <button onClick={handleZoomOut} className="plot-control" title="Zoom Out">−</button>
        <button onClick={handleReset} className="plot-control" title="Reset View">↺</button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="plot-canvas"
        onClick={handleCanvasClick}
      />
      {/* Overlay SVG for interactive elements */}
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