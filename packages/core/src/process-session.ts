import * as fs from 'fs';
import * as path from 'path';
import { runAllExtractors } from './extractors/index.js';
import type { ExtractionResult } from './extractors/types.js';
import { writeEntries, writeProjectMemoryEntries } from './memory/writer.js';
import { summarizeTranscript } from './transcript/summarizer.js';
import type { MessagePair } from './transcript/types.js';
import { loadConfig, type EngramConfig } from './utils/config.js';
import { ensureDirs } from './utils/paths.js';

interface SessionState {
  needs_deep_review: boolean;
  review_age: number;
  session_summary?: string;
  last_processed: string;
}

const groupResults = (results: ExtractionResult[]): Map<string, ExtractionResult[]> => {
  const grouped = new Map<string, ExtractionResult[]>();

  for (const result of results) {
    const key = `${result.scope}:${result.target}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(result);
    grouped.set(key, bucket);
  }

  return grouped;
};

export const processSession = async (
  pairs: MessagePair[],
  globalDir: string,
  projectDir: string,
  configOverrides?: Partial<EngramConfig>,
): Promise<void> => {
  ensureDirs(globalDir, projectDir);

  const config = { ...loadConfig(globalDir), ...configOverrides };
  const grouped = groupResults(runAllExtractors(pairs));
  const today = new Date().toISOString().split('T')[0];

  for (const [key, results] of grouped.entries()) {
    const [scope, target] = key.split(':');
    const entries = results.map((result) => `${result.entry} [${today}]`);

    if (scope === 'global') {
      const filePath = path.join(globalDir, 'memory', `${target}.md`);
      writeEntries(filePath, entries, {
        maxEntries: config.max_entries_per_file,
        maxChars: config.max_chars_per_file,
      });
    } else {
      writeProjectMemoryEntries(projectDir, target as ExtractionResult['target'], entries);
    }
  }

  const state: SessionState = {
    needs_deep_review: false,
    review_age: 0,
    last_processed: new Date().toISOString(),
  };

  if (config.deep_review && pairs.length >= config.deep_review_threshold) {
    state.needs_deep_review = true;
    state.session_summary = summarizeTranscript(pairs);
  }

  fs.writeFileSync(
    path.join(projectDir, 'state', 'session-history.json'),
    JSON.stringify(state, null, 2),
    'utf8',
  );
};
