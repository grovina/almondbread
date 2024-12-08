export interface Point {
  x: number;
  y: number;
}

export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface SequencePoint {
  z: ComplexNumber;
  iteration: number;
}

export interface AnalysisResult {
  sequence: SequencePoint[];
  behavior: 'converges' | 'diverges';
  escapeTime?: number;
}

export interface Parameters {
  z0: ComplexNumber;
  maxIterations: number;
  gridSize: number;
  gridSpacing: number;
}

export interface PlotState {
  points: Map<string, AnalysisResult>;
  selectedPoint?: Point;
  gridEnabled: boolean;
}

export interface PlotOptions {
  xRange: [number, number];
  yRange: [number, number];
  width: number;
  height: number;
} 