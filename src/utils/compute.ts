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

function getOptimalResolution(
  xRange: [number, number],
  yRange: [number, number],
  screenWidth: number,
  screenHeight: number
): number {
  // Calculate the domain-to-screen ratio
  const domainWidth = Math.abs(xRange[1] - xRange[0]);
  const domainHeight = Math.abs(yRange[1] - yRange[0]);
  const pixelsPerUnit = Math.min(screenWidth / domainWidth, screenHeight / domainHeight);
  
  // Aim for roughly 1 point per 4-5 pixels for smooth appearance without excess
  const pointSpacing = 4 / pixelsPerUnit;
  
  // Calculate how many points we need in each dimension
  return Math.min(
    Math.ceil(Math.max(domainWidth, domainHeight) / pointSpacing),
    300 // Cap maximum resolution to prevent performance issues
  );
}

export function generateMandelbrotPoints(
  xRange: [number, number],
  yRange: [number, number],
  screenWidth: number,
  screenHeight: number,
  maxIterations: number = 100
): Map<string, AnalysisResult> {
  const points = new Map<string, AnalysisResult>();
  
  // Get optimal resolution based on screen dimensions
  const resolution = getOptimalResolution(xRange, yRange, screenWidth, screenHeight);
  
  const dx = (xRange[1] - xRange[0]) / resolution;
  const dy = (yRange[1] - yRange[0]) / resolution;

  // Quick escape test before computing sequence
  const isLikelyInSet = (x: number, y: number): boolean => {
    // Cardioid test
    const q = (x - 0.25) ** 2 + y * y;
    if (q * (q + (x - 0.25)) <= 0.25 * y * y) return true;
    
    // Period-2 bulb test
    if ((x + 1) ** 2 + y * y <= 0.0625) return true;
    
    return false;
  };

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const x = xRange[0] + i * dx;
      const y = yRange[0] + j * dy;
      
      // Skip points that are definitely in the set
      if (isLikelyInSet(x, y)) {
        const key = `${x},${y}`;
        points.set(key, {
          sequence: [{ z: { real: x, imag: y }, iteration: 0 }],
          behavior: 'converges'
        });
        continue;
      }
      
      const c = { real: x, imag: y };
      const z0 = { real: 0, imag: 0 };
      const result = computeSequence(z0, c, maxIterations);
      
      const key = `${x},${y}`;
      points.set(key, result);
    }
  }
  
  return points;
} 