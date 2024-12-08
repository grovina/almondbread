import { AnalysisResult, ComplexNumber, SequencePoint } from '../types';

export function complexAdd(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real + b.real,
    imag: a.imag + b.imag
  };
}

export function complexMul(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}

export function complexAbs(z: ComplexNumber): number {
  return Math.sqrt(z.real * z.real + z.imag * z.imag);
}

export function computeSequence(
  z0: ComplexNumber,
  c: ComplexNumber,
  maxIterations: number
): AnalysisResult {
  const sequence: SequencePoint[] = [{ z: z0, iteration: 0 }];
  let z = z0;

  for (let i = 1; i <= maxIterations; i++) {
    z = complexAdd(complexMul(z, z), c);
    sequence.push({ z, iteration: i });

    if (complexAbs(z) > 2) {
      return {
        sequence,
        behavior: 'diverges',
        escapeTime: i
      };
    }
  }

  return {
    sequence,
    behavior: 'converges'
  };
}

export function computeGrid(
  center: ComplexNumber,
  size: number,
  spacing: number,
  z0: ComplexNumber,
  maxIterations: number
): Map<string, AnalysisResult> {
  const results = new Map<string, AnalysisResult>();
  const offset = (size - 1) * spacing / 2;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const c: ComplexNumber = {
        real: center.real - offset + i * spacing,
        imag: center.imag - offset + j * spacing
      };
      
      const key = `${c.real},${c.imag}`;
      results.set(key, computeSequence(z0, c, maxIterations));
    }
  }

  return results;
}

export function generateMandelbrotPoints(
  xRange: [number, number],
  yRange: [number, number],
  resolution: number = 100,
  maxIterations: number = 100
): Map<string, AnalysisResult> {
  const points = new Map<string, AnalysisResult>();
  const dx = (xRange[1] - xRange[0]) / resolution;
  const dy = (yRange[1] - yRange[0]) / resolution;

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const x = xRange[0] + i * dx;
      const y = yRange[0] + j * dy;
      const c = { real: x, imag: y };
      const z0 = { real: 0, imag: 0 };
      const result = computeSequence(z0, c, maxIterations);
      
      const key = `${x},${y}`;
      points.set(key, result);
    }
  }
  
  return points;
} 