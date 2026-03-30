import { describe, expect, it } from 'vitest';
import { extractReviewSuggestions } from '../../src/extractors/review-suggestions.js';

describe('review suggestions extractor', () => {
  it('captures structured assistant suggestions emitted by deep review', () => {
    const results = extractReviewSuggestions(
      'anything else?',
      `Here are the missed memories.

<engram-suggestions>
## User Preferences
- Use pnpm not npm for this project

## Project Context
- Staging uses a different schema

## Pending Items (Project)
- Add rate limiting
</engram-suggestions>`,
    );

    expect(results).toEqual([
      {
        entry: 'Use pnpm not npm for this project',
        scope: 'global',
        target: 'user-preferences',
        confidence: 'high',
      },
      {
        entry: 'Staging uses a different schema',
        scope: 'project',
        target: 'project-context',
        confidence: 'high',
      },
      {
        entry: 'Add rate limiting',
        scope: 'project',
        target: 'pending-items',
        confidence: 'high',
      },
    ]);
  });

  it('ignores assistant messages without engram suggestions', () => {
    expect(extractReviewSuggestions('hello', 'No structured suggestions here.')).toEqual([]);
  });
});
