import { runInspectCommand as runInspectCommandRuntime } from '../runtime/index.js';
import type { MemorySnapshot } from '../services/memory-query.js';

export interface InspectCommandInput {
  globalDir: string;
  projectDir: string;
  snapshot: MemorySnapshot;
}

export interface InspectCommandResult {
  globalDir: string;
  projectDir: string;
  snapshot: MemorySnapshot;
}

export const runInspectCommand = ({
  globalDir,
  projectDir,
  snapshot,
}: InspectCommandInput): InspectCommandResult =>
  runInspectCommandRuntime({
    globalDir,
    projectDir,
    snapshot,
  });
