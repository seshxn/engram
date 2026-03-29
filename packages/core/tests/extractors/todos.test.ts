import { describe, expect, it } from 'vitest';
import { extractTodos } from '../../src/extractors/todos.js';

describe('todos extractor', () => {
  it('captures project-scoped follow-up work', () => {
    const results = extractTodos('we still need to add rate limiting', 'Noted.');

    expect(results).toEqual([
      {
        entry: 'Add rate limiting',
        target: 'pending-items',
        scope: 'project',
      },
    ]);
  });

  it('captures cross-project reminders as global pending items', () => {
    const results = extractTodos(
      'do not forget to update my shell aliases across projects',
      'Noted.',
    );

    expect(results).toEqual([
      {
        entry: 'Update my shell aliases across projects',
        target: 'pending-items',
        scope: 'global',
      },
    ]);
  });
});
