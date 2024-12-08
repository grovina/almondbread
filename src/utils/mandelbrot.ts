import { AnalysisResult } from '../types';

interface Chunk {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  resolution: number;
  maxIterations: number;
}

export class MandelbrotRenderer {
  private worker: Worker;
  private cache: Map<string, AnalysisResult>;
  private chunkSize = 25; // Smaller chunks for more frequent updates
  private onProgress?: (progress: number) => void;
  private onComplete?: () => void;
  private abortController?: AbortController;

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

  private getChunkKey(chunk: Chunk): string {
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

  private chunks: Chunk[] = [];
  private totalChunks = 0;

  generatePoints(
    xRange: [number, number],
    yRange: [number, number],
    resolution: number,
    maxIterations: number,
    onProgress?: (progress: number) => void,
    onComplete?: () => void
  ): Map<string, AnalysisResult> {
    // Cancel any ongoing computation
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.onProgress = onProgress;
    this.onComplete = onComplete;

    // Use progressive resolution
    const initialResolution = Math.min(resolution, 100);
    
    // Split the area into chunks with progressive detail
    const xChunks = Math.ceil(initialResolution / this.chunkSize);
    const yChunks = Math.ceil(initialResolution / this.chunkSize);

    this.chunks = [];
    
    // Calculate chunks in a grid pattern instead of spiral
    const xStep = (xRange[1] - xRange[0]) / xChunks;
    const yStep = (yRange[1] - yRange[0]) / yChunks;

    for (let i = 0; i < xChunks; i++) {
      for (let j = 0; j < yChunks; j++) {
        this.chunks.push({
          xStart: xRange[0] + i * xStep,
          xEnd: xRange[0] + (i + 1) * xStep,
          yStart: yRange[0] + j * yStep,
          yEnd: yRange[0] + (j + 1) * yStep,
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
    this.abortController?.abort();
    this.worker.terminate();
  }

  public getCache(): Map<string, AnalysisResult> {
    return this.cache;
  }
} 