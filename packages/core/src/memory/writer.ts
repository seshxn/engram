import * as fs from 'fs';
import * as path from 'path';
import { deduplicateEntries } from './dedup.js';
import type { MemoryTarget } from '../extractors/types.js';

export interface ParsedMemoryFile {
  updated: string | null;
  entries: string[];
}

export interface WriteEntriesOptions {
  maxEntries: number;
  maxChars: number;
  updatedAt?: string;
}

interface NativeProjectMemoryFile {
  description: string | null;
  entry: string;
  name: string;
  type: string | null;
  updated: string | null;
}

interface NativeProjectMemoryRecord {
  data: NativeProjectMemoryFile;
  fileName: string;
  filePath: string;
  target: MemoryTarget | null;
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n\n?/;

export const parseMemoryFile = (content: string): ParsedMemoryFile => {
  const match = content.match(FRONTMATTER_PATTERN);
  const body = match ? content.slice(match[0].length) : content;
  const frontmatter = match?.[1] ?? '';
  const updatedMatch = frontmatter.match(/^updated:\s*(.+)$/m);

  const entries = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));

  return {
    updated: updatedMatch?.[1] ?? null,
    entries,
  };
};

export const serializeMemoryFile = (data: ParsedMemoryFile): string => {
  const updated = data.updated ?? new Date().toISOString();
  const lines = [
    '---',
    `updated: ${updated}`,
    `entries: ${data.entries.length}`,
    '---',
    '',
    ...data.entries.map((entry) => `- ${entry}`),
  ];

  return `${lines.join('\n')}\n`;
};

const parseFrontmatter = (content: string): Record<string, string> => {
  const match = content.match(FRONTMATTER_PATTERN)?.[1];
  if (!match) {
    return {};
  }

  return Object.fromEntries(
    match
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(':');
        return [key.trim(), rest.join(':').trim()];
      }),
  );
};

const stripFrontmatter = (content: string): string => {
  const match = content.match(FRONTMATTER_PATTERN);
  return match ? content.slice(match[0].length) : content;
};

const DATE_TAG = /\s*\[\d{4}-\d{2}-\d{2}\]\s*$/;

const baseEntry = (entry: string): string => entry.replace(DATE_TAG, '').trim();

const titleCase = (entry: string): string => {
  const normalized = baseEntry(entry);
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Memory';
};

const slugifyEntry = (entry: string): string => {
  const slug = baseEntry(entry)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.slice(0, 48) || 'memory';
};

const targetMetadata = (
  target: MemoryTarget,
): {
  filePrefix: string;
  type: string;
} => {
  switch (target) {
    case 'user-preferences':
      return { filePrefix: 'feedback', type: 'feedback' };
    case 'project-context':
      return { filePrefix: 'project', type: 'project' };
    case 'project-decisions':
      return { filePrefix: 'decision', type: 'decision' };
    case 'pending-items':
      return { filePrefix: 'todo', type: 'todo' };
    case 'user-patterns':
      return { filePrefix: 'pattern', type: 'pattern' };
  }
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

  if (fileName.startsWith('feedback_')) {
    return 'user-preferences';
  }
  if (fileName.startsWith('decision_')) {
    return 'project-decisions';
  }
  if (fileName.startsWith('todo_')) {
    return 'pending-items';
  }
  if (fileName.startsWith('project_')) {
    return 'project-context';
  }
  if (fileName.startsWith('pattern_')) {
    return 'user-patterns';
  }

  return null;
};

export const parseNativeProjectMemoryFile = (content: string): NativeProjectMemoryFile => {
  const frontmatter = parseFrontmatter(content);
  const body = stripFrontmatter(content)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const entry = body[0] ?? frontmatter.description ?? frontmatter.name ?? '';

  return {
    updated: frontmatter.updated ?? null,
    name: frontmatter.name ?? titleCase(entry),
    description: frontmatter.description ?? null,
    type: frontmatter.type ?? null,
    entry,
  };
};

const serializeNativeProjectMemoryFile = (
  entry: string,
  target: MemoryTarget,
  updatedAt: string,
): string => {
  const metadata = targetMetadata(target);
  const name = titleCase(entry);
  const description = entry.trim();

  return `---
name: ${name}
description: ${description}
type: ${metadata.type}
updated: ${updatedAt}
---

${description}
`;
};

