import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { zoom, ZoomBehavior } from 'd3-zoom';
import React, { useCallback, useEffect, useRef } from 'react';
import { AnalysisResult, PlotOptions, PlotState, Point } from '../types';

interface PlotProps {
  options: PlotOptions;
  state: PlotState;
  onPointClick: (point: Point) => void;
  onZoomChange: (transform: ViewTransform) => void;
  transform: ViewTransform;
}

interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

export const Plot: React.FC<PlotProps> = ({ options, state, onPointClick, onZoomChange, transform }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const plotRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>();

  // Setup zoom behavior
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Enable transitions
    transition();

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 50])
      .on('zoom', (event) => {
        onZoomChange(event.transform);
      });

    zoomBehaviorRef.current = zoomBehavior;
    select(svgRef.current).call(zoomBehavior);

    return () => {
      select(svgRef.current!).on('.zoom', null);
    };
  }, [onZoomChange]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 1.5);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, 0.75);
  }, []);

  const handleReset = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, zoom().transform);
  }, []);

  const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Get coordinates relative to SVG
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

  useEffect(() => {
    if (!svgRef.current || !plotRef.current) return;

    const svg = select(svgRef.current);
    const plot = select(plotRef.current);

    // Set up scales without zoom transform
    const xScale = scaleLinear()
      .domain([options.xRange[0], options.xRange[1]])
      .range([0, options.width]);

    const yScale = scaleLinear()
      .domain([options.yRange[0], options.yRange[1]])
      .range([options.height, 0]);

    // Create rescaled versions for the axes
    const xScaleAxis = scaleLinear()
      .domain([
        options.xRange[0] - transform.x / (options.width * transform.k) * (options.xRange[1] - options.xRange[0]),
        options.xRange[1] + (options.width - transform.x - options.width) / (options.width * transform.k) * (options.xRange[1] - options.xRange[0])
      ])
      .range([0, options.width]);

    const yScaleAxis = scaleLinear()
      .domain([
        options.yRange[0] - transform.y / (options.height * transform.k) * (options.yRange[1] - options.yRange[0]),
        options.yRange[1] + (options.height - transform.y - options.height) / (options.height * transform.k) * (options.yRange[1] - options.yRange[0])
      ])
      .range([options.height, 0]);

    // Set up axes with rescaled versions
    const xAxis = axisBottom(xScaleAxis)
      .tickSize(-options.height); // Add grid lines

    const yAxis = axisLeft(yScaleAxis)
      .tickSize(-options.width); // Add grid lines

    // Create a clip path to hide axis overflow
    svg.select('defs').remove(); // Remove any existing defs
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'plot-area')
      .append('rect')
      .attr('width', options.width)
      .attr('height', options.height);

    // Position axes at the edges and apply clip path
    svg.select<SVGGElement>('.x-axis')
      .attr('transform', `translate(0,${options.height})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke-width', 2)); // Make axis line thicker

    svg.select<SVGGElement>('.y-axis')
      .attr('transform', 'translate(0,0)')
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke-width', 2)); // Make axis line thicker

    // Apply clip path to plot content
    plot.attr('clip-path', 'url(#plot-area)');

    // Transform only the plot content
    plot.select('.points')
      .attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Update points
    type PointDatum = [string, AnalysisResult];
    const pointsSelection = plot.select<SVGGElement>('.points')
      .selectAll<SVGCircleElement, PointDatum>('circle')
      .data(
        Array.from(state.points.entries()),
        (d: PointDatum) => d[0]
      );

    pointsSelection.exit().remove();

    const pointsEnter = pointsSelection.enter()
      .append('circle');

    pointsEnter.merge(pointsSelection)
      .attr('cx', ([key]) => xScale(parseFloat(key.split(',')[0])))
      .attr('cy', ([key]) => yScale(parseFloat(key.split(',')[1])))
      .attr('r', 5 / transform.k)
      .attr('class', ([, result]) => 
        `point ${result.behavior === 'converges' ? 'converges' : 'diverges'}`
      );

    // Update selected point
    plot.selectAll<SVGCircleElement, PointDatum>('circle')
      .classed('selected', ([key]) => {
        if (!state.selectedPoint) return false;
        const [x, y] = key.split(',').map(parseFloat);
        return x === state.selectedPoint.x && y === state.selectedPoint.y;
      });

  }, [options, state, transform]);

  return (
    <div className="plot">
      <div className="plot-controls">
        <button onClick={handleZoomIn} className="plot-control" title="Zoom In">+</button>
        <button onClick={handleZoomOut} className="plot-control" title="Zoom Out">−</button>
        <button onClick={handleReset} className="plot-control" title="Reset View">↺</button>
      </div>
      <svg
        ref={svgRef}
        width={options.width}
        height={options.height}
        className="plot-svg"
        onClick={handleSvgClick}
      >
        <g ref={plotRef} className="plot-content">
          <g className="points" />
          <g className="x-axis" />
          <g className="y-axis" />
        </g>
      </svg>
    </div>
  );
}; 