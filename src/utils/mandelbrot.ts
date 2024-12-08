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

    // Ensure we have enough chunks to cover the entire area
    const xChunks = Math.ceil(resolution / this.chunkSize);
    const yChunks = Math.ceil(resolution / this.chunkSize);

    this.chunks = [];
    
    // Add a small overlap between chunks to prevent gaps
    const overlap = 0.001;
    const xStep = (xRange[1] - xRange[0]) / xChunks;
    const yStep = (yRange[1] - yRange[0]) / yChunks;

    for (let i = 0; i < xChunks; i++) {
      for (let j = 0; j < yChunks; j++) {
        this.chunks.push({
          xStart: xRange[0] + i * xStep - (i > 0 ? overlap : 0),
          xEnd: xRange[0] + (i + 1) * xStep + (i < xChunks - 1 ? overlap : 0),
          yStart: yRange[0] + j * yStep - (j > 0 ? overlap : 0),
          yEnd: yRange[0] + (j + 1) * yStep + (j < yChunks - 1 ? overlap : 0),
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