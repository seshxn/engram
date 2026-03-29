import { describe, expect, it } from 'vitest';
import {
  deduplicateEntries,
  isDuplicate,
  normalize,
  similarity,
} from '../../src/memory/dedup.js';

describe('dedup', () => {
  it('normalizes case, date tags, and whitespace', () => {
    expect(normalize('  Uses pnpm   not npm [2026-03-28]  ')).toBe('uses pnpm not npm');
  });

  it('reports 1.0 similarity for identical normalized values', () => {
    expect(similarity('Uses pnpm [2026-03-28]', 'uses pnpm [2026-03-27]')).toBe(1);
  });

  it('reports low similarity for different entries', () => {
    expect(similarity('Uses pnpm not npm', 'Deploys to AWS')).toBeLessThan(0.3);
  });

  it('detects near-duplicates above the threshold', () => {
    expect(
      isDuplicate(
        'Prefers explicit TypeScript types over inference',
        'Prefers explicit TypeScript type annotations over inference',
      ),
    ).toBe(true);
  });

  it('deduplicates incoming entries against existing ones and the batch itself', () => {
    const result = deduplicateEntries(
      ['Uses pnpm not npm [2026-03-27]'],
      [
        'Uses pnpm not npm [2026-03-28]',
        'Uses pnpm, not npm [2026-03-28]',
        'Prefers tabs over spaces [2026-03-28]',
      ],
    );

    expect(result.toAdd).toEqual(['Prefers tabs over spaces [2026-03-28]']);
    expect(result.toUpdate).toEqual([{ oldIndex: 0, newEntry: 'Uses pnpm not npm [2026-03-28]' }]);
  });
});
