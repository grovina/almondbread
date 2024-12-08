import { AnalysisResult } from '../types';

export class MandelbrotRenderer {
  private worker: Worker;
  private cache: Map<string, AnalysisResult>;
  private chunkSize = 50;
  private onProgress?: (progress: number) => void;
  private onComplete?: () => void;

  constructor() {
    this.worker = new Worker(new URL('./mandelbrot.worker.ts', import.meta.url), { type: 'module' });
    this.cache = new Map();
    
    this.worker.onmessage = (e) => {
      const { points } = e.data;
      points.forEach(([key, value]: [string, AnalysisResult]) => {
        this.cache.set(key, value);
      });
      this.processNextChunk();
    };
  }

  private getChunkKey(chunk: any): string {
    return `${chunk.xStart},${chunk.xEnd},${chunk.yStart},${chunk.yEnd},${chunk.resolution}`;
  }

  private processNextChunk() {
    if (this.chunks.length === 0) {
      this.onComplete?.();
      return;
    }

    const chunk = this.chunks.shift()!;
    const key = this.getChunkKey(chunk);
    
    if (this.cache.has(key)) {
      this.processNextChunk();
      return;
    }

    this.worker.postMessage({ type: 'compute', chunk });
    this.onProgress?.(1 - this.chunks.length / this.totalChunks);
  }

  private chunks: any[] = [];
  private totalChunks = 0;

  generatePoints(
    xRange: [number, number],
    yRange: [number, number],
    resolution: number,
    maxIterations: number,
    onProgress?: (progress: number) => void,
    onComplete?: () => void
  ): Map<string, AnalysisResult> {
    this.onProgress = onProgress;
    this.onComplete = onComplete;

    // Split the area into chunks
    const xChunks = Math.ceil(resolution / this.chunkSize);
    const yChunks = Math.ceil(resolution / this.chunkSize);
    const dx = (xRange[1] - xRange[0]) / xChunks;
    const dy = (yRange[1] - yRange[0]) / yChunks;

    this.chunks = [];
    for (let i = 0; i < xChunks; i++) {
      for (let j = 0; j < yChunks; j++) {
        this.chunks.push({
          xStart: xRange[0] + i * dx,
          xEnd: xRange[0] + (i + 1) * dx,
          yStart: yRange[0] + j * dy,
          yEnd: yRange[0] + (j + 1) * dy,
          resolution: this.chunkSize,
          maxIterations
        });
      }
    }

    this.totalChunks = this.chunks.length;
    this.processNextChunk();
    return this.cache;
  }

  terminate() {
    this.worker.terminate();
  }
} 