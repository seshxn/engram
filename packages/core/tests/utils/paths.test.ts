import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureDirs, getGlobalDir, getProjectDir } from '../../src/utils/paths.js';

describe('paths', () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-paths-'));
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns ~/.claude/engram by default', () => {
    delete process.env.ENGRAM_HOME;
    expect(getGlobalDir()).toBe(path.join(os.homedir(), '.claude', 'engram'));
  });

  it('respects ENGRAM_HOME env var', () => {
    process.env.ENGRAM_HOME = '/custom/path';
    expect(getGlobalDir()).toBe('/custom/path');
  });

  it('stores project memory under Claude native projects using the resolved cwd slug', () => {
    const projectDir = getProjectDir('/Users/test/work/my-project');

    expect(projectDir).toBe(path.join(os.homedir(), '.claude', 'projects', '-Users-test-work-my-project'));
  });

  it('creates Engram global dirs and Claude-native project dirs', () => {
    const globalDir = path.join(tmpDir, 'global');
    const projectDir = path.join(tmpDir, 'claude', 'projects', '-tmp-workspace-repo');

    ensureDirs(globalDir, projectDir);

    expect(fs.existsSync(path.join(globalDir, 'memory'))).toBe(true);
    expect(fs.existsSync(path.join(globalDir, 'state'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'memory'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'state'))).toBe(true);
  });

  it('does not error if directories already exist', () => {
    const globalDir = path.join(tmpDir, 'global');
    const projectDir = path.join(tmpDir, 'claude', 'projects', '-tmp-workspace-repo');

    ensureDirs(globalDir, projectDir);
    ensureDirs(globalDir, projectDir);
  });
});
