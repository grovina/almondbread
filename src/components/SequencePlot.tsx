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
  height = 200,
}) => {
  const { xRange, yRange, points, lines } = useMemo(() => {
    // Get all points from the sequence
    const points = result.sequence.map((point) => ({
      x: point.z.real,
      y: point.z.imag,
    }));

    // Calculate bounds with some padding
    const padding = 0.2;
    const xExtent = [Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x))];
    const yExtent = [Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y))];

    const xRange = [
      xExtent[0] - (xExtent[1] - xExtent[0]) * padding,
      xExtent[1] + (xExtent[1] - xExtent[0]) * padding,
    ] as [number, number];

    const yRange = [
      yExtent[0] - (yExtent[1] - yExtent[0]) * padding,
      yExtent[1] + (yExtent[1] - yExtent[0]) * padding,
    ] as [number, number];

    // Create scales
    const xScale = scaleLinear().domain(xRange).range([0, width]);

    const yScale = scaleLinear().domain(yRange).range([height, 0]);

    // Transform points to SVG coordinates
    const transformedPoints = points.map((p) => ({
      x: xScale(p.x),
      y: yScale(p.y),
    }));

    // Create lines connecting sequential points
    const lines = transformedPoints.slice(1).map((point, i) => ({
      x1: transformedPoints[i].x,
      y1: transformedPoints[i].y,
      x2: point.x,
      y2: point.y,
    }));

    return { xRange, yRange, points: transformedPoints, lines };
  }, [result, width, height]);

  const stepDuration = 0.4; // seconds per step
  const initialDelay = 0.2; // initial delay before sequence starts

  return (
    <svg width={width} height={height} className="sequence-plot">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="4"
          refX="6"
          refY="2"
          orient="auto"
          className="sequence-arrow"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 6 2, 0 4" />
        </marker>
      </defs>

      {/* Axes */}
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} className="axis" />
      <line x1={width / 2} y1={0} x2={width / 2} y2={height} className="axis" />

      {/* Initial point (z₀) appears first */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={3}
        className="sequence-point"
        style={{
          animation: `fadeIn ${stepDuration/2}s ease-out forwards`,
          animationDelay: `${initialDelay}s`
        }}
      />

      {/* Rest of the sequence */}
      {lines.map((line, i) => (
        <g key={i} className="sequence-step">
          {/* Line with arrow */}
          <line
            {...line}
            className="sequence-line"
            style={{
              animation: `drawLine ${stepDuration}s ease-out forwards`,
              animationDelay: `${initialDelay + stepDuration * (i + 0.5)}s`
            }}
            markerEnd="url(#arrowhead)"
          />
          {/* Point at the end of line */}
          <circle
            cx={points[i + 1].x}
            cy={points[i + 1].y}
            r={i === points.length - 2 ? 5 : 3}
            className={`sequence-point ${i === points.length - 2 ? 'final-point' : ''}`}
            style={{
              animation: `fadeIn ${stepDuration/2}s ease-out forwards`,
              animationDelay: `${initialDelay + stepDuration * (i + 1)}s`
            }}
          />
        </g>
      ))}
    </svg>
  );
};
