import fs from 'node:fs/promises';

export interface AnalysisCacheStats {
  entries: number;
  hits: number;
  misses: number;
  invalidations: number;
  pruned: number;
}

interface CacheEntry<T> {
  mtimeMs: number;
  size: number;
  value: T;
}

export interface AnalysisLookup<T> {
  value: T;
  hit: boolean;
}

/**
 * Process-local cache for expensive source-file analysis.
 *
 * The cache intentionally stores only derived in-memory analysis. It does not
 * persist source content or graph data into the scanned repository.
 */
export class SourceAnalysisCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private invalidations = 0;
  private pruned = 0;

  async get(filePath: string, analyze: (filePath: string) => Promise<T>): Promise<AnalysisLookup<T>> {
    const stat = await fs.stat(filePath);
    const existing = this.entries.get(filePath);

    if (existing && existing.mtimeMs === stat.mtimeMs && existing.size === stat.size) {
      this.hits += 1;
      return { value: existing.value, hit: true };
    }

    const value = await analyze(filePath);
    this.entries.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      value,
    });
    this.misses += 1;
    return { value, hit: false };
  }

  invalidate(filePath: string) {
    if (!this.entries.delete(filePath)) return false;
    this.invalidations += 1;
    return true;
  }

  retain(filePaths: Iterable<string>) {
    const keep = new Set(filePaths);
    let removed = 0;

    for (const filePath of this.entries.keys()) {
      if (keep.has(filePath)) continue;
      this.entries.delete(filePath);
      removed += 1;
    }

    this.pruned += removed;
    return removed;
  }

  clear() {
    const removed = this.entries.size;
    this.entries.clear();
    this.invalidations += removed;
    return removed;
  }

  has(filePath: string) {
    return this.entries.has(filePath);
  }

  stats(): AnalysisCacheStats {
    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      invalidations: this.invalidations,
      pruned: this.pruned,
    };
  }
}
