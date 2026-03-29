import { describe, expect, it } from 'vitest';
import { extractCorrections } from '../../src/extractors/corrections.js';

describe('corrections extractor', () => {
  it('captures explicit user corrections as global preferences', () => {
    const results = extractCorrections(
      'no, use pnpm not npm for this project',
      'I will switch to pnpm.',
    );

    expect(results).toEqual([
      {
        entry: 'Use pnpm not npm for this project',
        target: 'user-preferences',
        scope: 'global',
      },
    ]);
  });

  it('returns no results for non-correction messages', () => {
    expect(extractCorrections('please add rate limiting', 'Working on it.')).toEqual([]);
  });
});
