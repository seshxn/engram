import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateDiffOutput, generateOutput, getProjectDir, ensureDirs } from '@engram/core';
import { main as promptSubmitMain } from '../../src/prompt-submit.js';
import { runClaudeHook } from '../../src/plugin-kit-hooks.js';

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

describe('Claude Code prompt submit integration', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-prompt-hook-'));
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
    delete process.env.CLAUDE_PLUGIN_OPTION_INJECTION_BUDGET;
  });

  it('exits before reading stdin when disabled', async () => {
    process.env.ENGRAM_DISABLED = '1';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      return undefined as never;
    }) as never);

    await expect(promptSubmitMain()).resolves.toBeUndefined();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(hooksIoMock.readStdinJson).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('uses the shared hook bridge for prompt-submit directory setup', async () => {
    const bridgeGlobalDir = path.join(tmpDir, 'bridge-global');
    const bridgeCwd = path.join(tmpDir, 'bridge-workspace', 'repo');
    process.env.ENGRAM_HOME = bridgeGlobalDir;
    process.env.ENGRAM_CLAUDE_HOME = bridgeGlobalDir;

    let seenContext: { globalDir: string; projectDir: string } | null = null;

    await runClaudeHook({
      input: { cwd: bridgeCwd, session_id: 'session-123' },
      missingInputMessage: 'missing cwd in hook input',
      errorLabel: 'prompt submit hook error:',
      action: (context) => {
        seenContext = context;
      },
    });

    expect(seenContext).toEqual({
      globalDir: bridgeGlobalDir,
      projectDir: getProjectDir(bridgeCwd, bridgeGlobalDir),
    });
    expect(ensureDirs).toHaveBeenCalledWith(bridgeGlobalDir, getProjectDir(bridgeCwd, bridgeGlobalDir));
  });

  it('runs the enabled prompt-submit entrypoint end to end', async () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    hooksIoMock.readStdinJson.mockResolvedValueOnce({ cwd, session_id: 'session-123' });

    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await promptSubmitMain();

    expect(hooksIoMock.readStdinJson).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0]?.[0])).toContain('<engram-memory>');
    expect(String(logSpy.mock.calls[0]?.[0])).toContain('Uses pnpm');

    logSpy.mockRestore();
  });

  it('uses Claude plugin injection budget settings for prompt reinjection', async () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    process.env.CLAUDE_PLUGIN_OPTION_INJECTION_BUDGET = '280';
    hooksIoMock.readStdinJson.mockResolvedValueOnce({ cwd, session_id: 'session-123' });

    fs.writeFileSync(
      path.join(globalDir, 'config.json'),
      JSON.stringify({ injection_budget: 2000 }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      `---\nupdated: 2026-03-28T00:00:00Z\nentries: 2\n---\n\n- ${'Keep output terse'.padEnd(120, 'A')} [2026-03-28] [confidence:high]\n- ${'Mention every detail'.padEnd(120, 'B')} [2026-03-28] [confidence:low]\n`,
      'utf8',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await promptSubmitMain();

    expect(hooksIoMock.readStdinJson).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const output = String(logSpy.mock.calls[0]?.[0]);
    expect(output.length).toBeLessThanOrEqual(280);
    expect(output).toContain('Keep output terse');
    expect(output).not.toContain('Mention every detail');

    logSpy.mockRestore();
  });

  it('does not re-inject immediately after session start when nothing changed', () => {
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );

    const startOutput = generateOutput(globalDir, projectDir);
    const promptOutput = generateDiffOutput(globalDir, projectDir);

    expect(startOutput).toContain('Uses pnpm');
    expect(promptOutput).toBe('');
  });
});
