import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { consolidateMemories } from '../../src/memory/consolidator.js';
import { parseMemoryFile } from '../../src/memory/writer.js';

describe('memory consolidator', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-consolidator-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('collapses similar old global entries once a file crosses the consolidation threshold', () => {
    const entries = Array.from({ length: 40 }, (_, index) =>
      index < 2
        ? `Use pnpm for installs [2026-03-${String(index + 1).padStart(2, '0')}]`
        : `Memory ${index} [2026-03-${String((index % 28) + 1).padStart(2, '0')}]`,
    );

    fs.writeFileSync(
      path.join(globalDir, 'memory', 'user-preferences.md'),
      `---\nupdated: 2026-03-30T00:00:00.000Z\nentries: ${entries.length}\n---\n\n${entries
        .map((entry) => `- ${entry}`)
        .join('\n')}\n`,
      'utf8',
    );

    consolidateMemories(globalDir, projectDir, 50, 5000);

    const parsed = parseMemoryFile(
      fs.readFileSync(path.join(globalDir, 'memory', 'user-preferences.md'), 'utf8'),
    );

    expect(parsed.entries.filter((entry) => entry.includes('Use pnpm for installs'))).toHaveLength(1);
  });
});
