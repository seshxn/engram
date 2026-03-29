import { describe, expect, it } from 'vitest';
import { extractDecisions } from '../../src/extractors/decisions.js';

describe('decisions extractor', () => {
  it('captures project decisions from explicit language', () => {
    const results = extractDecisions(
      "let's go with PostgreSQL for the database",
      'PostgreSQL selected.',
    );

    expect(results).toEqual([
      {
        entry: 'Go with PostgreSQL for the database',
        target: 'project-decisions',
        scope: 'project',
      },
    ]);
  });

  it('returns no results for unrelated messages', () => {
    expect(extractDecisions('can you compare options?', 'Here are some options.')).toEqual([]);
  });
});
