import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateOutput, getProjectDir } from '@engram/core';

describe('Claude Code start hook integration', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-start-hook-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    projectDir = getProjectDir(cwd, globalDir);
    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('formats memory output for Claude Code hooks', () => {
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'project_uses-next-js.md'),
      `---
name: Uses Next.js
description: Uses Next.js [2026-03-28]
type: project
updated: 2026-03-28T00:00:00Z
---

Uses Next.js [2026-03-28]
`,
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir);

    expect(output).toContain('<engram-memory>');
    expect(output).toContain('## Project Context');
    expect(output).toContain('## User Preferences');
    expect(output).toContain('Engram: loaded 1 global + 1 project memories');
  });
});
