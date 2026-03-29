import { describe, expect, it } from 'vitest';
import { extractStruggles } from '../../src/extractors/struggles.js';
import type { MessagePair } from '../../src/transcript/types.js';

describe('struggles extractor', () => {
  it('captures repeated issues that appear three or more times', () => {
    const pairs: MessagePair[] = [
      { user: "I keep getting Cannot find module 'chalk'", assistant: 'Let us inspect the import path.' },
      { user: "Still seeing Cannot find module 'chalk'", assistant: 'The package may be missing.' },
      { user: "Again, Cannot find module 'chalk'", assistant: 'This keeps recurring.' },
    ];

    expect(extractStruggles(pairs)).toEqual([
      {
        entry: "Repeatedly struggles with: Cannot find module 'chalk'",
        target: 'user-patterns',
        scope: 'global',
      },
    ]);
  });

  it('returns empty when no issue repeats enough times', () => {
    expect(
      extractStruggles([
        { user: 'one issue', assistant: 'reply' },
        { user: 'another issue', assistant: 'reply' },
      ]),
    ).toEqual([]);
  });
});
