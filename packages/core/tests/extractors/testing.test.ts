import { describe, expect, it } from 'vitest';
import { extractTesting } from '../../src/extractors/testing.js';

describe('testing extractor', () => {
  it('captures project testing stack choices', () => {
    expect(extractTesting('we use vitest in this repo', 'Noted.')).toEqual([
      {
        entry: 'Use vitest',
        target: 'project-context',
        scope: 'project',
        confidence: 'medium',
      },
    ]);
  });

  it('captures global test workflow preferences', () => {
    expect(extractTesting('I always write tests first', 'Understood.')).toEqual([
      {
        entry: 'Write tests first',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ]);
  });
});
