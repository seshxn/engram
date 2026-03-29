import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateOutput } from '../../src/generate-output.js';
import { getProjectDir } from '../../src/utils/paths.js';

describe('generateOutput', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-output-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    projectDir = getProjectDir(cwd, globalDir);
    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(globalDir, 'state'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns an empty string when there are no memories or review prompts', () => {
    expect(generateOutput(globalDir, projectDir)).toBe('');
  });

  it('includes stored memories and a summary line', () => {
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir);

    expect(output).toContain('<engram-memory>');
    expect(output).toContain('Uses pnpm');
    expect(output).toContain('Engram: loaded 1 global + 0 project memories');
  });

  it('includes the deep review prompt when the flag is set', () => {
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 0,
          session_summary: 'Test summary',
          last_processed: '2026-03-28T00:00:00Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir);

    expect(output).toContain('<engram-review>');
    expect(output).toContain('Test summary');
  });

  it('expires deep review prompts after two sessions', () => {
    const statePath = path.join(projectDir, 'state', 'session-history.json');
    fs.writeFileSync(
      statePath,
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 0,
          session_summary: 'Summary',
          last_processed: '2026-03-28T00:00:00Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    expect(generateOutput(globalDir, projectDir)).toContain('<engram-review>');
    expect(generateOutput(globalDir, projectDir)).toContain('<engram-review>');
    expect(generateOutput(globalDir, projectDir)).not.toContain('<engram-review>');
  });
});
