import { describe, expect, it } from 'vitest';
import { confidenceRank, freshnessScore } from '../../src/memory/scoring.js';

describe('memory scoring', () => {
  it('gives recent entries a higher freshness score than older ones', () => {
    const now = new Date('2026-03-30T00:00:00.000Z');

    expect(freshnessScore('Recent item [2026-03-29]', now)).toBeGreaterThan(
      freshnessScore('Older item [2026-01-01]', now),
    );
  });

  it('falls back to a low score when an entry has no date tag', () => {
    expect(freshnessScore('Undated item')).toBe(0.1);
  });

  it('ranks low-confidence entries below high-confidence entries', () => {
    expect(confidenceRank('low')).toBeLessThan(confidenceRank('high'));
  });
});
