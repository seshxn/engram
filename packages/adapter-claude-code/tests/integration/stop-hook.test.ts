import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getProjectDir, processSession } from '@engram/core';
import { claudeCodeAdapter } from '../../src/transcript-adapter.js';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'transcripts',
);

describe('Claude Code stop hook integration', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-stop-hook-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    fs.mkdirSync(cwd, { recursive: true });
    projectDir = getProjectDir(cwd, globalDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('processes a Claude Code transcript into scoped memory files', async () => {
    const transcriptPath = path.join(FIXTURES, 'basic-session.jsonl');
    const pairs = await claudeCodeAdapter.parse(transcriptPath);

    await processSession(pairs, globalDir, projectDir);
    const projectIndex = fs.readFileSync(path.join(projectDir, 'memory', 'MEMORY.md'), 'utf8');

    expect(fs.readFileSync(path.join(globalDir, 'memory', 'user-preferences.md'), 'utf8')).toContain(
      'pnpm',
    );
    expect(projectIndex).toContain('PostgreSQL');
    expect(projectIndex).toContain('different schema');
    expect(fs.existsSync(path.join(cwd, '.engram'))).toBe(false);
  });
});
