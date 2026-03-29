import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readAllMemories } from '../../src/memory/reader.js';
import { writeEntries } from '../../src/memory/writer.js';

describe('memory reader', () => {
  let tmpDir: string;
  let globalDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-reader-'));
    globalDir = path.join(tmpDir, 'global');
    projectDir = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(globalDir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty sections and counts when no memory files exist', () => {
    expect(readAllMemories(globalDir, projectDir)).toEqual({
      sections: [],
      globalCount: 0,
      projectCount: 0,
    });
  });

  it('reads global and project memories into ordered sections', () => {
    writeEntries(path.join(globalDir, 'memory', 'user-preferences.md'), ['Uses pnpm [2026-03-28]'], {
      maxEntries: 50,
      maxChars: 5000,
      updatedAt: '2026-03-28T12:00:00.000Z',
    });
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'project_uses-next-js.md'),
      `---
name: Uses Next.js
description: Uses Next.js [2026-03-28]
type: project
updated: 2026-03-28T12:00:00.000Z
---

Uses Next.js [2026-03-28]
`,
      'utf8',
    );

    const result = readAllMemories(globalDir, projectDir);

    expect(result.projectCount).toBe(1);
    expect(result.globalCount).toBe(1);
    expect(result.sections.map((section) => section.heading)).toEqual([
      'Project Context',
      'User Preferences',
    ]);
  });

  it('keeps project and global pending items in separate sections', () => {
    writeEntries(path.join(globalDir, 'memory', 'pending-items.md'), ['Global TODO [2026-03-28]'], {
      maxEntries: 50,
      maxChars: 5000,
      updatedAt: '2026-03-28T12:00:00.000Z',
    });
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'todo_project-todo.md'),
      `---
name: Project TODO
description: Project TODO [2026-03-28]
type: todo
updated: 2026-03-28T12:00:00.000Z
---

Project TODO [2026-03-28]
`,
      'utf8',
    );

    const result = readAllMemories(globalDir, projectDir);

    expect(result.sections).toEqual([
      { heading: 'Pending Items (Project)', entries: ['Project TODO [2026-03-28]'] },
      { heading: 'Pending Items (Global)', entries: ['Global TODO [2026-03-28]'] },
    ]);
    expect(result.projectCount).toBe(1);
    expect(result.globalCount).toBe(1);
  });

  it('reads feedback files from Claude-native project memory as user preferences', () => {
    fs.writeFileSync(
      path.join(projectDir, 'memory', 'feedback_use-pnpm.md'),
      `---
name: Use pnpm
description: Use pnpm not npm for this project [2026-03-28]
type: feedback
updated: 2026-03-28T12:00:00.000Z
---

Use pnpm not npm for this project [2026-03-28]
`,
      'utf8',
    );

    const result = readAllMemories(globalDir, projectDir);

    expect(result.sections).toEqual([
      {
        heading: 'User Preferences',
        entries: ['Use pnpm not npm for this project [2026-03-28]'],
      },
    ]);
    expect(result.projectCount).toBe(1);
  });
});
