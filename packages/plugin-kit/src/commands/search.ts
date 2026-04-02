import { runSearchCommand as runSearchCommandRuntime } from '../runtime/index.js';
import type { MemorySearchResult, MemorySnapshot } from '../services/memory-query.js';

export interface SearchCommandInput {
  query: string;
  snapshot: MemorySnapshot;
}

export type SearchCommandResult = MemorySearchResult;

export const runSearchCommand = ({ query, snapshot }: SearchCommandInput): SearchCommandResult =>
  runSearchCommandRuntime({ query, snapshot });
