import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
    expect(output).toContain('Auth uses redis');
  });
});
