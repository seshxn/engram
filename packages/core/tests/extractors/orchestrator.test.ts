import { describe, expect, it } from 'vitest';
import { runAllExtractors } from '../../src/extractors/index.js';
import type { MessagePair } from '../../src/transcript/types.js';

describe('extractor orchestrator', () => {
  it('runs all extractors and collects their results', () => {
    const pairs: MessagePair[] = [
      { user: 'no, use pnpm not npm', assistant: 'Switching to pnpm.' },
      { user: "let's go with PostgreSQL", assistant: 'Setting up PostgreSQL.' },
      { user: 'we still need to fix the auth bug', assistant: 'Noted.' },
      { user: 'remember that staging uses a different schema', assistant: 'Got it.' },
      { user: 'be more concise', assistant: 'Will do.' },
      { user: 'we use vitest and pnpm in this repo', assistant: 'Noted.' },
    ];

    const results = runAllExtractors(pairs);
    const targets = results.map((result) => result.target);

    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(targets).toContain('user-preferences');
    expect(targets).toContain('project-decisions');
    expect(targets).toContain('pending-items');
    expect(targets).toContain('project-context');
    expect(results.some((result) => result.entry === 'Be more concise')).toBe(true);
  });

  it('returns an empty array for an empty transcript', () => {
    expect(runAllExtractors([])).toEqual([]);
  });
});
