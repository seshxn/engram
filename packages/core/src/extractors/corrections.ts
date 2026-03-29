import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

const PATTERNS = [
  /^no,\s*(.+)$/i,
  /^actually,\s*prefer\s+(.+)$/i,
  /^actually,\s*use\s+(.+)$/i,
  /^don't\s+(.+)$/i,
  /^stop doing\s+(.+)$/i,
];

export const extractCorrections = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const trimmed = userMsg.trim();

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) {
      continue;
    }

    const entry = sentenceCase(match[1].trim());
    return [{ entry, target: 'user-preferences', scope: 'global' }];
  }

  return [];
};
