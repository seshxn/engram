const PUNCTUATION = /[.,;:!?]/g;
const DUPLICATE_THRESHOLD = 0.8;
import { stripMetadataTags } from './metadata.js';

export const normalize = (entry: string): string => {
  return stripMetadataTags(entry)
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const bigrams = (value: string): Set<string> => {
  const pairs = new Set<string>();

  for (let index = 0; index < value.length - 1; index += 1) {
    pairs.add(value.slice(index, index + 2));
  }

  return pairs;
};

export const similarity = (a: string, b: string): number => {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (normalizedA === normalizedB) {
    return 1;
  }

  if (normalizedA.length < 2 || normalizedB.length < 2) {
    return 0;
  }

  const aBigrams = bigrams(normalizedA);
  const bBigrams = bigrams(normalizedB);
  let intersection = 0;

  for (const pair of aBigrams) {
    if (bBigrams.has(pair)) {
      intersection += 1;
    }
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size);
};

export const isDuplicate = (a: string, b: string): boolean => {
  return similarity(a, b) >= DUPLICATE_THRESHOLD;
};

export interface DeduplicateResult {
  toAdd: string[];
  toUpdate: Array<{ oldIndex: number; newEntry: string }>;
}

export const deduplicateEntries = (
  existing: string[],
  incoming: string[],
): DeduplicateResult => {
  const toAdd: string[] = [];
  const toUpdate: Array<{ oldIndex: number; newEntry: string }> = [];
  const matchedExisting = new Set<number>();
  const uniqueIncoming: string[] = [];

  for (const entry of incoming) {
    if (!uniqueIncoming.some((candidate) => isDuplicate(candidate, entry))) {
      uniqueIncoming.push(entry);
    }
  }

  for (const entry of uniqueIncoming) {
    let duplicateIndex = -1;

    for (let index = 0; index < existing.length; index += 1) {
      if (matchedExisting.has(index)) {
        continue;
      }

      if (isDuplicate(existing[index], entry)) {
        duplicateIndex = index;
        break;
      }
    }

    if (duplicateIndex >= 0) {
      matchedExisting.add(duplicateIndex);
      toUpdate.push({ oldIndex: duplicateIndex, newEntry: entry });
    } else {
      toAdd.push(entry);
    }
  }

  return { toAdd, toUpdate };
};
