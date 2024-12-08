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
  const { points, lines } = useMemo(() => {
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

  const stepDuration = 0.5; // slightly longer duration for clearer steps
  const initialDelay = 0.5; // longer initial delay to clearly see z₀
  const stepDelay = 0.6; // delay between steps

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

        {/* Explosion marker for divergent sequences */}
        <g id="explosion-marker">
          <path d="M-6,-6 L6,6 M-6,6 L6,-6" className="explosion-x" />
          <path d="M0,-8 L0,8 M-8,0 L8,0" className="explosion-plus" />
        </g>

        {/* Spiral marker for convergent sequences */}
        <path
          id="spiral-marker"
          d="M0,0 a1,1 0 0,1 2,2 a3,3 0 0,0 4,4"
          className="spiral-path"
        />
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
          animation: `fadeIn ${stepDuration}s ease-out forwards`,
          animationDelay: `${initialDelay}s`
        }}
      />

      {/* Rest of the sequence */}
      {lines.map((line, i) => (
        <g key={i} className="sequence-step">
          <line
            {...line}
            className="sequence-line"
            style={{
              animation: `drawLine ${stepDuration}s ease-out forwards`,
              animationDelay: `${initialDelay + stepDelay * (i + 1)}s`
            }}
            markerEnd="url(#arrowhead)"
          />
          {i === points.length - 2 ? (
            <g
              transform={`translate(${points[i + 1].x},${points[i + 1].y})`}
              className={`final-point ${result.behavior}`}
              style={{
                opacity: 0,
                animation: `fadeIn ${stepDuration}s ease-out forwards`,
                animationDelay: `${initialDelay + stepDelay * (i + 1)}s`
              }}
            >
              <g
                className="marker"
                style={{
                  animation: `${result.behavior === 'diverges' ? 'spin' : 'spiral'} 3s ease-in-out infinite`,
                  animationDelay: `${initialDelay + stepDelay * (i + 1) + stepDuration}s`,
                  animationPlayState: 'paused',
                  animationFillMode: 'forwards'
                }}
              >
                {result.behavior === 'diverges' ? (
                  <use href="#explosion-marker" />
                ) : (
                  <use href="#spiral-marker" />
                )}
              </g>
            </g>
          ) : (
            <circle
              cx={points[i + 1].x}
              cy={points[i + 1].y}
              r={3}
              className="sequence-point"
              style={{
                animation: `fadeIn ${stepDuration}s ease-out forwards`,
                animationDelay: `${initialDelay + stepDelay * (i + 1)}s`
              }}
            />
          )}
        </g>
      ))}
    </svg>
  );
};
