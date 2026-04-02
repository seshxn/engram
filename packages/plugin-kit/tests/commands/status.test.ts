import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadMemorySnapshot } from '../../src/services/memory-query.js';
import { runStatusCommand } from '../../src/commands/status.js';

describe('status command', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-status-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');

    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(globalDir, 'state'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'state'), { recursive: true });

    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-30T00:00:00.000Z\nentries: 1\n---\n\n- Use pnpm [2026-03-30]\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'project_auth.md'),
      '---\nname: Auth\ndescription: Auth uses redis [2026-03-30]\ntype: project\nupdated: 2026-03-30T00:00:00.000Z\n---\n\nAuth uses redis [2026-03-30]\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify({ last_processed: '2026-03-30T12:00:00.000Z' }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(globalDir, 'state', 'stats.json'),
      JSON.stringify({ session_count: 3 }, null, 2),
      'utf8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns counts and state paths as data', () => {
    const snapshot = loadMemorySnapshot(globalDir, projectDir);

    expect(
      runStatusCommand({
        globalDir,
        projectDir,
        snapshot,
        sessionState: { last_processed: '2026-03-30T12:00:00.000Z' },
        stats: { session_count: 3 },
      }),
    ).toEqual({
      globalDir,
      projectDir,
      globalCount: 1,
      projectCount: 1,
      lastProcessed: '2026-03-30T12:00:00.000Z',
      sessionCount: 3,
    });
  });
});
