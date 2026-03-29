import type { MessagePair } from '../transcript/types.js';
import type { ExtractionResult } from './types.js';

interface IssueSample {
  display: string;
  count: number;
}

const normalizeIssue = (value: string): string => {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
};

const extractIssue = (text: string): string | null => {
  const cannotFindModule = text.match(/cannot find module ['"`][^'"`]+['"`]/i);
  if (cannotFindModule) {
    return cannotFindModule[0];
  }

  const errorLine = text.match(/\b(error|failed|failure|exception)\b[^.!?\n]*/i);
  if (errorLine) {
    return errorLine[0].trim();
  }

  return null;
};

export const extractStruggles = (pairs: MessagePair[]): ExtractionResult[] => {
  const issues = new Map<string, IssueSample>();

  for (const pair of pairs) {
    for (const text of [pair.user, pair.assistant]) {
      const issue = extractIssue(text);
      if (!issue) {
        continue;
      }

      const key = normalizeIssue(issue);
      const current = issues.get(key);
      if (current) {
        current.count += 1;
      } else {
        issues.set(key, { display: issue, count: 1 });
      }
    }
  }

  for (const issue of issues.values()) {
    if (issue.count >= 3) {
      return [
        {
          entry: `Repeatedly struggles with: ${issue.display}`,
          target: 'user-patterns',
          scope: 'global',
        },
      ];
    }
  }

  return [];
};
