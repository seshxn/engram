import { detectScope } from './scope.js';
import type { ExtractionResult } from './types.js';

const sentenceCase = (value: string): string => {
  if (value.length === 0) {
    return value;
  }

  return `${value[0].toUpperCase()}${value.slice(1)}`;
};

export const extractTesting = (userMsg: string, _assistantMsg: string): ExtractionResult[] => {
  const trimmed = userMsg.trim();

  const frameworkMatch = trimmed.match(/\b(jest|vitest|mocha|pytest)\b/i);
  if (frameworkMatch) {
    const scope = detectScope(trimmed);
    return [
      {
        entry: sentenceCase(`use ${frameworkMatch[1].toLowerCase()}`),
        target: scope === 'global' ? 'user-preferences' : 'project-context',
        scope,
        confidence: 'medium',
      },
    ];
  }

  if (/\b(write tests first|tdd|always add tests)\b/i.test(trimmed)) {
    return [
      {
        entry: 'Write tests first',
        target: 'user-preferences',
        scope: 'global',
        confidence: 'high',
      },
    ];
  }

  return [];
};
