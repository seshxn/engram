import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

const PATTERNS: Array<{ pattern: RegExp; transform?: (value: string) => string }> = [
  { pattern: /^no,\s*(.+)$/i },
  { pattern: /^actually[,.]?\s+prefer\s+(.+)$/i, transform: (value) => `prefer ${value}` },
  { pattern: /^actually[,.]?\s+use\s+(.+)$/i, transform: (value) => `use ${value}` },
  { pattern: /^wait[,.]?\s+(.+)$/i },
  { pattern: /^i meant\s+(.+)$/i },
  { pattern: /^that'?s (?:wrong|incorrect)[,.]?\s*(.+)$/i },
  { pattern: /^(?:please )?(?:prefer|use)\s+(.+)\s+instead$/i },
  { pattern: /^(?:always|never)\s+(.+)$/i },
  { pattern: /^(?:from now on|going forward)[,.]?\s+(.+)$/i },
  { pattern: /^i (?:always|prefer to|usually)\s+(.+)$/i },
  { pattern: /^don't\s+(.+)$/i },
  { pattern: /^stop doing\s+(.+)$/i },
];

export const extractCorrections = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const trimmed = userMsg.trim();

  for (const { pattern, transform } of PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) {
      continue;
    }

    const entry = sentenceCase(transform ? transform(match[1].trim()) : match[1].trim());
    return [{ entry, target: 'user-preferences', scope: 'global', confidence: 'medium' }];
  }

  return [];
};
