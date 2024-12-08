import React from 'react';
import { AnalysisResult, ComplexNumber } from '../types';

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
        <div className="empty-state">
          Click a point on the plot to analyze its sequence
        </div>
      </div>
    );
  }

  const formatComplex = (z: ComplexNumber): string => {
    const real = z.real.toFixed(4);
    const imag = Math.abs(z.imag).toFixed(4);
    const sign = z.imag >= 0 ? '+' : '-';
    return `${real} ${sign} ${imag}i`;
  };

  return (
    <div className="sequence-panel">
      <h3 className="panel-header">Sequence Analysis</h3>
      
      <div className="sequence-info">
        <div className="sequence-point">
          c = {formatComplex(selectedPoint)}
        </div>
        <div className={`sequence-behavior ${result.behavior}`}>
          {result.behavior.toUpperCase()}
          {result.escapeTime && ` at iteration ${result.escapeTime}`}
        </div>
      </div>

      <div className="sequence-viz">
        {result.sequence.map((point, i) => (
          <div key={i} className="sequence-step">
            <span className="step-index">z_{i}</span>
            <span className="step-value">{formatComplex(point.z)}</span>
            {i > 0 && (
              <span className="step-abs">
                |z| = {complexAbs(point.z).toFixed(4)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="sequence-details">
        <h4 className="panel-subheader">Details</h4>
        <div className="details-grid">
          <div>
            <span className="detail-label">Total Steps</span>
            <span className="detail-value">{result.sequence.length}</span>
          </div>
          {result.escapeTime && (
            <div>
              <span className="detail-label">Escape Time</span>
              <span className="detail-value">{result.escapeTime}</span>
            </div>
          )}
          <div>
            <span className="detail-label">Final |z|</span>
            <span className="detail-value">
              {complexAbs(result.sequence[result.sequence.length - 1].z).toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function complexAbs(z: ComplexNumber): number {
  return Math.sqrt(z.real * z.real + z.imag * z.imag);
} 