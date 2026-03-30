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
        confidence: 'high',
      },
    ]);
  });

  it('captures explicit plan statements as project decisions', () => {
    const results = extractDecisions('the plan is to ship the CLI first', 'Sounds good.');

    expect(results).toEqual([
      {
        entry: 'Ship the CLI first',
        target: 'project-decisions',
        scope: 'project',
        confidence: 'high',
      },
    ]);
  });

  it('returns no results for unrelated messages', () => {
    expect(extractDecisions('can you compare options?', 'Here are some options.')).toEqual([]);
  });
});
