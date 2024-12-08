import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ParameterPanel } from './components/ParameterPanel';
import { Plot } from './components/Plot';
import { SequencePanel } from './components/SequencePanel';
import { Toolbar } from './components/Toolbar';
import { ComplexNumber, Parameters, PlotState, Point } from './types';
import { computeGrid, computeSequence, generateMandelbrotPoints } from './utils/compute';

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
  const [transform, setTransform] = useState<ViewTransform>({ k: 1, x: 0, y: 0 });
  const [plotDimensions, setPlotDimensions] = useState({ width: 800, height: 600 });
  const plotContainerRef = useRef<HTMLDivElement>(null);

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
    setTransform(newTransform);
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
    console.log('Point clicked:', point);
    const c: ComplexNumber = { real: point.x, imag: point.y };
    
    if (plotState.gridEnabled) {
      console.log('Computing grid...');
      const gridResults = computeGrid(
        c, 
        parameters.gridSize, 
        calculateGridSpacing(transform), // Use current optimal spacing
        parameters.z0, 
        parameters.maxIterations
      );
      setPlotState(prev => ({
        ...prev,
        points: new Map([...prev.points, ...gridResults]),
        selectedPoint: point
      }));
    } else {
      console.log('Computing sequence...');
      const result = computeSequence(parameters.z0, c, parameters.maxIterations);
      console.log('Sequence result:', result);
      const key = `${point.x},${point.y}`;
      setPlotState(prev => ({
        ...prev,
        points: new Map(prev.points).set(key, result),
        selectedPoint: point
      }));
    }
  }, [parameters, plotState.gridEnabled, transform, calculateGridSpacing]);

  const handleReset = useCallback(() => {
    setPlotState(prev => ({ ...prev, selectedPoint: undefined }));
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
    // Get the plot dimensions in domain coordinates
    const plotWidth = plotDimensions.width;
    const plotHeight = plotDimensions.height;
    
    // Convert screen coordinates to domain coordinates
    const getDataCoord = (screenX: number, screenY: number) => ({
      x: (screenX - plotWidth / 2) / (plotWidth * transform.k) - transform.x,
      y: (plotHeight / 2 - screenY) / (plotHeight * transform.k) - transform.y
    });
    
    // Get visible area bounds in domain coordinates
    const topLeft = getDataCoord(0, 0);
    const bottomRight = getDataCoord(plotWidth, plotHeight);
    
    const mandelbrotPoints = generateMandelbrotPoints(
      [topLeft.x, bottomRight.x],
      [bottomRight.y, topLeft.y],
      200,  // increased resolution for better detail
      parameters.maxIterations
    );

    setPlotState(prev => ({
      ...prev,
      points: mandelbrotPoints,
      selectedPoint: undefined
    }));
  }, [transform, parameters.maxIterations, plotDimensions.width, plotDimensions.height]);

  const selectedResult = plotState.selectedPoint 
    ? plotState.points.get(`${plotState.selectedPoint.x},${plotState.selectedPoint.y}`)
    : undefined;

  return (
    <div className="app">
      <Toolbar
        onReset={handleReset}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onToggleGrid={handleToggleGrid}
        onClear={handleClear}
        onShowMandelbrot={handleShowMandelbrot}
        isGridEnabled={plotState.gridEnabled}
      />
      
      <div className="main-content">
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