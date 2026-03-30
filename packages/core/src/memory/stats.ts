import * as fs from 'fs';
import * as path from 'path';
import { readAllMemories } from './reader.js';

interface EngramStats {
  extractor_hits: Record<string, number>;
  global_entries: number;
  last_extraction_time: string | null;
  project_entries: number;
  session_count: number;
}

const statsPath = (globalDir: string): string => path.join(globalDir, 'state', 'stats.json');

const loadStats = (globalDir: string): EngramStats => {
  try {
    return JSON.parse(fs.readFileSync(statsPath(globalDir), 'utf8')) as EngramStats;
  } catch {
    return {
      extractor_hits: {},
      global_entries: 0,
      last_extraction_time: null,
      project_entries: 0,
      session_count: 0,
    };
  }
};

export const updateStats = (
  globalDir: string,
  projectDir: string,
  extractorHits: Record<string, number>,
  extractedAt: string,
): void => {
  const current = loadStats(globalDir);
  const counts = readAllMemories(globalDir, projectDir);
  const nextHits = { ...current.extractor_hits };

  for (const [name, hits] of Object.entries(extractorHits)) {
    nextHits[name] = (nextHits[name] ?? 0) + hits;
  }

  const next: EngramStats = {
    extractor_hits: nextHits,
    global_entries: counts.globalCount,
    last_extraction_time: extractedAt,
    project_entries: counts.projectCount,
    session_count: current.session_count + 1,
  };

  fs.writeFileSync(statsPath(globalDir), JSON.stringify(next, null, 2), 'utf8');
};
