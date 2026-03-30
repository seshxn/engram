import type { ExtractionResult } from './types.js';
import { detectScope } from './scope.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

export const extractTodos = (userMsg: string, _assistantMsg: string): ExtractionResult[] => {
  const trimmed = userMsg.trim();
  const patterns = [
    /^(?:todo[:\s-]*)\s*(.+)$/i,
    /^we still need to\s+(.+)$/i,
    /^follow up on\s+(.+)$/i,
    /^(?:do not|don't) forget to\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) {
      continue;
    }

    const entry = sentenceCase(match[1].trim());
    return [
      {
        entry,
        target: 'pending-items',
        scope: detectScope(match[1].trim()),
        confidence: 'high',
      },
    ];
  }

  return [];
};
