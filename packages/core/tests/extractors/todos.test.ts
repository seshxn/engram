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
        confidence: 'high',
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
        confidence: 'high',
      },
    ]);
  });

  it('defaults generic preference phrasing to global scope and local repo phrasing to project scope', () => {
    expect(extractTodos('todo: always add changelog notes', 'Noted.')).toEqual([
      {
        entry: 'Always add changelog notes',
        target: 'pending-items',
        scope: 'global',
        confidence: 'high',
      },
    ]);

    expect(extractTodos('todo: in this repo fix flaky auth test', 'Noted.')).toEqual([
      {
        entry: 'In this repo fix flaky auth test',
        target: 'pending-items',
        scope: 'project',
        confidence: 'high',
      },
    ]);
  });
});
