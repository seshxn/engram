import type { MessagePair } from './types.js';

const MAX_SUMMARY_LENGTH = 3000;
const SNIPPET_LENGTH = 140;

const compact = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export const summarizeTranscript = (pairs: MessagePair[]): string => {
  if (pairs.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const pair of pairs) {
    const user = truncate(compact(pair.user), SNIPPET_LENGTH);
    const assistant = truncate(compact(pair.assistant), SNIPPET_LENGTH);
    lines.push(`- User: ${user}`);
    lines.push(`  Assistant: ${assistant}`);
  }

  const summary = lines.join('\n');
  return truncate(summary, MAX_SUMMARY_LENGTH);
};
