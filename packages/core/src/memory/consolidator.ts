import * as fs from 'fs';
import * as path from 'path';
import type { MemoryTarget } from '../extractors/types.js';
import { similarity } from './dedup.js';
import { parseEntryMetadata } from './metadata.js';
import { parseMemoryFile, parseNativeProjectMemoryFile, serializeMemoryFile } from './writer.js';

const CONSOLIDATION_THRESHOLD = 0.6;

interface ProjectRecord {
  description: string | null;
  entry: string;
  fileName: string;
  filePath: string;
  name: string;
  target: MemoryTarget | null;
  updated: string | null;
}

const entryTimestamp = (entry: string, updated?: string | null): number => {
  const date = parseEntryMetadata(entry).date;
  const source = date ? `${date}T00:00:00.000Z` : updated;
  const timestamp = source ? new Date(source).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const inferTarget = (fileName: string, type: string | null): MemoryTarget | null => {
  switch (type) {
    case 'feedback':
      return 'user-preferences';
    case 'project':
      return 'project-context';
    case 'decision':
      return 'project-decisions';
    case 'todo':
      return 'pending-items';
    case 'pattern':
      return 'user-patterns';
    default:
      break;
  }

  if (fileName.startsWith('feedback_')) return 'user-preferences';
  if (fileName.startsWith('project_')) return 'project-context';
  if (fileName.startsWith('decision_')) return 'project-decisions';
  if (fileName.startsWith('todo_')) return 'pending-items';
  if (fileName.startsWith('pattern_')) return 'user-patterns';
  return null;
};

const consolidateEntries = (entries: string[], updatedAt?: string | null): string[] => {
  const sorted = [...entries].sort((left, right) => entryTimestamp(right, updatedAt) - entryTimestamp(left, updatedAt));
  const kept: string[] = [];

  for (const entry of sorted) {
    if (!kept.some((candidate) => similarity(candidate, entry) >= CONSOLIDATION_THRESHOLD)) {
      kept.push(entry);
    }
  }

  return kept.sort((left, right) => entryTimestamp(left, updatedAt) - entryTimestamp(right, updatedAt));
};

const consolidateGlobalMemories = (
  globalDir: string,
  threshold: number,
  maxChars: number,
): void => {
  const memoryDir = path.join(globalDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(memoryDir)) {
    if (!fileName.endsWith('.md')) {
      continue;
    }

    const filePath = path.join(memoryDir, fileName);
    const parsed = parseMemoryFile(fs.readFileSync(filePath, 'utf8'));
    if (parsed.entries.length < threshold) {
      continue;
    }

    const consolidated = consolidateEntries(parsed.entries, parsed.updated);
    if (consolidated.length === parsed.entries.length) {
      continue;
    }

    let nextEntries = consolidated;
    while (
      serializeMemoryFile({ updated: parsed.updated, entries: nextEntries }).length > maxChars &&
      nextEntries.length > 0
    ) {
      nextEntries = nextEntries.slice(1);
    }

    fs.writeFileSync(
      filePath,
      serializeMemoryFile({ updated: parsed.updated, entries: nextEntries }),
      'utf8',
    );
  }
};

const loadProjectRecords = (projectDir: string): ProjectRecord[] => {
  const memoryDir = path.join(projectDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    return [];
  }

  return fs
    .readdirSync(memoryDir)
    .filter((fileName) => fileName.endsWith('.md') && fileName !== 'MEMORY.md')
    .map((fileName) => {
      const filePath = path.join(memoryDir, fileName);
      const parsed = parseNativeProjectMemoryFile(fs.readFileSync(filePath, 'utf8'));
      return {
        description: parsed.description,
        fileName,
        filePath,
        entry: parsed.entry,
        name: parsed.name,
        target: inferTarget(fileName, parsed.type),
        updated: parsed.updated,
      };
    });
};

const rewriteProjectMemoryIndex = (projectDir: string): void => {
  const records = loadProjectRecords(projectDir).sort((left, right) => left.fileName.localeCompare(right.fileName));
  const lines = ['# Memory Index', ''];

  for (const record of records) {
    lines.push(`- [${record.name}](${record.fileName}) — ${record.description ?? record.entry}`);
  }

  fs.writeFileSync(path.join(projectDir, 'memory', 'MEMORY.md'), `${lines.join('\n')}\n`, 'utf8');
};

const consolidateProjectMemories = (projectDir: string, threshold: number): void => {
  const byTarget = new Map<MemoryTarget, ProjectRecord[]>();
  let changed = false;

  for (const record of loadProjectRecords(projectDir)) {
    if (!record.target) {
      continue;
    }
    const bucket = byTarget.get(record.target) ?? [];
    bucket.push(record);
    byTarget.set(record.target, bucket);
  }

  for (const records of byTarget.values()) {
    if (records.length < threshold) {
      continue;
    }

    const sorted = [...records].sort(
      (left, right) => entryTimestamp(right.entry, right.updated) - entryTimestamp(left.entry, left.updated),
    );
    const kept: ProjectRecord[] = [];

    for (const record of sorted) {
      if (kept.some((candidate) => similarity(candidate.entry, record.entry) >= CONSOLIDATION_THRESHOLD)) {
        fs.rmSync(record.filePath, { force: true });
        changed = true;
        continue;
      }

      kept.push(record);
    }
  }

  if (changed) {
    rewriteProjectMemoryIndex(projectDir);
  }
};

export const consolidateMemories = (
  globalDir: string,
  projectDir: string,
  maxEntriesPerFile: number,
  maxCharsPerFile: number,
): void => {
  const threshold = Math.ceil(maxEntriesPerFile * 0.8);
  consolidateGlobalMemories(globalDir, threshold, maxCharsPerFile);
  consolidateProjectMemories(projectDir, threshold);
};
