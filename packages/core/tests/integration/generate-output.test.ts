import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateDiffOutput } from '../../src/generate-diff-output.js';
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

  it('injects recent guidance once before memories', () => {
    fs.writeFileSync(
      path.join(projectDir, 'state', 'guidance.json'),
      JSON.stringify(
        {
          content: 'Last session ended while refactoring auth flow.',
          generated_at: new Date().toISOString(),
          consumed: false,
        },
        null,
        2,
      ),
      'utf8',
    );

    const firstOutput = generateOutput(globalDir, projectDir);
    const secondOutput = generateOutput(globalDir, projectDir);

    expect(firstOutput).toContain('<engram-guidance>');
    expect(firstOutput.indexOf('<engram-guidance>')).toBeLessThan(firstOutput.indexOf('</engram-guidance>'));
    expect(secondOutput).not.toContain('<engram-guidance>');
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

  it('enforces the configured injection budget', () => {
    fs.writeFileSync(
      path.join(globalDir, 'config.json'),
      JSON.stringify({ injection_budget: 220 }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'state', 'guidance.json'),
      JSON.stringify(
        {
          content: 'Continue the auth migration first.',
          generated_at: new Date().toISOString(),
          consumed: false,
        },
        null,
        2,
      ),
      'utf8',
    );
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 0,
          session_summary: 'A'.repeat(400),
          last_processed: '2026-03-28T00:00:00Z',
        },
        null,
        2,
      ),
      'utf8',
    );
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      `---\nupdated: 2026-03-28T00:00:00Z\nentries: 3\n---\n\n- ${'A'.repeat(120)} [2026-03-28]\n- ${'B'.repeat(120)} [2026-03-28]\n- ${'C'.repeat(120)} [2026-03-28]\n`,
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir);

    expect(output.length).toBeLessThanOrEqual(220);
    expect(output).toContain('<engram-guidance>');
    expect(output).not.toContain('<engram-review>');
  });

  it('applies runtime config overrides ahead of the file config', () => {
    fs.writeFileSync(
      path.join(globalDir, 'config.json'),
      JSON.stringify({ deep_review: true, injection_budget: 2000 }, null, 2),
      'utf8',
    );
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
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      `---\nupdated: 2026-03-28T00:00:00Z\nentries: 2\n---\n\n- ${'Keep output terse'.padEnd(120, 'A')} [2026-03-28] [confidence:high]\n- ${'Mention every detail'.padEnd(120, 'B')} [2026-03-28] [confidence:low]\n`,
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir, {
      deep_review: false,
      injection_budget: 280,
    });

    expect(output).not.toContain('<engram-review>');
    expect(output.length).toBeLessThanOrEqual(280);
    expect(output).toContain('Keep output terse');
    expect(output).not.toContain('Mention every detail');
  });

  it('re-injects on prompt submit only when payload content changes', () => {
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-28T00:00:00Z\nentries: 1\n---\n\n- Uses pnpm [2026-03-28]\n',
      'utf8',
    );

    const firstOutput = generateDiffOutput(globalDir, projectDir);
    const secondOutput = generateDiffOutput(globalDir, projectDir);

    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      '---\nupdated: 2026-03-29T00:00:00Z\nentries: 2\n---\n\n- Uses pnpm [2026-03-28]\n- Uses biome [2026-03-29]\n',
      'utf8',
    );

    const thirdOutput = generateDiffOutput(globalDir, projectDir);

    expect(firstOutput).toContain('Uses pnpm');
    expect(secondOutput).toBe('');
    expect(thirdOutput).toContain('Uses biome');
  });

  it('trims low-confidence memories before high-confidence ones when over budget', () => {
    fs.writeFileSync(
      path.join(globalDir, 'config.json'),
      JSON.stringify({ injection_budget: 110 }, null, 2),
      'utf8',
    );
    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      `---\nupdated: 2026-03-28T00:00:00Z\nentries: 2\n---\n\n- Keep terse output [2026-03-29] [confidence:high]\n- Mention every implementation detail [2026-03-29] [confidence:low]\n`,
      'utf8',
    );

    const output = generateOutput(globalDir, projectDir);

    expect(output).toContain('Keep terse output');
    expect(output).not.toContain('Mention every implementation detail');
  });
});
