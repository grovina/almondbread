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

function computePoint(x: number, y: number, maxIterations: number): AnalysisResult {
  let zr = 0;
  let zi = 0;
  let zr2 = 0;
  let zi2 = 0;
  let n = 0;
  
  // Use optimized escape-time algorithm
  while (zr2 + zi2 <= 4 && n < maxIterations) {
    zi = 2 * zr * zi + y;
    zr = zr2 - zi2 + x;
    zr2 = zr * zr;
    zi2 = zi * zi;
    n++;
  }

  return {
    sequence: [{ z: { real: x, imag: y }, iteration: 0 }],
    behavior: n === maxIterations ? 'converges' : 'diverges',
    escapeTime: n
  };
}

self.onmessage = (e: MessageEvent<ComputeMessage>) => {
  if (e.data.type === 'compute') {
    const { xStart, xEnd, yStart, yEnd, resolution, maxIterations } = e.data.chunk;
    const points: [string, AnalysisResult][] = [];
    
    const dx = (xEnd - xStart) / resolution;
    const dy = (yEnd - yStart) / resolution;

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const x = xStart + i * dx;
        const y = yStart + j * dy;
        
        // Quick escape test
        const q = (x - 0.25) ** 2 + y * y;
        if (q * (q + (x - 0.25)) <= 0.25 * y * y || 
            (x + 1) ** 2 + y * y <= 0.0625) {
          points.push([`${x},${y}`, {
            sequence: [{ z: { real: x, imag: y }, iteration: 0 }],
            behavior: 'converges'
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