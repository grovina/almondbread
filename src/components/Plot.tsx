import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import React, { useCallback, useEffect, useRef } from 'react';
import { AnalysisResult, PlotOptions, PlotState, Point } from '../types';

interface PlotProps {
  options: PlotOptions;
  state: PlotState;
  onPointClick: (point: Point) => void;
}

export const Plot: React.FC<PlotProps> = ({ options, state, onPointClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const plotRef = useRef<SVGGElement>(null);

  // Add click handlers at different levels
  const handleDivClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    console.log('Div clicked');
  }, []);

  const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    console.log('SVG clicked');
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log('Screen coordinates:', { x, y });

    const xScale = scaleLinear()
      .domain([options.xRange[0], options.xRange[1]])
      .range([0, options.width]);

    const yScale = scaleLinear()
      .domain([options.yRange[0], options.yRange[1]])
      .range([options.height, 0]);

    const domainX = xScale.invert(x);
    const domainY = yScale.invert(y);
    console.log('Domain coordinates:', { x: domainX, y: domainY });

    onPointClick({ x: domainX, y: domainY });
  }, [options, onPointClick]);

  const handleGClick = useCallback((event: React.MouseEvent<SVGGElement>) => {
    console.log('G element clicked');
  }, []);

  useEffect(() => {
    if (!svgRef.current || !plotRef.current) return;

    const svg = select(svgRef.current);
    const plot = select(plotRef.current);

    // Set up scales
    const xScale = scaleLinear()
      .domain([options.xRange[0], options.xRange[1]])
      .range([0, options.width]);

    const yScale = scaleLinear()
      .domain([options.yRange[0], options.yRange[1]])
      .range([options.height, 0]);

    // Set up axes
    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale);

    svg.select<SVGGElement>('.x-axis')
      .attr('transform', `translate(0,${options.height})`)
      .call(xAxis);

    svg.select<SVGGElement>('.y-axis')
      .call(yAxis);

    // Plot points
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
      .attr('r', 5)
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

  }, [options, state]);

  return (
    <div className="plot" onClick={handleDivClick}>
      <svg
        ref={svgRef}
        width={options.width}
        height={options.height}
        className="plot-svg"
        onClick={handleSvgClick}
      >
        <g 
          ref={plotRef} 
          className="plot-content" 
          onClick={handleGClick}
        >
          <g className="x-axis" />
          <g className="y-axis" />
          <g className="points" />
        </g>
      </svg>
    </div>
  );
}; 