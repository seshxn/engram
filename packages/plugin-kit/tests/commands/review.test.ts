import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadReviewState } from '../../src/services/review-service.js';
import { runReviewCommand } from '../../src/commands/review.js';

describe('review command', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-review-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');

    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'state'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports pending review state and summary presence as data', () => {
    fs.writeFileSync(
      path.join(projectDir, 'state', 'session-history.json'),
      JSON.stringify(
        {
          needs_deep_review: true,
          review_age: 2,
          session_summary: 'Session covered the auth flow and cache invalidation.',
          last_processed: '2026-03-30T12:00:00.000Z',
        },
        null,
        2,
      ),
      'utf8',
    );

    expect(
      runReviewCommand({
        globalDir,
        projectDir,
        reviewState: loadReviewState(globalDir, projectDir),
      }),
    ).toEqual({
      globalDir,
      projectDir,
      pending: true,
      stale: true,
      hasSummary: true,
      summary: 'Session covered the auth flow and cache invalidation.',
    });
  });
});
