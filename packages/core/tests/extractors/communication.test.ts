import { describe, expect, it } from 'vitest';
import { extractCommunication } from '../../src/extractors/communication.js';

describe('communication extractor', () => {
  it('captures concise-answer preferences as global preferences', () => {
    expect(extractCommunication('be more concise', 'Okay.')).toEqual([
      {
        entry: 'Be more concise',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ]);
  });

  it('captures requests for more detail as preferences', () => {
    expect(extractCommunication('show me the code and explain more', 'Okay.')).toEqual([
      {
        entry: 'Show more code and explain in more detail',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ]);
  });
});
