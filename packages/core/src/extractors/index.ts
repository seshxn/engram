import type { MessagePair } from '../transcript/types.js';
import { extractArchitecture } from './architecture.js';
import { extractCorrections } from './corrections.js';
import { extractDecisions } from './decisions.js';
import { extractRemember } from './remember.js';
import { extractReviewSuggestions } from './review-suggestions.js';
import { extractStruggles } from './struggles.js';
import { extractTodos } from './todos.js';
import type { ExtractionResult } from './types.js';

type PairExtractor = (userMsg: string, assistantMsg: string) => ExtractionResult[];

const PAIR_EXTRACTORS: PairExtractor[] = [
  extractCorrections,
  extractDecisions,
  extractTodos,
  extractRemember,
  extractArchitecture,
  extractReviewSuggestions,
];

export const runAllExtractors = (pairs: MessagePair[]): ExtractionResult[] => {
  if (pairs.length === 0) {
    return [];
  }

  const results: ExtractionResult[] = [];

  for (const pair of pairs) {
    for (const extractor of PAIR_EXTRACTORS) {
      results.push(...extractor(pair.user, pair.assistant));
    }
  }

  results.push(...extractStruggles(pairs));

  return results;
};
