import { describe, expect, it } from 'vitest';
import { summarizeTranscript } from '../../src/transcript/summarizer.js';
import type { MessagePair } from '../../src/transcript/types.js';

describe('transcript summarizer', () => {
  it('summarizes message pairs into a compact text block', () => {
    const pairs: MessagePair[] = [
      { user: 'Use pnpm, not npm', assistant: 'I will switch to pnpm.' },
      { user: 'Let us use PostgreSQL', assistant: 'PostgreSQL selected.' },
    ];

    const summary = summarizeTranscript(pairs);

    expect(summary).toContain('Use pnpm, not npm');
    expect(summary).toContain('PostgreSQL');
  });

  it('stays within the 3000 character cap', () => {
    const pairs: MessagePair[] = Array.from({ length: 50 }, (_, index) => ({
      user: `User message ${index} ${'x'.repeat(120)}`,
      assistant: `Assistant response ${index} ${'y'.repeat(120)}`,
    }));

    const summary = summarizeTranscript(pairs);

    expect(summary.length).toBeLessThanOrEqual(3000);
  });
});
