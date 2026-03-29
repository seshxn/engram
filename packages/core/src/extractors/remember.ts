import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

const extractContent = (userMsg: string): string | null => {
  const match = userMsg.trim().match(/^(?:remember that|keep in mind|note that)\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

export const extractRemember = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const content = extractContent(userMsg);

  if (!content) {
    return [];
  }

  const preferenceMatch = content.match(/^i prefer\s+(.+)$/i);
  if (preferenceMatch) {
    return [
      {
        entry: sentenceCase(`prefer ${preferenceMatch[1].trim()}`),
        target: 'user-preferences',
        scope: 'global',
      },
    ];
  }

  return [
    {
      entry: sentenceCase(content),
      target: 'project-context',
      scope: 'project',
    },
  ];
};
