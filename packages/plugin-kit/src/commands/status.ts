import { runStatusCommand as runStatusCommandRuntime } from '../runtime/index.js';
import type { MemorySnapshot } from '../services/memory-query.js';

export interface StatusCommandInput {
  globalDir: string;
  projectDir: string;
  sessionState?: { last_processed?: string } | null;
  snapshot: MemorySnapshot;
  stats?: { session_count?: number } | null;
}

export interface StatusCommandResult {
  globalCount: number;
  globalDir: string;
  lastProcessed: string;
  projectCount: number;
  projectDir: string;
  sessionCount: number;
}

export const runStatusCommand = ({
  globalDir,
  projectDir,
  sessionState,
  snapshot,
  stats,
}: StatusCommandInput): StatusCommandResult => {
  return runStatusCommandRuntime({
    globalDir,
    projectDir,
    sessionState,
    snapshot,
    stats,
  });
};
