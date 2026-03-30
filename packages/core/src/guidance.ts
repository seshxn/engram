import * as fs from 'fs';
import * as path from 'path';
import type { MessagePair } from './transcript/types.js';

export interface GuidanceState {
  content: string;
  generated_at: string;
  consumed: boolean;
}

const GUIDANCE_PATH = (projectDir: string): string => path.join(projectDir, 'state', 'guidance.json');
const MAX_GUIDANCE_LENGTH = 500;
const FILE_PATH_PATTERN = /\b[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+\b/g;

const clean = (value: string): string => value.replace(/\s+/g, ' ').trim();

const sentence = (value: string): string => {
  const trimmed = clean(value);
  if (!trimmed) {
    return '';
  }

  return trimmed[0].toUpperCase() + trimmed.slice(1);
};

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const extractNextSteps = (messages: string[]): string[] =>
  unique(
    messages.flatMap((message) => {
      const results: string[] = [];
      const patterns = [
        /\b(?:next|after that)\b[^a-zA-Z0-9]+(.+)$/i,
        /\bstill need to\s+(.+)$/i,
        /\bcontinue(?: with| on)?\s+(.+)$/i,
        /\bremaining(?: work| task)?[:\s-]+(.+)$/i,
        /\btodo[:\s-]+(.+)$/i,
      ];

      for (const pattern of patterns) {
        const match = clean(message).match(pattern);
        if (match?.[1]) {
          results.push(sentence(match[1]));
        }
      }

      return results;
    }),
  );

const extractFiles = (messages: string[]): string[] =>
  unique(
    messages.flatMap((message) => {
      return Array.from(message.matchAll(FILE_PATH_PATTERN)).map((match) => match[0]);
    }),
  ).slice(0, 3);

export const generateGuidance = (pairs: MessagePair[]): string => {
  const recent = pairs.slice(-5);
  if (recent.length === 0) {
    return '';
  }

  const recentUserMessages = recent.map((pair) => pair.user).filter(Boolean);
  const recentAssistantMessages = recent.map((pair) => pair.assistant).filter(Boolean);
  const latestTopic = sentence(recentUserMessages.at(-1) ?? recentAssistantMessages.at(-1) ?? '');
  const nextSteps = extractNextSteps(recentUserMessages);
  const files = extractFiles([...recentUserMessages, ...recentAssistantMessages]);

  const lines = [
    latestTopic ? `Last focus: ${latestTopic}` : '',
    files.length > 0 ? `Files in play: ${files.join(', ')}` : '',
    nextSteps.length > 0 ? `Open work: ${nextSteps.join('; ')}` : '',
  ].filter(Boolean);

  if (lines.length === 0) {
    return '';
  }

  return lines.join('\n').slice(0, MAX_GUIDANCE_LENGTH);
};

export const loadGuidanceState = (projectDir: string): GuidanceState | null => {
  try {
    return JSON.parse(fs.readFileSync(GUIDANCE_PATH(projectDir), 'utf8')) as GuidanceState;
  } catch {
    return null;
  }
};

export const saveGuidanceState = (projectDir: string, state: GuidanceState): void => {
  fs.writeFileSync(GUIDANCE_PATH(projectDir), JSON.stringify(state, null, 2), 'utf8');
};

export const writeGuidance = (
  projectDir: string,
  pairs: MessagePair[],
  generatedAt = new Date().toISOString(),
): void => {
  const content = generateGuidance(pairs);
  if (!content) {
    return;
  }

  saveGuidanceState(projectDir, {
    content,
    generated_at: generatedAt,
    consumed: false,
  });
};

export const getInjectableGuidance = (
  projectDir: string,
  now = new Date(),
): GuidanceState | null => {
  const guidance = loadGuidanceState(projectDir);
  if (!guidance || guidance.consumed) {
    return null;
  }

  const ageMs = now.getTime() - new Date(guidance.generated_at).getTime();
  if (Number.isNaN(ageMs) || ageMs > 24 * 60 * 60 * 1000) {
    return null;
  }

  return guidance;
};

export const markGuidanceConsumed = (projectDir: string): void => {
  const guidance = loadGuidanceState(projectDir);
  if (!guidance || guidance.consumed) {
    return;
  }

  saveGuidanceState(projectDir, { ...guidance, consumed: true });
};
