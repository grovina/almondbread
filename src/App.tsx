import { scaleLinear } from 'd3-scale';
import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ParameterPanel } from './components/ParameterPanel';
import { Plot } from './components/Plot';
import { SequencePanel } from './components/SequencePanel';
import { Toolbar } from './components/Toolbar';
import { ComplexNumber, Parameters, PlotState, Point } from './types';
import { computeGrid, computeSequence } from './utils/compute';
import { MandelbrotRenderer } from './utils/mandelbrot';

const DEFAULT_PARAMETERS: Parameters = {
  z0: { real: 0, imag: 0 },
  maxIterations: 100,
  gridSize: 11,
  gridSpacing: 0.1
};

const DEFAULT_PLOT_OPTIONS = {
  xRange: [-2, 0.5] as [number, number],
  yRange: [-1.25, 1.25] as [number, number]
};

interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

export const App: React.FC = () => {
  const [parameters, setParameters] = useState<Parameters>(DEFAULT_PARAMETERS);
  const [plotState, setPlotState] = useState<PlotState>({
    points: new Map(),
    gridEnabled: false
  });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [plotDimensions, setPlotDimensions] = useState({ width: 800, height: 600 });
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MandelbrotRenderer>();
  const [renderProgress, setRenderProgress] = useState(0);

  useEffect(() => {
    const container = plotContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setPlotDimensions({
        width: container.clientWidth,
        height: container.clientHeight
      });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions(); // Initial measurement

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    rendererRef.current = new MandelbrotRenderer();
    return () => rendererRef.current?.terminate();
  }, []);

  const calculateGridSpacing = useCallback((transform: ViewTransform) => {
    // Calculate visible area dimensions in domain coordinates
    const visibleWidth = (DEFAULT_PLOT_OPTIONS.xRange[1] - DEFAULT_PLOT_OPTIONS.xRange[0]) / transform.k;
    const visibleHeight = (DEFAULT_PLOT_OPTIONS.yRange[1] - DEFAULT_PLOT_OPTIONS.yRange[0]) / transform.k;
    
    // Calculate 50% of visible dimensions
    const targetWidth = visibleWidth * 0.5;
    const targetHeight = visibleHeight * 0.5;
    
    // Use the smaller dimension to ensure grid fits in both directions
    const targetSize = Math.min(targetWidth, targetHeight);
    
    // Calculate spacing to distribute points evenly
    const spacing = targetSize / (parameters.gridSize - 1);
    
    // No need to round to "nice" numbers since we want exact distribution
    return spacing;
  }, [parameters.gridSize]);

  const handleZoomChange = useCallback((newTransform: ViewTransform) => {
    setTransform(zoomIdentity.translate(newTransform.x, newTransform.y).scale(newTransform.k));
    if (plotState.gridEnabled) {
      setParameters(prev => ({
        ...prev,
        gridSpacing: calculateGridSpacing(newTransform)
      }));
    }
  }, [plotState.gridEnabled, calculateGridSpacing]);

  const handleParameterChange = useCallback((params: Partial<Parameters>) => {
    setParameters(prev => ({ ...prev, ...params }));
  }, []);

  const handlePointClick = useCallback((point: Point) => {
    console.log('Click:', point);
    const c: ComplexNumber = { real: point.x, imag: point.y };
    
    if (plotState.gridEnabled) {
      console.log('Computing grid...');
      const gridResults = computeGrid(
        c, 
        parameters.gridSize, 
        calculateGridSpacing(transform),
        parameters.z0, 
        parameters.maxIterations
      );
      setPlotState(prev => ({
        ...prev,
        points: new Map([...prev.points, ...gridResults]),
      }));
    } else {
      const result = computeSequence(parameters.z0, c, parameters.maxIterations);
      console.log('Sequence:', result);
      const key = `${point.x},${point.y}`;
      setPlotState(prev => ({
        ...prev,
        points: new Map(prev.points).set(key, result),
        selectedPoint: point
      }));
    }
  }, [parameters, plotState.gridEnabled, transform, calculateGridSpacing]);

  const handleReset = useCallback(() => {
    setTransform(zoomIdentity);
  }, []);

  const handleClear = useCallback(() => {
    setPlotState(prev => ({
      ...prev,
      points: new Map(),
      selectedPoint: undefined
    }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setPlotState(prev => {
      const newGridEnabled = !prev.gridEnabled;
      if (newGridEnabled) {
        // Update grid spacing when enabling grid
        setParameters(p => ({
          ...p,
          gridSpacing: calculateGridSpacing(transform)
        }));
      }
      return { ...prev, gridEnabled: newGridEnabled };
    });
  }, [transform, calculateGridSpacing]);

  const handleShowMandelbrot = useCallback(() => {
    // Define initial scales
    const xScale = scaleLinear()
      .domain(DEFAULT_PLOT_OPTIONS.xRange)
      .range([0, plotDimensions.width]);

    const yScale = scaleLinear()
      .domain(DEFAULT_PLOT_OPTIONS.yRange)
      .range([plotDimensions.height, 0]);

    // Apply the current transform to the scales
    const newXScale = transform.rescaleX(xScale);
    const newYScale = transform.rescaleY(yScale);

    // Get the visible domain ranges
    const visibleXRange: [number, number] = [newXScale.invert(0), newXScale.invert(plotDimensions.width)];
    const visibleYRange: [number, number] = [newYScale.invert(plotDimensions.height), newYScale.invert(0)];

    console.log('Requesting Mandelbrot set for:', visibleXRange, visibleYRange);

    // Calculate resolution based on zoom level
    const resolution = Math.min(plotDimensions.width, plotDimensions.height) / 200;

    setRenderProgress(0);

    rendererRef.current?.computeMandelbrot(
      visibleXRange,
      visibleYRange,
      resolution,
      parameters.maxIterations,
      (points, progress) => {
        setPlotState(prev => ({ ...prev, points: new Map(points) }));
        setRenderProgress(progress);
      }
    );
  }, [parameters.maxIterations, plotDimensions, transform]);

  const handleZoomIn = useCallback(() => {
    setTransform(transform.scale(1.5));
  }, [transform]);

  const handleZoomOut = useCallback(() => {
    setTransform(transform.scale(0.75));
  }, [transform]);

  const selectedResult = plotState.selectedPoint 
    ? plotState.points.get(`${plotState.selectedPoint.x},${plotState.selectedPoint.y}`)
    : undefined;

  return (
    <div className="app">
      <Toolbar
        onReset={handleReset}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onToggleGrid={handleToggleGrid}
        onClear={handleClear}
        onShowMandelbrot={handleShowMandelbrot}
        isGridEnabled={plotState.gridEnabled}
      />
      
      <div className="main-content">
        {renderProgress > 0 && renderProgress < 1 && (
          <div className="progress-overlay">
            <div className="progress-bar" style={{ width: `${renderProgress * 100}%` }} />
          </div>
        )}
        <div className="plot-container" ref={plotContainerRef}>
          <Plot
            options={{
              ...DEFAULT_PLOT_OPTIONS,
              width: plotDimensions.width,
              height: plotDimensions.height
            }}
            state={plotState}
            onPointClick={handlePointClick}
            onZoomChange={handleZoomChange}
            transform={transform}
            maxIterations={parameters.maxIterations}
            width={plotDimensions.width}
            height={plotDimensions.height}
          />
        </div>
        
        <div className="side-panel">
          <ParameterPanel
            parameters={parameters}
            onChange={handleParameterChange}
          />
          
          <SequencePanel
            result={selectedResult}
            selectedPoint={plotState.selectedPoint 
              ? { real: plotState.selectedPoint.x, imag: plotState.selectedPoint.y }
              : undefined}
          />
        </div>
      </div>
    </div>
  );
}; 