const loadProjectMemoryRecords = (projectDir: string): NativeProjectMemoryRecord[] => {
  const memoryDir = path.join(projectDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    return [];
  }

  return fs
    .readdirSync(memoryDir)
    .filter((fileName) => fileName.endsWith('.md') && fileName !== 'MEMORY.md')
    .map((fileName) => {
      const filePath = path.join(memoryDir, fileName);
      const data = parseNativeProjectMemoryFile(fs.readFileSync(filePath, 'utf8'));

      return {
        fileName,
        filePath,
        data,
        target: inferTarget(fileName, data.type),
      };
    });
};

const uniqueFilePath = (projectDir: string, prefix: string, entry: string): string => {
  const memoryDir = path.join(projectDir, 'memory');
  const baseSlug = slugifyEntry(entry);
  let attempt = 0;

  while (true) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const fileName = `${prefix}_${baseSlug}${suffix}.md`;
    const filePath = path.join(memoryDir, fileName);

    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    attempt += 1;
  }
};

const rewriteProjectMemoryIndex = (projectDir: string): void => {
  const records = loadProjectMemoryRecords(projectDir).sort((left, right) =>
    left.fileName.localeCompare(right.fileName),
  );

  const lines = ['# Memory Index', ''];

  for (const record of records) {
    const description = record.data.description ?? record.data.entry;
    lines.push(`- [${record.data.name}](${record.fileName}) — ${description}`);
  }

  fs.writeFileSync(path.join(projectDir, 'memory', 'MEMORY.md'), `${lines.join('\n')}\n`, 'utf8');
};

const enforceLimits = (entries: string[], maxEntries: number, maxChars: number): string[] => {
  let trimmed = [...entries];

  while (trimmed.length > maxEntries) {
    trimmed = trimmed.slice(1);
  }

  while (trimmed.length > 0) {
    const serialized = serializeMemoryFile({ updated: new Date().toISOString(), entries: trimmed });
    if (serialized.length <= maxChars) {
      break;
    }
    trimmed = trimmed.slice(1);
  }

  return trimmed;
};

export const writeEntries = (
  filePath: string,
  incomingEntries: string[],
  options: WriteEntriesOptions,
): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const existing = fs.existsSync(filePath)
    ? parseMemoryFile(fs.readFileSync(filePath, 'utf8'))
    : { updated: null, entries: [] };

  const { toAdd, toUpdate } = deduplicateEntries(existing.entries, incomingEntries);
  const nextEntries = [...existing.entries];

  for (const update of toUpdate) {
    nextEntries[update.oldIndex] = update.newEntry;
  }

  nextEntries.push(...toAdd);

  const limitedEntries = enforceLimits(nextEntries, options.maxEntries, options.maxChars);
  const serialized = serializeMemoryFile({
    updated: options.updatedAt ?? new Date().toISOString(),
    entries: limitedEntries,
  });

  fs.writeFileSync(filePath, serialized, 'utf8');
};

export const writeProjectMemoryEntries = (
  projectDir: string,
  target: MemoryTarget,
  incomingEntries: string[],
  updatedAt = new Date().toISOString(),
): void => {
  fs.mkdirSync(path.join(projectDir, 'memory'), { recursive: true });

  const allRecords = loadProjectMemoryRecords(projectDir);
  const targetRecords = allRecords.filter((record) => record.target === target);
  const existingEntries = targetRecords.map((record) => record.data.entry);
  const { toAdd, toUpdate } = deduplicateEntries(existingEntries, incomingEntries);

  for (const update of toUpdate) {
    const record = targetRecords[update.oldIndex];
    fs.writeFileSync(
      record.filePath,
      serializeNativeProjectMemoryFile(update.newEntry, target, updatedAt),
      'utf8',
    );
  }

  const { filePrefix } = targetMetadata(target);
  for (const entry of toAdd) {
    const filePath = uniqueFilePath(projectDir, filePrefix, entry);
    fs.writeFileSync(filePath, serializeNativeProjectMemoryFile(entry, target, updatedAt), 'utf8');
  }

  rewriteProjectMemoryIndex(projectDir);
};
