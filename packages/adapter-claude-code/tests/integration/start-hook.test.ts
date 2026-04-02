import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateOutput, getProjectDir, ensureDirs } from '@engram/core';
import { main as startMain } from '../../src/session-start.js';
import { resolveClaudeDirectories } from '../../src/plugin-kit-hooks.js';

const hooksIoMock = vi.hoisted(() => ({
  readStdinJson: vi.fn(async () => {
    throw new Error('stdin should not be read when disabled');
  }),
}));

vi.mock('../../src/hooks-io.js', () => hooksIoMock);

vi.mock('@engram/core', async () => {
  const actual = await vi.importActual<typeof import('@engram/core')>('@engram/core');

  return {
    ...actual,
    ensureDirs: vi.fn(actual.ensureDirs),
  };
});

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
    hooksIoMock.readStdinJson.mockReset();
    hooksIoMock.readStdinJson.mockImplementation(async () => {
      throw new Error('stdin should not be read when disabled');
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.ENGRAM_HOME;
    delete process.env.ENGRAM_CLAUDE_HOME;
    delete process.env.ENGRAM_DISABLED;
    delete process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW;
  });

  it('exits before reading stdin when disabled', async () => {
    process.env.ENGRAM_DISABLED = '1';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      return undefined as never;
    }) as never);

    await expect(startMain()).resolves.toBeUndefined();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(hooksIoMock.readStdinJson).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('resolves Claude Code directories through the shared bridge', () => {
    const bridgeGlobalDir = path.join(tmpDir, 'bridge-global');
    const bridgeCwd = path.join(tmpDir, 'bridge-workspace', 'repo');
    process.env.ENGRAM_HOME = bridgeGlobalDir;
    process.env.ENGRAM_CLAUDE_HOME = bridgeGlobalDir;

    const dirs = resolveClaudeDirectories(bridgeCwd);

    expect(dirs).toEqual({
      globalDir: bridgeGlobalDir,
      projectDir: getProjectDir(bridgeCwd, bridgeGlobalDir),
    });
    expect(ensureDirs).toHaveBeenCalledWith(dirs.globalDir, dirs.projectDir);
  });

  it('runs the enabled session-start entrypoint end to end', async () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    hooksIoMock.readStdinJson.mockResolvedValueOnce({ cwd, session_id: 'session-123' });

    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await startMain();

    expect(hooksIoMock.readStdinJson).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0]?.[0])).toContain('<engram-memory>');
    expect(String(logSpy.mock.calls[0]?.[0])).toContain('Uses pnpm');

    logSpy.mockRestore();
  });

  it('uses Claude plugin deep review settings instead of only the file config', async () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW = 'false';
    hooksIoMock.readStdinJson.mockResolvedValueOnce({ cwd, session_id: 'session-123' });

    fs.writeFileSync(
      path.join(globalDir, 'config.json'),
      JSON.stringify({ deep_review: true }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 0,
          session_summary: 'Review the last session carefully.',
          last_processed: '2026-03-28T00:00:00Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await startMain();

    expect(hooksIoMock.readStdinJson).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
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
