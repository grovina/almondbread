import React from 'react';
import { AnalysisResult, ComplexNumber } from '../types';
import { SequencePlot } from './SequencePlot';

interface SequencePanelProps {
  result?: AnalysisResult;
  selectedPoint?: ComplexNumber;
}

export const SequencePanel: React.FC<SequencePanelProps> = ({
  result,
  selectedPoint
}) => {
  if (!result || !selectedPoint) {
    return (
      <div className="sequence-panel">
        <h3 className="panel-header">Sequence Analysis</h3>
        <p className="empty-state">Click a point to analyze its sequence</p>
      </div>
    );
  }

  return (
    <div className="sequence-panel">
      <h3 className="panel-header">Sequence Analysis</h3>
      
      <div className="sequence-info">
        <div className="info-row">
          <span className="label">Point:</span>
          <span className="value">
            {selectedPoint.real.toFixed(4)} + {selectedPoint.imag.toFixed(4)}i
          </span>
        </div>
        
        <div className="info-row">
          <span className="label">Behavior:</span>
          <span className={`value ${result.behavior}`}>
            {result.behavior}
          </span>
        </div>
        
        {result.escapeTime && (
          <div className="info-row">
            <span className="label">Escape Time:</span>
            <span className="value">{result.escapeTime}</span>
          </div>
        )}
      </div>

      <SequencePlot result={result} />
      
      <div className="sequence-list">
        <h4 className="panel-subheader">Sequence Steps</h4>
        {result.sequence.map((point, i) => (
          <div key={i} className="sequence-step">
            <span className="step-number">z{i}</span>
            <span className="step-value">
              {point.z.real.toFixed(4)} + {point.z.imag.toFixed(4)}i
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}; 