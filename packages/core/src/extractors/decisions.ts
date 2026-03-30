import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

export const extractDecisions = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const trimmed = userMsg.trim();

  const patterns: Array<{ pattern: RegExp; transform: (value: string) => string }> = [
    { pattern: /^let'?s go with\s+(.+)$/i, transform: (value) => `go with ${value}` },
    { pattern: /^(?:we(?:'ll| will)|decided on)\s+(.+)$/i, transform: (value) => value },
    { pattern: /^(?:i )?(?:chose|picked|selected)\s+(.+)$/i, transform: (value) => value },
    { pattern: /^we(?:'re| are) going (?:to |with)\s*(.+)$/i, transform: (value) => value },
    { pattern: /^(?:the )?(?:plan|approach) is (?:to )?\s*(.+)$/i, transform: (value) => value },
  ];

  for (const { pattern, transform } of patterns) {
    const match = trimmed.match(pattern);
    if (!match) {
      continue;
    }

    return [
      {
        entry: sentenceCase(transform(match[1].trim())),
        target: 'project-decisions',
        scope: 'project',
        confidence: 'high',
      },
    ];
  }

  return [];
};
