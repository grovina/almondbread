import Decimal from 'decimal.js';
import { AnalysisResult } from '../types';

interface ComputeMessage {
  type: 'compute';
  chunk: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
    resolution: {
      x: number;
      y: number;
    };
    maxIterations: number;
  };
}

// Configure Decimal precision
Decimal.set({ precision: 40 });

// Optimized computation using period checking and fast bailout
function computePoint(x0: number, y0: number, maxIterations: number): AnalysisResult {
  let x = new Decimal(0);
  let y = new Decimal(0);
  let x2 = new Decimal(0);
  let y2 = new Decimal(0);
  const c_real = new Decimal(x0);
  const c_imag = new Decimal(y0);
  
  let iteration = 0;
  
  // Period checking
  let period = 0;
  let xOld = 0;
  let yOld = 0;

  // Quick bailout for main cardioid and period-2 bulb
  const q = (x0 - 0.25) ** 2 + y0 * y0;
  if (q * (q + (x0 - 0.25)) <= 0.25 * y0 * y0 || 
      (x0 + 1) ** 2 + y0 * y0 <= 0.0625) {
    return {
      sequence: [{ z: { real: x0, imag: y0 }, iteration: 0 }],
      behavior: 'converges'
    };
  }

  while (iteration < maxIterations && x2.plus(y2).lte(4)) {
    y = x.times(2).times(y).plus(c_imag);
    x = x2.minus(y2).plus(c_real);
    x2 = x.times(x);
    y2 = y.times(y);
    
    // Period checking - detect cycles early
    if (x === xOld && y === yOld) {
      iteration = maxIterations;
      break;
    }
    
    period++;
    if (period > 20) {
      period = 0;
      xOld = x;
      yOld = y;
    }
    
    iteration++;
  }

  return {
    sequence: [
      { z: { real: x0, imag: y0 }, iteration: 0 },
      { z: { real: Number(x), imag: Number(y) }, iteration }
    ],
    behavior: iteration === maxIterations ? 'converges' : 'diverges',
    escapeTime: iteration
  };
}

self.onmessage = (e: MessageEvent<ComputeMessage>) => {
  if (e.data.type === 'compute') {
    const { xStart, xEnd, yStart, yEnd, resolution, maxIterations } = e.data.chunk;
    const points: [string, AnalysisResult][] = [];
    
    const dx = (xEnd - xStart) / (resolution.x - 1); // Adjust for inclusive endpoints
    const dy = (yEnd - yStart) / (resolution.y - 1);

    // Pre-calculate cardioid and period-2 bulb boundaries
    const cardioidBoundary = (x: number, y: number) => {
      const q = (x - 0.25) ** 2 + y * y;
      return q * (q + (x - 0.25)) <= 0.25 * y * y;
    };

    const period2Boundary = (x: number, y: number) => {
      return (x + 1) ** 2 + y * y <= 0.0625;
    };

    // Compute points with fixed resolution
    for (let i = 0; i < resolution.x; i++) {
      const x = xStart + i * dx;
      
      for (let j = 0; j < resolution.y; j++) {
        const y = yStart + j * dy;
        
        // Quick check for points definitely outside the set
        if (x * x + y * y > 4) {
          points.push([`${x},${y}`, {
            sequence: [{ z: { real: x, imag: y }, iteration: 1 }],
            behavior: 'diverges',
            escapeTime: 1
          }]);
          continue;
        }

        // Quick check for points definitely inside the set
        if (cardioidBoundary(x, y) || period2Boundary(x, y)) {
          points.push([`${x},${y}`, {
            sequence: [{ z: { real: x, imag: y }, iteration: 0 }],
            behavior: 'converges',
            escapeTime: maxIterations
          }]);
          continue;
        }
        
        const result = computePoint(x, y, maxIterations);
        points.push([`${x},${y}`, result]);
      }

      // Send progress updates more frequently
      if (i % 10 === 0) {
        self.postMessage({ 
          points,
          partial: true,
          chunkProgress: i / resolution.x
        });
        points.length = 0; // Clear points array after sending
      }
    }

    // Send any remaining points
    if (points.length > 0) {
      self.postMessage({ 
        points,
        partial: false,
        chunkProgress: 1
      });
    }
  }
}; 