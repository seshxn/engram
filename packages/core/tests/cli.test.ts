import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runCli } from '../bin/engram.js';

describe('engram cli', () => {
  let tmpDir: string;
  let globalDir: string;
  let cwd: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-cli-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    const normalized = path.resolve(cwd).replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
    projectDir = path.join(
      globalDir,
      'projects',
      normalized.startsWith('-') ? normalized : `-${normalized}`,
    );

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
      '---\nname: Auth\ndescription: Auth uses redis [2026-03-30]\ntype: project\nupdated: 2026-03-30T00:00:00.000Z\n---\n\nAuth uses redis [2026-03-30] [confidence:high]\n',
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
    delete process.env.ENGRAM_HOME;
    delete process.env.ENGRAM_CLAUDE_HOME;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports status with counts and state paths', () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    const stdout = { chunks: [], write(chunk: string) { this.chunks.push(chunk); } };
    const stderr = { write() {} };

    const exitCode = runCli(['status'], { stdout, stderr } as never, cwd);
    const output = stdout.chunks.join('');

    expect(exitCode).toBe(0);
    expect(output).toContain(globalDir);
    expect(output).toContain(projectDir);
    expect(output).toContain('Global memories: 1');
    expect(output).toContain('Project memories: 1');
    expect(output).toContain('Sessions processed: 3');
  });

  it('searches stored memories', () => {
    process.env.ENGRAM_HOME = globalDir;
    process.env.ENGRAM_CLAUDE_HOME = globalDir;
    const stdout = { chunks: [], write(chunk: string) { this.chunks.push(chunk); } };
    const stderr = { write() {} };

    const exitCode = runCli(['search', 'redis'], { stdout, stderr } as never, cwd);
    const output = stdout.chunks.join('');

    expect(exitCode).toBe(0);
    expect(output).toContain('Project Context');
    expect(output).toContain('Auth uses redis [2026-03-30]');
    expect(output).not.toContain('confidence:high');
  });

  it('does not create directories for read-only commands', () => {
    const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-cli-readonly-'));
    const readonlyGlobalDir = path.join(isolatedRoot, 'global');
    const readonlyCwd = path.join(isolatedRoot, 'workspace', 'repo');
    process.env.ENGRAM_HOME = readonlyGlobalDir;
    process.env.ENGRAM_CLAUDE_HOME = readonlyGlobalDir;

    const stdout = { chunks: [], write(chunk: string) { this.chunks.push(chunk); } };
    const stderr = { write() {} };

    expect(runCli(['status'], { stdout, stderr } as never, readonlyCwd)).toBe(0);
    expect(runCli(['search', 'redis'], { stdout, stderr } as never, readonlyCwd)).toBe(0);
    expect(fs.existsSync(readonlyGlobalDir)).toBe(false);
    expect(fs.existsSync(path.join(readonlyGlobalDir, 'projects'))).toBe(false);

    fs.rmSync(isolatedRoot, { recursive: true, force: true });
  });

  it('runs the review command end to end without built artifacts', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-cli-e2e-'));
    const tempRepoRoot = path.join(tempRoot, 'repo');
    const tempBinDir = path.join(tempRepoRoot, 'packages', 'core', 'bin');
    const tempConfigDir = path.join(tempRepoRoot, 'packages', 'plugin-kit', 'src', 'config');
    const tempRuntimeDir = path.join(tempRepoRoot, 'packages', 'plugin-kit', 'src', 'runtime');
    const tempSharedConfigDir = path.join(tempRepoRoot, 'packages', 'shared', 'config');
    const tempGlobalDir = path.join(tempRoot, 'global');
    const tempCwd = path.join(tempRoot, 'workspace', 'repo');
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

    fs.mkdirSync(tempBinDir, { recursive: true });
    fs.mkdirSync(tempConfigDir, { recursive: true });
    fs.mkdirSync(tempRuntimeDir, { recursive: true });
    fs.mkdirSync(tempSharedConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(tempRepoRoot, 'package.json'),
      JSON.stringify({ type: 'module' }, null, 2),
      'utf8',
    );
    fs.mkdirSync(path.join(tempGlobalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(tempGlobalDir, 'state'), { recursive: true });
    fs.mkdirSync(tempCwd, { recursive: true });
    const canonicalCwd = fs.realpathSync(tempCwd);
    const normalized = canonicalCwd.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
    const tempProjectDir = path.join(
      tempGlobalDir,
      'projects',
      normalized.startsWith('-') ? normalized : `-${normalized}`,
    );
    fs.mkdirSync(path.join(tempProjectDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(tempProjectDir, 'state'), { recursive: true });

    fs.copyFileSync(
      path.join(repoRoot, 'packages', 'core', 'bin', 'engram.js'),
      path.join(tempBinDir, 'engram.js'),
    );
    fs.copyFileSync(
      path.join(repoRoot, 'packages', 'plugin-kit', 'src', 'index.js'),
      path.join(tempRepoRoot, 'packages', 'plugin-kit', 'src', 'index.js'),
    );
    fs.copyFileSync(
      path.join(repoRoot, 'packages', 'plugin-kit', 'src', 'runtime', 'index.js'),
      path.join(tempRuntimeDir, 'index.js'),
    );
    fs.copyFileSync(
      path.join(repoRoot, 'packages', 'plugin-kit', 'src', 'config', 'load-engram-settings.js'),
      path.join(tempConfigDir, 'load-engram-settings.js'),
    );
    fs.copyFileSync(
      path.join(repoRoot, 'packages', 'shared', 'config', 'default-config.json'),
      path.join(tempSharedConfigDir, 'default-config.json'),
    );
    fs.writeFileSync(
      path.join(tempProjectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 0,
          session_summary: 'Session covered the auth flow and cache invalidation.',
          last_processed: '2026-03-30T12:00:00.000Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    try {
      const cliPath = fs.realpathSync(path.join(tempBinDir, 'engram.js'));
      const output = execFileSync(process.execPath, [cliPath, 'review'], {
        cwd: canonicalCwd,
        env: {
          ...process.env,
          ENGRAM_HOME: tempGlobalDir,
          ENGRAM_CLAUDE_HOME: tempGlobalDir,
        },
        encoding: 'utf8',
      });

      expect(output).toContain('Review pending: yes');
      expect(output).toContain('Review stale: no');
      expect(output).toContain('Review summary: available');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
