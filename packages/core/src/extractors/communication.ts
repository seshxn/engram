import type { ExtractionResult } from './types.js';

const contains = (text: string, pattern: RegExp): boolean => pattern.test(text);

export const extractCommunication = (
  userMsg: string,
  _assistantMsg: string,
): ExtractionResult[] => {
  const trimmed = userMsg.trim();

  if (contains(trimmed, /\b(?:be more concise|shorter answers|less verbose|skip the summary)\b/i)) {
    return [
      {
        entry: 'Be more concise',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ];
  }

  if (contains(trimmed, /\b(?:explain more|be more detailed|show me the code)\b/i)) {
    return [
      {
        entry: 'Show more code and explain in more detail',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ];
  }

  return [];
};
