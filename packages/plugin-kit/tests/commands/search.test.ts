import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadMemorySnapshot } from '../../src/services/memory-query.js';
import { runSearchCommand } from '../../src/commands/search.js';

describe('search command', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-search-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');

    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });

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
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('filters a snapshot by query as data', () => {
    const snapshot = loadMemorySnapshot(globalDir, projectDir);

    expect(runSearchCommand({ query: 'redis', snapshot })).toEqual({
      sections: [
        {
          heading: 'Project Context',
          entries: ['Auth uses redis [2026-03-30]'],
        },
      ],
    });
  });
});
