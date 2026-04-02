import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveEngramSettings } from '../../src/config/load-engram-settings.js';
import { loadMemorySnapshot, searchMemorySnapshot } from '../../src/services/memory-query.js';
import { loadReviewState } from '../../src/services/review-service.js';
import { DEFAULT_CONFIG } from '@engram/core';

describe('plugin-kit services', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-plugin-kit-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');

    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(globalDir, 'state'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads section summaries for a project and filters entries by query', () => {
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-30T00:00:00.000Z\nentries: 1\n---\n\n- Use pnpm [2026-03-30]\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'project_auth.md'),
      `---
name: Auth
description: Auth uses redis [2026-03-30]
type: project
updated: 2026-03-30T00:00:00.000Z
---

Auth uses redis [2026-03-30]
`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'decision_tokens.md'),
      `---
name: Tokens
description: Tokens are short-lived [2026-03-30]
type: decision
updated: 2026-03-30T00:00:00.000Z
---

Tokens are short-lived [2026-03-30]
`,
      'utf8',
    );

    const snapshot = loadMemorySnapshot(globalDir, projectDir);

    expect(snapshot.sections.map((section) => section.heading)).toEqual([
      'Project Context',
      'Project Decisions',
      'User Preferences',
    ]);
    expect(snapshot.sections[0]?.entries[0]).toContain('Auth uses redis');

    const filtered = searchMemorySnapshot('redis', snapshot);

    expect(filtered).toEqual({
      sections: [
        {
          heading: 'Project Context',
          entries: ['Auth uses redis [2026-03-30]'],
        },
      ],
    });
  });

  it('does not create directories when loading a memory snapshot', () => {
    fs.rmSync(globalDir, { recursive: true, force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });

    expect(loadMemorySnapshot(globalDir, projectDir)).toEqual({
      sections: [],
      globalCount: 0,
      projectCount: 0,
    });
    expect(fs.existsSync(globalDir)).toBe(false);
    expect(fs.existsSync(projectDir)).toBe(false);
  });

  it('reports review-needed state from session history', () => {
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 2,
          session_summary: 'Session covered the auth flow and cache invalidation.',
          last_processed: '2026-03-30T12:00:00.000Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    expect(loadReviewState(globalDir, projectDir)).toEqual({
      pending: true,
      summary: 'Session covered the auth flow and cache invalidation.',
      stale: true,
    });
  });

  it('does not create directories when reading review state', () => {
    fs.rmSync(globalDir, { recursive: true, force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });

    expect(loadReviewState(globalDir, projectDir)).toEqual({
      pending: false,
      stale: false,
      summary: null,
    });
    expect(fs.existsSync(globalDir)).toBe(false);
    expect(fs.existsSync(projectDir)).toBe(false);
  });

  it('ignores undefined override values when resolving settings', () => {
    const resolved = resolveEngramSettings(
      {
        ...DEFAULT_CONFIG,
        deep_review: false,
        max_entries_per_file: 12,
      },
      {
        deep_review: undefined,
        max_entries_per_file: 25,
      } as never,
    );

    expect(resolved).toEqual({
      ...DEFAULT_CONFIG,
      deep_review: false,
      max_entries_per_file: 25,
    });
  });
});
