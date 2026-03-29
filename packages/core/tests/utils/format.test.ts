import { describe, expect, it } from 'vitest';
import { formatMemoryXml, formatReviewXml, formatSummaryLine } from '../../src/utils/format.js';

describe('format', () => {
  it('wraps non-empty sections in engram-memory tags', () => {
    const result = formatMemoryXml([
      { heading: 'User Preferences', entries: ['Prefers explicit types [2026-03-28]'] },
      { heading: 'Project Context', entries: ['Uses Next.js [2026-03-28]'] },
    ]);

    expect(result).toContain('<engram-memory>');
    expect(result).toContain('</engram-memory>');
    expect(result).toContain('## User Preferences');
    expect(result).toContain('- Prefers explicit types [2026-03-28]');
  });

  it('returns an empty string when there are no entries', () => {
    expect(formatMemoryXml([])).toBe('');
    expect(formatMemoryXml([{ heading: 'Ignored', entries: [] }])).toBe('');
  });

  it('wraps the review prompt in engram-review tags without instructing Claude to edit files', () => {
    const result = formatReviewXml('Session summary here');

    expect(result).toContain('<engram-review>');
    expect(result).toContain('</engram-review>');
    expect(result).toContain('Session summary here');
    expect(result).toContain('memory system managed by the engram plugin');
    expect(result).toContain('<engram-suggestions>');
    expect(result).toContain('Do not write files directly');
    expect(result).not.toContain('/home/test/.engram/memory');
  });

  it('formats the summary line with counts', () => {
    expect(formatSummaryLine(3, 5)).toBe('Engram: loaded 3 global + 5 project memories');
    expect(formatSummaryLine(0, 0)).toBe('Engram: loaded 0 global + 0 project memories');
  });
});
