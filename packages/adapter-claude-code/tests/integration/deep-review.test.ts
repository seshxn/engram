import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateOutput, getProjectDir, processSession, type MessagePair } from '@engram/core';

describe('Claude Code deep review cycle', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-deep-review-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    projectDir = getProjectDir(cwd, globalDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits and expires the deep review prompt across session starts', async () => {
    const longSession: MessagePair[] = Array.from({ length: 12 }, (_, index) => ({
      user: `Message ${index}`,
      assistant: `Response ${index}`,
    }));

    await processSession(longSession, globalDir, projectDir, { deep_review_threshold: 10 });

    const state = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'state', 'session-history.json'), 'utf8'),
    );
    expect(state.needs_deep_review).toBe(true);

    expect(generateOutput(globalDir, projectDir)).toContain('<engram-review>');
    expect(generateOutput(globalDir, projectDir)).toContain('<engram-review>');
    expect(generateOutput(globalDir, projectDir)).not.toContain('<engram-review>');
  });
});
