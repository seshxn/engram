import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { processSession } from '../../src/process-session.js';
import type { MessagePair } from '../../src/transcript/types.js';
import { getProjectDir } from '../../src/utils/paths.js';

describe('processSession', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;
  let cwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-process-'));
    globalDir = path.join(tmpDir, 'global');
    cwd = path.join(tmpDir, 'workspace', 'repo');
    fs.mkdirSync(cwd, { recursive: true });
    projectDir = getProjectDir(cwd, globalDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts memories from message pairs and writes them to scoped files', async () => {
    const pairs: MessagePair[] = [
      { user: 'no, use pnpm not npm', assistant: 'Switching to pnpm.' },
      { user: "let's go with PostgreSQL for the database", assistant: 'Setting up PostgreSQL.' },
      { user: 'remember that the auth module has a race condition', assistant: 'Noted.' },
      { user: 'we still need to add rate limiting', assistant: 'Will do.' },
    ];

    await processSession(pairs, globalDir, projectDir);

    const prefsPath = path.join(globalDir, 'memory', 'user-preferences.md');
    const memoryIndexPath = path.join(projectDir, 'memory', 'MEMORY.md');
    const projectFiles = fs.readdirSync(path.join(projectDir, 'memory'));

    expect(fs.readFileSync(prefsPath, 'utf8')).toContain('pnpm');
    expect(projectFiles.some((name) => name.startsWith('decision_'))).toBe(true);
    expect(projectFiles.some((name) => name.startsWith('project_'))).toBe(true);
    expect(projectFiles.some((name) => name.startsWith('todo_'))).toBe(true);
    expect(fs.readFileSync(memoryIndexPath, 'utf8')).toContain('PostgreSQL');
    expect(fs.readFileSync(memoryIndexPath, 'utf8')).toContain('race condition');
    expect(fs.readFileSync(memoryIndexPath, 'utf8')).toContain('rate limiting');
    expect(fs.existsSync(path.join(cwd, '.engram'))).toBe(false);
  });

  it('writes state without deep review for short sessions', async () => {
    await processSession([{ user: 'hello', assistant: 'hi' }], globalDir, projectDir);

    const state = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'state', 'session-history.json'), 'utf8'),
    );

    expect(state.needs_deep_review).toBe(false);
    expect(state.review_age).toBe(0);
    expect(state.session_summary).toBeUndefined();
  });

  it('stores a review summary for sessions that cross the threshold', async () => {
    const pairs: MessagePair[] = Array.from({ length: 12 }, (_, index) => ({
      user: `Message ${index}`,
      assistant: `Response ${index}`,
    }));

    await processSession(pairs, globalDir, projectDir, { deep_review_threshold: 10 });

    const state = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'state', 'session-history.json'), 'utf8'),
    );

    expect(state.needs_deep_review).toBe(true);
    expect(state.review_age).toBe(0);
    expect(state.session_summary.length).toBeLessThanOrEqual(3000);
  });

  it('writes session guidance from recent conversation context', async () => {
    const pairs: MessagePair[] = [
      { user: 'We are refactoring auth.ts to split token validation.', assistant: 'I will update auth.ts first.' },
      { user: 'Next we still need to migrate the session cache.', assistant: 'I will continue with session cache after auth.ts.' },
    ];

    await processSession(pairs, globalDir, projectDir);

    const guidance = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'state', 'guidance.json'), 'utf8'),
    ) as { content: string; consumed: boolean };

    expect(guidance.content).toContain('auth.ts');
    expect(guidance.content).toContain('session cache');
    expect(guidance.consumed).toBe(false);
  });

  it('tracks extraction stats after processing a session', async () => {
    const pairs: MessagePair[] = [
      { user: 'be more concise', assistant: 'Understood.' },
      { user: 'we use vitest in this repo', assistant: 'Noted.' },
    ];

    await processSession(pairs, globalDir, projectDir);

    const stats = JSON.parse(
      fs.readFileSync(path.join(globalDir, 'state', 'stats.json'), 'utf8'),
    ) as {
      extractor_hits: Record<string, number>;
      last_extraction_time: string;
      session_count: number;
    };

    expect(stats.session_count).toBe(1);
    expect(stats.extractor_hits.communication).toBeGreaterThan(0);
    expect(stats.extractor_hits.testing).toBeGreaterThan(0);
    expect(typeof stats.last_extraction_time).toBe('string');
  });

  it('persists assistant review suggestions into Engram-owned files', async () => {
    const pairs: MessagePair[] = [
      {
        user: 'please review the previous session',
        assistant: `Missed a few things.

<engram-suggestions>
## User Preferences
- Use pnpm not npm for this project

## Project Context
- Staging uses a different schema

## Pending Items (Project)
- Add rate limiting
</engram-suggestions>`,
      },
    ];

    await processSession(pairs, globalDir, projectDir);

    const projectIndex = fs.readFileSync(path.join(projectDir, 'memory', 'MEMORY.md'), 'utf8');

    expect(fs.readFileSync(path.join(globalDir, 'memory', 'user-preferences.md'), 'utf8')).toContain(
      'Use pnpm not npm for this project',
    );
    expect(projectIndex).toContain('Staging uses a different schema');
    expect(projectIndex).toContain('Add rate limiting');
  });

  it('handles empty transcripts gracefully', async () => {
    await processSession([], globalDir, projectDir);
    expect(fs.existsSync(path.join(projectDir, 'state', 'session-history.json'))).toBe(true);
  });
});
