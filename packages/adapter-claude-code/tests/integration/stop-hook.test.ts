import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getProjectDir, processSession, ensureDirs } from '@engram/core';
import { main as stopMain } from '../../src/session-stop.js';
import { runClaudeHook } from '../../src/plugin-kit-hooks.js';
import { claudeCodeAdapter } from '../../src/transcript-adapter.js';

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
  });

  it('exits before reading stdin when disabled', async () => {
    process.env.ENGRAM_DISABLED = '1';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      return undefined as never;
    }) as never);

    await expect(stopMain()).resolves.toBeUndefined();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(hooksIoMock.readStdinJson).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('passes transcript input through the shared hook bridge before processing', async () => {
    const bridgeGlobalDir = path.join(tmpDir, 'bridge-global');
    const bridgeCwd = path.join(tmpDir, 'bridge-workspace', 'repo');
    process.env.ENGRAM_HOME = bridgeGlobalDir;
    process.env.ENGRAM_CLAUDE_HOME = bridgeGlobalDir;

    let seenContext: { globalDir: string; projectDir: string } | null = null;
    let seenTranscriptPath: string | undefined;

    await runClaudeHook({
      input: { cwd: bridgeCwd, transcript_path: path.join(tmpDir, 'transcript.jsonl') },
      missingInputMessage: 'missing transcript_path or cwd in hook input',
      errorLabel: 'stop hook error:',
      action: (context, input) => {
        seenContext = context;
        seenTranscriptPath = input.transcript_path;
      },
    });

    expect(seenContext).toEqual({
      globalDir: bridgeGlobalDir,
      projectDir: getProjectDir(bridgeCwd, bridgeGlobalDir),
    });
    expect(seenTranscriptPath).toBe(path.join(tmpDir, 'transcript.jsonl'));
    expect(ensureDirs).toHaveBeenCalledWith(bridgeGlobalDir, getProjectDir(bridgeCwd, bridgeGlobalDir));
  });

  it('runs the enabled session-stop entrypoint end to end', async () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    const transcriptPath = path.join(FIXTURES, 'basic-session.jsonl');
    hooksIoMock.readStdinJson.mockResolvedValueOnce({ cwd, transcript_path: transcriptPath });

    await stopMain();

    expect(hooksIoMock.readStdinJson).toHaveBeenCalledTimes(1);

    const projectIndex = fs.readFileSync(path.join(projectDir, 'memory', 'MEMORY.md'), 'utf8');

    expect(fs.readFileSync(path.join(globalDir, 'memory', 'user-preferences.md'), 'utf8')).toContain('pnpm');
    expect(projectIndex).toContain('PostgreSQL');
    expect(projectIndex).toContain('different schema');
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
