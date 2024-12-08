import React, { useCallback, useState } from 'react';
import { ParameterPanel } from './components/ParameterPanel';
import { Plot } from './components/Plot';
import { SequencePanel } from './components/SequencePanel';
import { Toolbar } from './components/Toolbar';
import { ComplexNumber, Parameters, PlotState, Point } from './types';
import { computeGrid, computeSequence } from './utils/compute';

const DEFAULT_PARAMETERS: Parameters = {
  z0: { real: 0, imag: 0 },
  maxIterations: 100,
  gridSize: 11,
  gridSpacing: 0.1
};

const DEFAULT_PLOT_OPTIONS = {
  xRange: [-2, 0.5] as [number, number],
  yRange: [-1.25, 1.25] as [number, number],
  width: 800,
  height: 600
};

export const App: React.FC = () => {
  const [parameters, setParameters] = useState<Parameters>(DEFAULT_PARAMETERS);
  const [plotState, setPlotState] = useState<PlotState>({
    points: new Map(),
    gridEnabled: false
  });

  const handleParameterChange = useCallback((params: Partial<Parameters>) => {
    setParameters(prev => ({ ...prev, ...params }));
  }, []);

  const handlePointClick = useCallback((point: Point) => {
    console.log('Point clicked:', point);
    const c: ComplexNumber = { real: point.x, imag: point.y };
    
    if (plotState.gridEnabled) {
      console.log('Computing grid...');
      const gridResults = computeGrid(c, parameters.gridSize, parameters.gridSpacing, parameters.z0, parameters.maxIterations);
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
  }, [parameters, plotState.gridEnabled]);

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
    setPlotState(prev => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  }, []);

  const selectedResult = plotState.selectedPoint 
    ? plotState.points.get(`${plotState.selectedPoint.x},${plotState.selectedPoint.y}`)
    : undefined;

  return (
    <div className="app">
      <Toolbar
        onReset={handleReset}
        onZoomIn={() => {}} // TODO: Implement zoom controls
        onZoomOut={() => {}}
        onToggleGrid={handleToggleGrid}
        onClear={handleClear}
        isGridEnabled={plotState.gridEnabled}
      />
      
      <div className="main-content">
        <Plot
          options={DEFAULT_PLOT_OPTIONS}
          state={plotState}
          onPointClick={handlePointClick}
        />
        
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