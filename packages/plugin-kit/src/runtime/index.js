import * as fs from 'fs';
import * as path from 'path';

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n\n?/;

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

const parseMemoryFile = (content) => {
  const match = content.match(FRONTMATTER_PATTERN);
  const body = match ? content.slice(match[0].length) : content;

  return {
    updated: parseFrontmatter(content).updated ?? null,
    entries: body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2)),
  };
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

const readProjectSections = (projectDir) => {
  const memoryDir = path.join(projectDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    return [];
  }

  const grouped = new Map();

  for (const fileName of fs.readdirSync(memoryDir)) {
    if (!fileName.endsWith('.md') || fileName === 'MEMORY.md') {
      continue;
    }

    const content = fs.readFileSync(path.join(memoryDir, fileName), 'utf8');
    const frontmatter = parseFrontmatter(content);
    const entry = stripFrontmatter(content)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)[0];
    const heading = inferHeading(fileName, frontmatter.type ?? null);
    if (!heading || !entry) {
      continue;
    }

    const bucket = grouped.get(heading) ?? [];
    bucket.push(displayEntry(entry));
    grouped.set(heading, bucket);
  }

  const orderedHeadings = [
    'Project Context',
    'Project Decisions',
    'Pending Items (Project)',
    'User Preferences',
    'User Patterns',
  ];

  return orderedHeadings
    .map((heading) => {
      const entries = grouped.get(heading) ?? [];
      return entries.length > 0 ? { heading, entries } : null;
    })
    .filter(Boolean);
};

const readGlobalSections = (globalDir) => {
  const sectionMap = new Map();
  let globalCount = 0;

  const descriptors = [
    ['user-preferences.md', 'User Preferences'],
    ['user-patterns.md', 'User Patterns'],
    ['pending-items.md', 'Pending Items (Global)'],
  ];

  for (const [fileName, heading] of descriptors) {
    const filePath = path.join(globalDir, 'memory', fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const entries = parseMemoryFile(fs.readFileSync(filePath, 'utf8')).entries.map(displayEntry);
    if (entries.length === 0) {
      continue;
    }

    sectionMap.set(heading, [...(sectionMap.get(heading) ?? []), ...entries]);
    globalCount += entries.length;
  }

  return { sectionMap, globalCount };
};

export const readMemorySections = (globalDir, projectDir, mode = 'all') => {
  const sectionMap = new Map();
  let globalCount = 0;
  let projectCount = 0;

  if (mode !== 'global') {
    for (const section of readProjectSections(projectDir)) {
      sectionMap.set(section.heading, [...(sectionMap.get(section.heading) ?? []), ...section.entries]);
      projectCount += section.entries.length;
    }
  }

  if (mode !== 'project') {
    const globalSections = readGlobalSections(globalDir);
    for (const [heading, entries] of globalSections.sectionMap.entries()) {
      sectionMap.set(heading, [...(sectionMap.get(heading) ?? []), ...entries]);
    }
    globalCount += globalSections.globalCount;
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

export const loadMemorySnapshot = (globalDir, projectDir) =>
  readMemorySections(globalDir, projectDir, 'all');

export const searchMemorySnapshot = (query, snapshot) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return { sections: snapshot.sections };
  }

  return {
    sections: snapshot.sections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((entry) => entry.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((section) => section.entries.length > 0),
  };
};

const readSessionState = (projectDir) => {
  const statePath = path.join(projectDir, 'state', 'session-history.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
};

export const loadReviewState = (_globalDir, projectDir) => {
  const sessionState = readSessionState(projectDir);

  return {
    pending: Boolean(sessionState?.needs_deep_review),
    stale: Boolean(sessionState?.needs_deep_review && sessionState.review_age >= 2),
    summary: sessionState?.session_summary ?? null,
  };
};

export const runStatusCommand = ({
  globalDir,
  projectDir,
  sessionState,
  snapshot,
  stats,
}) => ({
  globalDir,
  projectDir,
  globalCount: snapshot.globalCount,
  projectCount: snapshot.projectCount,
  lastProcessed: sessionState?.last_processed ?? 'unknown',
  sessionCount: stats?.session_count ?? 0,
});

export const runSearchCommand = ({ query, snapshot }) => searchMemorySnapshot(query, snapshot);

export const runReviewCommand = ({
  globalDir,
  projectDir,
  reviewState,
}) => ({
  globalDir,
  hasSummary: Boolean(reviewState.summary?.trim()),
  pending: reviewState.pending,
  projectDir,
  stale: reviewState.stale,
  summary: reviewState.summary,
});

export const runInspectCommand = ({
  globalDir,
  projectDir,
  snapshot,
}) => ({
  globalDir,
  projectDir,
  snapshot,
});
