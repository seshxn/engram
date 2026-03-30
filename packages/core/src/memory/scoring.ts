import type { ExtractionConfidence } from '../extractors/types.js';
import { parseEntryMetadata } from './metadata.js';

const HALF_LIFE_DAYS = 30;
const LN_2 = 0.693;

export const freshnessScore = (entry: string, now = new Date()): number => {
  const { date } = parseEntryMetadata(entry);
  if (!date) {
    return 0.1;
  }

  const entryTime = new Date(`${date}T00:00:00.000Z`).getTime();
  if (Number.isNaN(entryTime)) {
    return 0.1;
  }

  const ageDays = Math.max(0, (now.getTime() - entryTime) / (24 * 60 * 60 * 1000));
  return Math.exp((-LN_2 * ageDays) / HALF_LIFE_DAYS);
};

export const confidenceRank = (confidence?: ExtractionConfidence): number => {
  switch (confidence) {
    case 'low':
      return 0;
    case 'medium':
      return 1;
    case 'high':
      return 2;
    default:
      return 1;
  }
};
