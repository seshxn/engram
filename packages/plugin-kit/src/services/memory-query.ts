import { loadMemorySnapshot as loadMemorySnapshotRuntime, searchMemorySnapshot as searchMemorySnapshotRuntime } from '../runtime/index.js';

export interface MemorySnapshotSection {
  heading: string;
  entries: string[];
}

export interface MemorySnapshot {
  sections: MemorySnapshotSection[];
  globalCount: number;
  projectCount: number;
}

export interface MemorySearchSection {
  heading: string;
  entries: string[];
}

export interface MemorySearchResult {
  sections: MemorySearchSection[];
}

export const loadMemorySnapshot = (globalDir: string, projectDir: string): MemorySnapshot =>
  loadMemorySnapshotRuntime(globalDir, projectDir);

export const searchMemorySnapshot = (
  query: string,
  snapshot: MemorySnapshot,
): MemorySearchResult => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return { sections: snapshot.sections };
  }

  return searchMemorySnapshotRuntime(query, snapshot);
};
