import type { MessagePair } from '../transcript/types.js';
import { extractArchitecture } from './architecture.js';
import { extractCommunication } from './communication.js';
import { extractCorrections } from './corrections.js';
import { extractDecisions } from './decisions.js';
import { extractRemember } from './remember.js';
import { extractReviewSuggestions } from './review-suggestions.js';
import { extractStruggles } from './struggles.js';
import { extractTesting } from './testing.js';
import { extractTooling } from './tooling.js';
import { extractTodos } from './todos.js';
import type { ExtractionResult } from './types.js';

type PairExtractor = (userMsg: string, assistantMsg: string) => ExtractionResult[];

interface NamedPairExtractor {
  extract: PairExtractor;
  name: string;
}

const PAIR_EXTRACTORS: NamedPairExtractor[] = [
  { name: 'corrections', extract: extractCorrections },
  { name: 'decisions', extract: extractDecisions },
  { name: 'todos', extract: extractTodos },
  { name: 'remember', extract: extractRemember },
  { name: 'communication', extract: extractCommunication },
  { name: 'testing', extract: extractTesting },
  { name: 'tooling', extract: extractTooling },
  { name: 'architecture', extract: extractArchitecture },
  { name: 'review-suggestions', extract: extractReviewSuggestions },
];

export interface ExtractionRun {
  extractorHits: Record<string, number>;
  results: ExtractionResult[];
}

export const runAllExtractorsWithStats = (pairs: MessagePair[]): ExtractionRun => {
  if (pairs.length === 0) {
    return { results: [], extractorHits: {} };
  }

  const results: ExtractionResult[] = [];
  const extractorHits: Record<string, number> = {};

  for (const pair of pairs) {
    for (const extractor of PAIR_EXTRACTORS) {
      const extracted = extractor.extract(pair.user, pair.assistant);
      if (extracted.length > 0) {
        extractorHits[extractor.name] = (extractorHits[extractor.name] ?? 0) + extracted.length;
        results.push(...extracted);
      }
    }
  }

  const struggles = extractStruggles(pairs);
  if (struggles.length > 0) {
    extractorHits.struggles = (extractorHits.struggles ?? 0) + struggles.length;
    results.push(...struggles);
  }

  return { results, extractorHits };
};

export const runAllExtractors = (pairs: MessagePair[]): ExtractionResult[] =>
  runAllExtractorsWithStats(pairs).results;
