import * as fs from 'fs';
import * as path from 'path';
import { getInjectableGuidance, markGuidanceConsumed } from './guidance.js';
import { hashString, saveInjectionState } from './injection-state.js';
import {
  readDetailedMemories,
  type DetailedMemoryEntry,
  type DetailedMemorySection,
} from './memory/reader.js';
import { confidenceRank, freshnessScore } from './memory/scoring.js';
import {
  formatGuidanceXml,
  formatMemoryXml,
  formatReviewXml,
  formatSummaryLine,
} from './utils/format.js';
import { loadConfig } from './utils/config.js';
import { ensureDirs } from './utils/paths.js';

interface SessionState {
  needs_deep_review: boolean;
  review_age: number;
  session_summary?: string;
  last_processed: string;
}

export interface MemoryPayloadSection {
  heading: string;
  entries: DetailedMemoryEntry[];
}

export interface MemoryPayloadParts {
  guidance?: string;
  sections: MemoryPayloadSection[];
  review?: string;
  sessionState: SessionState | null;
  summary?: string;
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

const cloneParts = (parts: MemoryPayloadParts): MemoryPayloadParts => ({
  guidance: parts.guidance,
  sections: parts.sections.map((section) => ({
    heading: section.heading,
    entries: section.entries.map((entry) => ({ ...entry })),
  })),
  review: parts.review,
  sessionState: parts.sessionState ? { ...parts.sessionState } : null,
  summary: parts.summary,
});

const pickTrimCandidate = (
  sections: MemoryPayloadSection[],
  scope: 'global' | 'project',
): { entryIndex: number; sectionIndex: number } | null => {
  let candidate: { entryIndex: number; sectionIndex: number } | null = null;
  let candidateConfidence = Number.POSITIVE_INFINITY;
  let candidateFreshness = Number.POSITIVE_INFINITY;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    for (let entryIndex = 0; entryIndex < sections[sectionIndex].entries.length; entryIndex += 1) {
      const entry = sections[sectionIndex].entries[entryIndex];
      if (entry.scope !== scope) {
        continue;
      }

      const currentConfidence = confidenceRank(entry.confidence);
      const currentFreshness = freshnessScore(entry.text);
      if (
        currentConfidence < candidateConfidence ||
        (currentConfidence === candidateConfidence && currentFreshness < candidateFreshness)
      ) {
        candidateConfidence = currentConfidence;
        candidateFreshness = currentFreshness;
        candidate = { sectionIndex, entryIndex };
      }
    }
  }

  return candidate;
};

const removeCandidate = (
  parts: MemoryPayloadParts,
  candidate: { entryIndex: number; sectionIndex: number } | null,
): boolean => {
  if (!candidate) {
    return false;
  }

  parts.sections[candidate.sectionIndex].entries.splice(candidate.entryIndex, 1);
  parts.sections = parts.sections.filter((section) => section.entries.length > 0);
  return true;
};

const sectionsToXml = (sections: DetailedMemorySection[]): string =>
  formatMemoryXml(
    sections.map((section) => ({
      heading: section.heading,
      entries: section.entries.map((entry) => entry.text),
    })),
  );

export const renderMemoryPayload = (parts: MemoryPayloadParts): string => {
  const outputParts: string[] = [];

  if (parts.guidance) {
    outputParts.push(formatGuidanceXml(parts.guidance));
  }

  const memoryXml = sectionsToXml(parts.sections);
  if (memoryXml) {
    outputParts.push(memoryXml);
  }

  if (parts.review) {
    outputParts.push(parts.review);
  }

  if (parts.summary) {
    outputParts.push(parts.summary);
  }

  return outputParts.join('\n\n');
};

export const buildMemoryPayload = (globalDir: string, projectDir: string): MemoryPayloadParts => {
  ensureDirs(globalDir, projectDir);

  const { sections, globalCount, projectCount } = readDetailedMemories(globalDir, projectDir);
  const sessionState = loadSessionState(projectDir);
  const guidance = getInjectableGuidance(projectDir)?.content;

  return {
    guidance,
    sections,
    review:
      sessionState?.needs_deep_review &&
      sessionState.session_summary &&
      sessionState.review_age < 2
        ? formatReviewXml(sessionState.session_summary)
        : undefined,
    sessionState,
    summary:
      globalCount > 0 || projectCount > 0
        ? formatSummaryLine(globalCount, projectCount)
        : undefined,
  };
};

export const enforceBudget = (parts: MemoryPayloadParts, budget: number): MemoryPayloadParts => {
  const trimmed = cloneParts(parts);

  while (renderMemoryPayload(trimmed).length > budget) {
    if (trimmed.summary) {
      trimmed.summary = undefined;
      continue;
    }
    if (trimmed.review) {
      trimmed.review = undefined;
      continue;
    }
    if (removeCandidate(trimmed, pickTrimCandidate(trimmed.sections, 'global'))) {
      continue;
    }
    if (removeCandidate(trimmed, pickTrimCandidate(trimmed.sections, 'project'))) {
      continue;
    }
    break;
  }

  return trimmed;
};

const advanceReviewLifecycle = (
  projectDir: string,
  sessionState: SessionState | null,
  reviewWasInjected: boolean,
): void => {
  if (!sessionState?.needs_deep_review) {
    return;
  }

  if (reviewWasInjected && sessionState.session_summary) {
    saveSessionState(projectDir, {
      ...sessionState,
      review_age: sessionState.review_age + 1,
    });
    return;
  }

  if (sessionState.review_age >= 2) {
    saveSessionState(projectDir, {
      ...sessionState,
      needs_deep_review: false,
      review_age: sessionState.review_age,
    });
  }
};

export const generateOutput = (globalDir: string, projectDir: string): string => {
  ensureDirs(globalDir, projectDir);

  const config = loadConfig(globalDir);
  const parts = enforceBudget(buildMemoryPayload(globalDir, projectDir), config.injection_budget);
  const output = renderMemoryPayload(parts);

  if (parts.guidance && output) {
    markGuidanceConsumed(projectDir);
    saveInjectionState(projectDir, hashString(renderMemoryPayload({ ...parts, guidance: undefined })));
  } else {
    saveInjectionState(projectDir, hashString(output));
  }

  advanceReviewLifecycle(projectDir, parts.sessionState, Boolean(parts.review && output));

  return output;
};
