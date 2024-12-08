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
  const halfSize = (size - 1) * spacing / 2;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const c: ComplexNumber = {
        real: center.real - halfSize + i * spacing,
        imag: center.imag - halfSize + j * spacing
      };
      
      const key = `${c.real},${c.imag}`;
      results.set(key, computeSequence(z0, c, maxIterations));
    }
  }

  return results;
} 