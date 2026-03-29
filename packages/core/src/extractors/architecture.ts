import type { ExtractionResult } from './types.js';

const ARCHITECTURE_KEYWORDS = [
  'next.js',
  'react',
  'vue',
  'svelte',
  'monorepo',
  'pnpm',
  'docker',
  'aws',
  'deploys to',
  'deploys on',
  'build system',
  'file structure',
];

const CORRECTION_PREFIXES = [
  /^no,\s+/i,
  /^actually,\s*(?:use|prefer)\s+/i,
  /^don't\s+/i,
  /^stop doing\s+/i,
];

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

export const extractArchitecture = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const trimmed = userMsg.trim();
  const normalized = trimmed.toLowerCase();

  if (CORRECTION_PREFIXES.some((pattern) => pattern.test(trimmed))) {
    return [];
  }

  if (!ARCHITECTURE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return [];
  }

  return [
    {
      entry: sentenceCase(trimmed),
      target: 'project-context',
      scope: 'project',
    },
  ];
};
