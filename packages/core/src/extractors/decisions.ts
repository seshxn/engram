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

  const letsGoWith = trimmed.match(/^let'?s go with\s+(.+)$/i);
  if (letsGoWith) {
    return [
      {
        entry: sentenceCase(`go with ${letsGoWith[1].trim()}`),
        target: 'project-decisions',
        scope: 'project',
      },
    ];
  }

  const weWillUse = trimmed.match(/^(?:we(?:'ll| will)|decided on)\s+(.+)$/i);
  if (weWillUse) {
    return [
      {
        entry: sentenceCase(weWillUse[1].trim()),
        target: 'project-decisions',
        scope: 'project',
      },
    ];
  }

  return [];
};
