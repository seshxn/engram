import { detectScope } from './scope.js';
import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

const TOOL_PATTERN = /\b(pnpm|npm|yarn|bun|prettier|biome|eslint)\b/gi;

export const extractTooling = (userMsg: string, _assistantMsg: string): ExtractionResult[] => {
  const trimmed = userMsg.trim();
  const tools = Array.from(trimmed.matchAll(TOOL_PATTERN)).map((match) => match[1].toLowerCase());

  if (tools.length === 0) {
    return [];
  }

  const uniqueTools = Array.from(new Set(tools));
  const scope = detectScope(trimmed);
  const prefix = /^i prefer\b/i.test(trimmed) ? 'prefer' : 'use';

  return [
    {
      entry: sentenceCase(`${prefix} ${uniqueTools.join(' and ')}`),
      target: scope === 'global' ? 'user-preferences' : 'project-context',
      scope,
      confidence: 'medium',
    },
  ];
};
