import * as fs from 'fs';
import * as path from 'path';
import { readAllMemories } from './memory/reader.js';
import { formatMemoryXml, formatReviewXml, formatSummaryLine } from './utils/format.js';
import { ensureDirs } from './utils/paths.js';

interface SessionState {
  needs_deep_review: boolean;
  review_age: number;
  session_summary?: string;
  last_processed: string;
}

const loadSessionState = (projectDir: string): SessionState | null => {
  const statePath = path.join(projectDir, 'state', 'session-history.json');

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as SessionState;
  } catch {
    return null;
  }
};

const saveSessionState = (projectDir: string, state: SessionState): void => {
  fs.writeFileSync(
    path.join(projectDir, 'state', 'session-history.json'),
    JSON.stringify(state, null, 2),
    'utf8',
  );
};

export const generateOutput = (globalDir: string, projectDir: string): string => {
  ensureDirs(globalDir, projectDir);

  const { sections, globalCount, projectCount } = readAllMemories(globalDir, projectDir);
  const outputParts: string[] = [];

  const memoryXml = formatMemoryXml(sections);
  if (memoryXml) {
    outputParts.push(memoryXml);
  }

  const sessionState = loadSessionState(projectDir);
  if (sessionState?.needs_deep_review && sessionState.session_summary) {
    if (sessionState.review_age < 2) {
      outputParts.push(formatReviewXml(sessionState.session_summary));
      saveSessionState(projectDir, {
        ...sessionState,
        review_age: sessionState.review_age + 1,
      });
    } else {
      saveSessionState(projectDir, {
        ...sessionState,
        needs_deep_review: false,
        review_age: sessionState.review_age + 1,
      });
    }
  }

  if (globalCount > 0 || projectCount > 0) {
    outputParts.push(formatSummaryLine(globalCount, projectCount));
  }

  return outputParts.join('\n\n');
};
