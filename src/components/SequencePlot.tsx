import { scaleLinear } from 'd3-scale';
import React, { useMemo } from 'react';
import { AnalysisResult } from '../types';

interface SequencePlotProps {
  result: AnalysisResult;
  width?: number;
  height?: number;
}

export const SequencePlot: React.FC<SequencePlotProps> = ({ 
  result, 
  width = 200, 
  height = 200 
}) => {
  const { xRange, yRange, points, lines } = useMemo(() => {
    // Get all points from the sequence
    const points = result.sequence.map(point => ({
      x: point.z.real,
      y: point.z.imag
    }));

    // Calculate bounds with some padding
    const padding = 0.2;
    const xExtent = [
      Math.min(...points.map(p => p.x)),
      Math.max(...points.map(p => p.x))
    ];
    const yExtent = [
      Math.min(...points.map(p => p.y)),
      Math.max(...points.map(p => p.y))
    ];
    
    const xRange = [
      xExtent[0] - (xExtent[1] - xExtent[0]) * padding,
      xExtent[1] + (xExtent[1] - xExtent[0]) * padding
    ] as [number, number];
    
    const yRange = [
      yExtent[0] - (yExtent[1] - yExtent[0]) * padding,
      yExtent[1] + (yExtent[1] - yExtent[0]) * padding
    ] as [number, number];

    // Create scales
    const xScale = scaleLinear()
      .domain(xRange)
      .range([0, width]);
    
    const yScale = scaleLinear()
      .domain(yRange)
      .range([height, 0]);

    // Transform points to SVG coordinates
    const transformedPoints = points.map(p => ({
      x: xScale(p.x),
      y: yScale(p.y)
    }));

    // Create lines connecting sequential points
    const lines = transformedPoints.slice(1).map((point, i) => ({
      x1: transformedPoints[i].x,
      y1: transformedPoints[i].y,
      x2: point.x,
      y2: point.y
    }));

    return { xRange, yRange, points: transformedPoints, lines };
  }, [result, width, height]);

  return (
    <svg width={width} height={height} className="sequence-plot">
      {/* Axes */}
      <line 
        x1={0} y1={height/2} 
        x2={width} y2={height/2} 
        className="axis"
      />
      <line 
        x1={width/2} y1={0} 
        x2={width/2} y2={height} 
        className="axis"
      />

      {/* Sequence lines */}
      {lines.map((line, i) => (
        <line
          key={i}
          {...line}
          className="sequence-line"
          style={{
            opacity: (i + 1) / lines.length
          }}
        />
      ))}

      {/* Sequence points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={4}
          className="sequence-point"
          style={{
            opacity: (i + 1) / points.length
          }}
        />
      ))}
    </svg>
  );
}; 