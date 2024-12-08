import React from 'react';
import { Parameters } from '../types';

interface ParameterPanelProps {
  parameters: Parameters;
  onChange: (params: Partial<Parameters>) => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  parameters,
  onChange,
}) => {
  return (
    <div className="parameter-panel">
      <h3 className="panel-header">Parameters</h3>
      
      <div className="parameter-section">
        <label className="control-label">Initial Value (z₀)</label>
        <div className="input-group">
          <input
            type="number"
            className="compact-input"
            value={parameters.z0.real}
            onChange={(e) => 
              onChange({ 
                z0: { ...parameters.z0, real: parseFloat(e.target.value) }
              })
            }
            placeholder="Real Part"
            step="0.1"
          />
          <input
            type="number"
            className="compact-input"
            value={parameters.z0.imag}
            onChange={(e) => 
              onChange({ 
                z0: { ...parameters.z0, imag: parseFloat(e.target.value) }
              })
            }
            placeholder="Imaginary Part"
            step="0.1"
          />
        </div>
      </div>

      <div className="parameter-section">
        <label className="control-label">Maximum Iterations</label>
        <div className="input-group">
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={parameters.maxIterations}
            onChange={(e) => 
              onChange({ maxIterations: parseInt(e.target.value, 10) })
            }
            className="slider"
          />
          <input
            type="number"
            value={parameters.maxIterations}
            onChange={(e) => 
              onChange({ maxIterations: parseInt(e.target.value, 10) })
            }
            className="compact-input"
            min="10"
            max="1000"
            step="10"
          />
        </div>
      </div>

      <div className="parameter-section">
        <h4 className="panel-subheader">Grid Settings</h4>
        <div className="input-group">
          <div>
            <label className="control-label">Size</label>
            <input
              type="number"
              value={parameters.gridSize}
              onChange={(e) => 
                onChange({ gridSize: parseInt(e.target.value, 10) })
              }
              className="compact-input"
              min="3"
              max="51"
              step="2"
            />
          </div>
          <div>
            <label className="control-label">Spacing</label>
            <input
              type="number"
              value={parameters.gridSpacing}
              onChange={(e) => 
                onChange({ gridSpacing: parseFloat(e.target.value) })
              }
              className="compact-input"
              min="0.01"
              max="1"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 