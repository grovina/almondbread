import { AnalysisResult } from '../types';

interface ComputeMessage {
  type: 'compute';
  chunk: {
    xStart: number;
    xEnd: number;
    yStart: number;
    yEnd: number;
    resolution: number;
    maxIterations: number;
  };
}

// Optimized computation using period checking and fast bailout
function computePoint(x0: number, y0: number, maxIterations: number): AnalysisResult {
  let x = 0;
  let y = 0;
  let x2 = 0;
  let y2 = 0;
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

  while (iteration < maxIterations && x2 + y2 <= 4) {
    y = 2 * x * y + y0;
    x = x2 - y2 + x0;
    x2 = x * x;
    y2 = y * y;
    
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
      { z: { real: x, imag: y }, iteration }
    ],
    behavior: iteration === maxIterations ? 'converges' : 'diverges',
    escapeTime: iteration
  };
}

self.onmessage = (e: MessageEvent<ComputeMessage>) => {
  if (e.data.type === 'compute') {
    const { xStart, xEnd, yStart, yEnd, resolution, maxIterations } = e.data.chunk;
    const points: [string, AnalysisResult][] = [];
    
    const dx = (xEnd - xStart) / resolution;
    const dy = (yEnd - yStart) / resolution;

    // Compute points with adaptive step size
    for (let i = 0; i <= resolution; i++) {
      const x = xStart + i * dx;
      
      for (let j = 0; j <= resolution; j++) {
        const y = yStart + j * dy;
        
        // Skip computation for points far outside the set
        if (x * x + y * y > 4) {
          points.push([`${x},${y}`, {
            sequence: [{ z: { real: x, imag: y }, iteration: 1 }],
            behavior: 'diverges',
            escapeTime: 1
          }]);
          continue;
        }
        
        const result = computePoint(x, y, maxIterations);
        points.push([`${x},${y}`, result]);
      }
    }

    self.postMessage({ points });
  }
}; 