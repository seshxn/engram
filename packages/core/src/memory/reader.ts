import * as fs from 'fs';
import * as path from 'path';
import type { ExtractionConfidence } from '../extractors/types.js';
import type { MemorySection } from '../utils/format.js';
import { displayEntry, parseEntryMetadata } from './metadata.js';
import { parseMemoryFile, parseNativeProjectMemoryFile } from './writer.js';

interface ReadAllMemoriesResult {
  sections: MemorySection[];
  globalCount: number;
  projectCount: number;
}

export interface DetailedMemoryEntry {
  confidence?: ExtractionConfidence;
  scope: 'global' | 'project';
  text: string;
  updated: string | null;
}

export interface DetailedMemorySection {
  heading: string;
  entries: DetailedMemoryEntry[];
}

interface ReadDetailedMemoriesResult {
  sections: DetailedMemorySection[];
  globalCount: number;
  projectCount: number;
}

interface MemoryDescriptor {
  fileName: string;
  heading: string;
  scope: 'global';
}

const DESCRIPTORS: MemoryDescriptor[] = [
  { fileName: 'user-preferences.md', heading: 'User Preferences', scope: 'global' },
  { fileName: 'user-patterns.md', heading: 'User Patterns', scope: 'global' },
  { fileName: 'pending-items.md', heading: 'Pending Items (Global)', scope: 'global' },
];

const readEntries = (baseDir: string, fileName: string): string[] => {
  const filePath = path.join(baseDir, 'memory', fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return parseMemoryFile(fs.readFileSync(filePath, 'utf8')).entries;
};

const readDetailedGlobalEntries = (baseDir: string, fileName: string): DetailedMemoryEntry[] => {
  const filePath = path.join(baseDir, 'memory', fileName);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const parsed = parseMemoryFile(fs.readFileSync(filePath, 'utf8'));
  return parsed.entries.map((entry) => ({
    text: entry,
    scope: 'global',
    updated: parsed.updated,
    confidence: parseEntryMetadata(entry).confidence,
  }));
};

const inferHeading = (fileName: string, type: string | null): string | null => {
  switch (type) {
    case 'project':
      return 'Project Context';
    case 'decision':
      return 'Project Decisions';
    case 'todo':
      return 'Pending Items (Project)';
    case 'feedback':
      return 'User Preferences';
    case 'pattern':
      return 'User Patterns';
    default:
      break;
  }

  if (fileName.startsWith('project_')) {
    return 'Project Context';
  }
  if (fileName.startsWith('decision_')) {
    return 'Project Decisions';
  }
  if (fileName.startsWith('todo_')) {
    return 'Pending Items (Project)';
  }
  if (fileName.startsWith('feedback_')) {
    return 'User Preferences';
  }
  if (fileName.startsWith('pattern_')) {
    return 'User Patterns';
  }

  return null;
};

const readProjectSections = (projectDir: string): MemorySection[] => {
  const memoryDir = path.join(projectDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    return [];
  }

  const grouped = new Map<string, string[]>();

  for (const fileName of fs.readdirSync(memoryDir)) {
    if (!fileName.endsWith('.md') || fileName === 'MEMORY.md') {
      continue;
    }

    const parsed = parseNativeProjectMemoryFile(fs.readFileSync(path.join(memoryDir, fileName), 'utf8'));
    const heading = inferHeading(fileName, parsed.type);
    if (!heading || !parsed.entry) {
      continue;
    }

    const entries = grouped.get(heading) ?? [];
    entries.push(parsed.entry);
    grouped.set(heading, entries);
  }

  const headingOrder = [
    'Project Context',
    'Project Decisions',
    'Pending Items (Project)',
    'User Preferences',
    'User Patterns',
  ];

  return headingOrder
    .map((heading) => {
      const entries = grouped.get(heading) ?? [];
      return entries.length > 0 ? { heading, entries } : null;
    })
    .filter((section): section is MemorySection => section !== null);
};

export const readDetailedMemories = (
  globalDir: string,
  projectDir: string,
): ReadDetailedMemoriesResult => {
  const sectionMap = new Map<string, DetailedMemoryEntry[]>();
  let globalCount = 0;
  let projectCount = 0;

  const projectMemoryDir = path.join(projectDir, 'memory');
  if (fs.existsSync(projectMemoryDir)) {
    for (const fileName of fs.readdirSync(projectMemoryDir)) {
      if (!fileName.endsWith('.md') || fileName === 'MEMORY.md') {
        continue;
      }

      const parsed = parseNativeProjectMemoryFile(
        fs.readFileSync(path.join(projectMemoryDir, fileName), 'utf8'),
      );
      const heading = inferHeading(fileName, parsed.type);
      if (!heading || !parsed.entry) {
        continue;
      }

      const entries = sectionMap.get(heading) ?? [];
      entries.push({
        text: parsed.entry,
        scope: 'project',
        updated: parsed.updated,
        confidence: parsed.confidence ?? undefined,
      });
      sectionMap.set(heading, entries);
      projectCount += 1;
    }
  }

  for (const descriptor of DESCRIPTORS) {
    const entries = readDetailedGlobalEntries(globalDir, descriptor.fileName);
    if (entries.length === 0) {
      continue;
    }

    sectionMap.set(descriptor.heading, [...(sectionMap.get(descriptor.heading) ?? []), ...entries]);
    globalCount += entries.length;
  }

  const orderedHeadings = [
    'Project Context',
    'Project Decisions',
    'Pending Items (Project)',
    'User Preferences',
    'User Patterns',
    'Pending Items (Global)',
  ];

  const sections = orderedHeadings
    .map((heading) => {
      const entries = sectionMap.get(heading) ?? [];
      return entries.length > 0 ? { heading, entries } : null;
    })
    .filter((section): section is DetailedMemorySection => section !== null);

  return { sections, globalCount, projectCount };
};

export const readAllMemories = (globalDir: string, projectDir: string): ReadAllMemoriesResult => {
  const detailed = readDetailedMemories(globalDir, projectDir);

  return {
    sections: detailed.sections.map((section) => ({
      heading: section.heading,
      entries: section.entries.map((entry) => displayEntry(entry.text)),
    })),
    globalCount: detailed.globalCount,
    projectCount: detailed.projectCount,
  };
};
