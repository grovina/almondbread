import { AnalysisResult } from '../types';

interface Chunk {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  resolution: {
    x: number;
    y: number;
  };
  maxIterations: number;
}

interface Resolution {
  x: number;
  y: number;
}

export class MandelbrotRenderer {
  private worker: Worker;
  private cache: Map<string, AnalysisResult>;
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
    return `${chunk.xStart},${chunk.xEnd},${chunk.yStart},${chunk.yEnd},${chunk.resolution.x},${chunk.resolution.y}`;
  }

  private processNextChunk() {
    if (this.chunks.length === 0) {
      this.onComplete?.();
      return;
    }

    const chunk = this.chunks.shift()!;
    const key = this.getChunkKey(chunk);
    const currentChunkIndex = this.totalChunks - this.chunks.length - 1;
    
    if (this.cache.has(key)) {
      this.processNextChunk();
      return;
    }

    this.worker.onmessage = (e) => {
      const { points, partial, chunkProgress } = e.data;
      points.forEach(([key, value]: [string, AnalysisResult]) => {
        this.cache.set(key, value);
      });

      if (partial) {
        // Calculate total progress across all chunks
        const totalProgress = (currentChunkIndex + chunkProgress) / this.totalChunks;
        this.onProgress?.(totalProgress);
      } else {
        // Move to next chunk when complete
        this.processNextChunk();
      }
    };

    this.worker.postMessage({ type: 'compute', chunk });
  }

  private chunks: Chunk[] = [];
  private totalChunks = 0;

  generatePoints(
    xRange: [number, number],
    yRange: [number, number],
    resolution: Resolution,
    chunkSize: Resolution,
    maxIterations: number,
    onProgress?: (progress: number) => void,
    onComplete?: () => void
  ): Map<string, AnalysisResult> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.onProgress = onProgress;
    this.onComplete = onComplete;

    // Calculate chunks based on resolution
    const xChunks = Math.ceil(resolution.x / chunkSize.x);
    const yChunks = Math.ceil(resolution.y / chunkSize.y);

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
          resolution: {
            x: Math.min(chunkSize.x, resolution.x - i * chunkSize.x),
            y: Math.min(chunkSize.y, resolution.y - j * chunkSize.y)
          },
          maxIterations
        });
      }
    }

    this.totalChunks = this.chunks.length;
    // Shuffle chunks array
    this.chunks.sort(() => Math.random() - 0.5);
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

  computeMandelbrot(
    xRange: [number, number],
    yRange: [number, number],
    resolution: Resolution,
    maxIterations: number,
    callback: (points: [string, AnalysisResult][], progress: number) => void
  ) {
    // Calculate chunk sizes based on fixed resolution
    const chunkSize = {
      x: Math.ceil(resolution.x / 10), // Split into 10x10 chunks
      y: Math.ceil(resolution.y / 10)
    };

    return this.generatePoints(
      xRange,
      yRange,
      resolution,
      chunkSize,
      maxIterations,
      (progress) => {
        callback(Array.from(this.getCache()), progress);
      },
      () => callback(Array.from(this.getCache()), 1)
    );
  }
} 