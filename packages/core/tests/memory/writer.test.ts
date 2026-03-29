import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseMemoryFile, writeEntries } from '../../src/memory/writer.js';

describe('memory writer', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-writer-'));
    filePath = path.join(tmpDir, 'memory', 'user-preferences.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the file with frontmatter and entries on first write', () => {
    writeEntries(filePath, ['Uses pnpm not npm [2026-03-28]'], {
      maxEntries: 50,
      maxChars: 5000,
      updatedAt: '2026-03-28T12:00:00.000Z',
    });

    const written = fs.readFileSync(filePath, 'utf8');
    expect(written).toContain('updated: 2026-03-28T12:00:00.000Z');
    expect(written).toContain('entries: 1');
    expect(written).toContain('- Uses pnpm not npm [2026-03-28]');
  });

  it('updates near-duplicates instead of appending them', () => {
    writeEntries(filePath, ['Uses pnpm not npm [2026-03-27]'], {
      maxEntries: 50,
      maxChars: 5000,
      updatedAt: '2026-03-27T12:00:00.000Z',
    });

    writeEntries(filePath, ['Uses pnpm not npm [2026-03-28]'], {
      maxEntries: 50,
      maxChars: 5000,
      updatedAt: '2026-03-28T12:00:00.000Z',
    });

    const parsed = parseMemoryFile(fs.readFileSync(filePath, 'utf8'));
    expect(parsed.entries).toEqual(['Uses pnpm not npm [2026-03-28]']);
  });

  it('prunes oldest entries when the file exceeds limits', () => {
    writeEntries(
      filePath,
      [
        'First [2026-03-26]',
        'Second [2026-03-27]',
        'Third [2026-03-28]',
      ],
      {
        maxEntries: 2,
        maxChars: 5000,
        updatedAt: '2026-03-28T12:00:00.000Z',
      },
    );

    const parsed = parseMemoryFile(fs.readFileSync(filePath, 'utf8'));
    expect(parsed.entries).toEqual(['Second [2026-03-27]', 'Third [2026-03-28]']);
  });
});
