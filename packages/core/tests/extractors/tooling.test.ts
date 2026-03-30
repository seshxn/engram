import { describe, expect, it } from 'vitest';
import { extractTooling } from '../../src/extractors/tooling.js';

describe('tooling extractor', () => {
  it('captures project tooling choices', () => {
    expect(extractTooling('this repo uses pnpm and eslint', 'Noted.')).toEqual([
      {
        entry: 'Use pnpm and eslint',
        target: 'project-context',
        scope: 'project',
        confidence: 'medium',
      },
    ]);
  });

  it('captures global tooling preferences', () => {
    expect(extractTooling('I prefer biome across all projects', 'Okay.')).toEqual([
      {
        entry: 'Prefer biome',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'medium',
      },
    ]);
  });
});
