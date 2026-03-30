import type { ExtractionResult, MemoryTarget } from './types.js';

const SUGGESTIONS_BLOCK_PATTERN = /<engram-suggestions>\s*([\s\S]*?)\s*<\/engram-suggestions>/i;
const SECTION_PATTERN = /##\s+([^\n]+)\n([\s\S]*?)(?=\n##\s+|\s*$)/g;

const SECTION_TARGETS: Record<string, { scope: 'global' | 'project'; target: MemoryTarget }> = {
  'user preferences': { scope: 'global', target: 'user-preferences' },
  'user patterns': { scope: 'global', target: 'user-patterns' },
  'pending items (global)': { scope: 'global', target: 'pending-items' },
  'pending items (project)': { scope: 'project', target: 'pending-items' },
  'project context': { scope: 'project', target: 'project-context' },
  'project decisions': { scope: 'project', target: 'project-decisions' },
};

export const extractReviewSuggestions = (
  _userMsg: string,
  assistantMsg: string,
): ExtractionResult[] => {
  const block = assistantMsg.match(SUGGESTIONS_BLOCK_PATTERN)?.[1];
  if (!block) {
    return [];
  }

  const results: ExtractionResult[] = [];

  for (const match of block.matchAll(SECTION_PATTERN)) {
    const heading = match[1].trim().toLowerCase();
    const mapping = SECTION_TARGETS[heading];
    if (!mapping) {
      continue;
    }

    const entries = match[2]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean);

    for (const entry of entries) {
      results.push({
        entry,
        scope: mapping.scope,
        target: mapping.target,
        confidence: 'high',
      });
    }
  }

  return results;
};
