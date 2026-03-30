export { processSession } from './process-session.js';
export { generateOutput } from './generate-output.js';
export { buildMemoryPayload, enforceBudget, renderMemoryPayload } from './generate-output.js';
export { generateDiffOutput } from './generate-diff-output.js';

export { getGlobalDir, getProjectDir, ensureDirs } from './utils/paths.js';
export { loadConfig, DEFAULT_CONFIG } from './utils/config.js';
export { logger } from './utils/logger.js';
export type { EngramConfig } from './utils/config.js';
export {
  formatGuidanceXml,
  formatMemoryXml,
  formatReviewXml,
  formatSummaryLine,
} from './utils/format.js';
export type { MemorySection } from './utils/format.js';

export type { MessagePair, TranscriptAdapter } from './transcript/types.js';
export type { ExtractionResult, MemoryTarget } from './extractors/types.js';
