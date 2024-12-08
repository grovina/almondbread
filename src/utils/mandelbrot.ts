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
    const dx = (xRange[1] - xRange[0]) / xChunks;
    const dy = (yRange[1] - yRange[0]) / yChunks;

    this.chunks = [];
    
    // Generate chunks in a spiral pattern from center outward
    const centerX = (xRange[0] + xRange[1]) / 2;
    const centerY = (yRange[0] + yRange[1]) / 2;
    
    for (let ring = 0; ring < Math.max(xChunks, yChunks); ring++) {
      for (let i = -ring; i <= ring; i++) {
        for (let j = -ring; j <= ring; j++) {
          if (Math.abs(i) === ring || Math.abs(j) === ring) {
            const chunk = {
              xStart: centerX + i * dx,
              xEnd: centerX + (i + 1) * dx,
              yStart: centerY + j * dy,
              yEnd: centerY + (j + 1) * dy,
              resolution: this.chunkSize,
              maxIterations
            };
            
            if (chunk.xStart >= xRange[0] && chunk.xEnd <= xRange[1] &&
                chunk.yStart >= yRange[0] && chunk.yEnd <= yRange[1]) {
              this.chunks.push(chunk);
            }
          }
        }
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
} 