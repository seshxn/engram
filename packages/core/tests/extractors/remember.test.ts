import { describe, expect, it } from 'vitest';
import { extractRemember } from '../../src/extractors/remember.js';

describe('remember extractor', () => {
  it('captures project context reminders', () => {
    const results = extractRemember(
      'remember that staging uses a different schema',
      'I will keep that in mind.',
    );

    expect(results).toEqual([
      {
        entry: 'Staging uses a different schema',
        target: 'project-context',
        scope: 'project',
        confidence: 'high',
      },
    ]);
  });

  it('routes preference reminders to global preferences', () => {
    const results = extractRemember(
      'keep in mind I prefer terse responses',
      'Understood.',
    );

    expect(results).toEqual([
      {
        entry: 'Prefer terse responses',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ]);
  });
});
