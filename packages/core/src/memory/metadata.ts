import type { ExtractionConfidence } from '../extractors/types.js';

const CONFIDENCE_TAG_PATTERN = /\s*\[confidence:(high|medium|low)\]\s*$/i;
const DATE_TAG_PATTERN = /\s*\[(\d{4}-\d{2}-\d{2})\]\s*$/;

export interface ParsedEntryMetadata {
  confidence?: ExtractionConfidence;
  date: string | null;
  text: string;
}

export const stripConfidenceTag = (entry: string): string =>
  entry.replace(CONFIDENCE_TAG_PATTERN, '').trim();

export const parseEntryMetadata = (entry: string): ParsedEntryMetadata => {
  const confidence = entry.match(CONFIDENCE_TAG_PATTERN)?.[1] as ExtractionConfidence | undefined;
  const withoutConfidence = stripConfidenceTag(entry);
  const date = withoutConfidence.match(DATE_TAG_PATTERN)?.[1] ?? null;
  const text = withoutConfidence.replace(DATE_TAG_PATTERN, '').trim();

  return { text, date, confidence };
};

export const stripMetadataTags = (entry: string): string => parseEntryMetadata(entry).text;

export const displayEntry = (entry: string): string => {
  const parsed = parseEntryMetadata(entry);
  return parsed.date ? `${parsed.text} [${parsed.date}]` : parsed.text;
};

export const formatEntryWithMetadata = (
  text: string,
  date: string,
  confidence?: ExtractionConfidence,
): string => `${text} [${date}]${confidence ? ` [confidence:${confidence}]` : ''}`;
