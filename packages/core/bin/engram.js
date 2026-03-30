#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const getGlobalDir = () => process.env.ENGRAM_HOME || path.join(os.homedir(), '.claude', 'engram');
const getClaudeDir = () => process.env.ENGRAM_CLAUDE_HOME || path.join(os.homedir(), '.claude');
const toClaudeProjectKey = (cwd) => {
  const normalized = path.resolve(cwd).replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return normalized.startsWith('-') ? normalized : `-${normalized}`;
};
const getProjectDir = (cwd) => path.join(getClaudeDir(), 'projects', toClaudeProjectKey(cwd));

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n\n?/;

const parseMemoryFile = (content) => {
  const match = content.match(FRONTMATTER_PATTERN);
  const body = match ? content.slice(match[0].length) : content;
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2));
};

const parseFrontmatter = (content) => {
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

const stripFrontmatter = (content) => {
  const match = content.match(FRONTMATTER_PATTERN);
  return match ? content.slice(match[0].length) : content;
};

const displayEntry = (entry) => entry.replace(/\s*\[confidence:(high|medium|low)\]\s*$/i, '').trim();

const inferHeading = (fileName, type) => {
  if (type === 'project' || fileName.startsWith('project_')) return 'Project Context';
  if (type === 'decision' || fileName.startsWith('decision_')) return 'Project Decisions';
  if (type === 'todo' || fileName.startsWith('todo_')) return 'Pending Items (Project)';
  if (type === 'feedback' || fileName.startsWith('feedback_')) return 'User Preferences';
  if (type === 'pattern' || fileName.startsWith('pattern_')) return 'User Patterns';
  return null;
};

const readSections = (globalDir, projectDir, mode = 'all') => {
  const sectionMap = new Map();
  let globalCount = 0;
  let projectCount = 0;

  if (mode !== 'global') {
    const memoryDir = path.join(projectDir, 'memory');
    if (fs.existsSync(memoryDir)) {
      for (const fileName of fs.readdirSync(memoryDir)) {
        if (!fileName.endsWith('.md') || fileName === 'MEMORY.md') continue;
        const content = fs.readFileSync(path.join(memoryDir, fileName), 'utf8');
        const frontmatter = parseFrontmatter(content);
        const entry = stripFrontmatter(content)
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)[0];
        const heading = inferHeading(fileName, frontmatter.type ?? null);
        if (!heading || !entry) continue;
        const bucket = sectionMap.get(heading) ?? [];
        bucket.push(displayEntry(entry));
        sectionMap.set(heading, bucket);
        projectCount += 1;
      }
    }
  }

  if (mode !== 'project') {
    const descriptors = [
      ['user-preferences.md', 'User Preferences'],
      ['user-patterns.md', 'User Patterns'],
      ['pending-items.md', 'Pending Items (Global)'],
    ];

    for (const [fileName, heading] of descriptors) {
      const filePath = path.join(globalDir, 'memory', fileName);
      if (!fs.existsSync(filePath)) continue;
      const entries = parseMemoryFile(fs.readFileSync(filePath, 'utf8')).map(displayEntry);
      if (entries.length === 0) continue;
      sectionMap.set(heading, [...(sectionMap.get(heading) ?? []), ...entries]);
      globalCount += entries.length;
    }
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
    .filter(Boolean);

  return { sections, globalCount, projectCount };
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const clearDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) return;
  for (const name of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, name), { force: true, recursive: true });
  }
};

const printSections = (sections, io) => {
  if (sections.length === 0) {
    io.stdout.write('No memories found.\n');
    return;
  }

  for (const section of sections) {
    io.stdout.write(`## ${section.heading}\n`);
    for (const entry of section.entries) {
      io.stdout.write(`- ${entry}\n`);
    }
    io.stdout.write('\n');
  }
};

export const runCli = (
  args = process.argv.slice(2),
  io = { stderr: process.stderr, stdout: process.stdout },
  cwd = process.cwd(),
) => {
  const command = args[0];
  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(cwd);

  if (command === 'status') {
    const { globalCount, projectCount } = readSections(globalDir, projectDir);
    const sessionState = readJson(path.join(projectDir, 'state', 'session-history.json'));
    const stats = readJson(path.join(globalDir, 'state', 'stats.json'));

    io.stdout.write(`Global dir: ${globalDir}\n`);
    io.stdout.write(`Project dir: ${projectDir}\n`);
    io.stdout.write(`Global memories: ${globalCount}\n`);
    io.stdout.write(`Project memories: ${projectCount}\n`);
    io.stdout.write(`Last session: ${sessionState?.last_processed ?? 'unknown'}\n`);
    io.stdout.write(`Sessions processed: ${stats?.session_count ?? 0}\n`);
    return 0;
  }

  if (command === 'list') {
    const mode = args.includes('--global') ? 'global' : 'all';
    printSections(readSections(globalDir, projectDir, mode).sections, io);
    return 0;
  }

  if (command === 'search') {
    const query = args[1]?.toLowerCase();
    if (!query) {
      io.stderr.write('Usage: engram search <query>\n');
      return 1;
    }

    const results = readSections(globalDir, projectDir).sections
      .map((section) => ({
        heading: section.heading,
        entries: section.entries.filter((entry) => entry.toLowerCase().includes(query)),
      }))
      .filter((section) => section.entries.length > 0);

    printSections(results, io);
    return 0;
  }

  if (command === 'clear') {
    const clearGlobal = args.includes('--global') || (!args.includes('--project') && !args.includes('--global'));
    const clearProject = args.includes('--project') || (!args.includes('--project') && !args.includes('--global'));
    if (!args.includes('--yes')) {
      io.stderr.write('Refusing to clear memories without --yes.\n');
      return 1;
    }

    if (clearGlobal) {
      clearDir(path.join(globalDir, 'memory'));
    }
    if (clearProject) {
      clearDir(path.join(projectDir, 'memory'));
    }

    io.stdout.write('Cleared requested memories.\n');
    return 0;
  }

  io.stderr.write('Usage: engram <status|list|search|clear>\n');
  return 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runCli());
}
