export { processSession } from './process-session.js';
export { generateOutput } from './generate-output.js';

export { getGlobalDir, getProjectDir, ensureDirs } from './utils/paths.js';
export { loadConfig, DEFAULT_CONFIG } from './utils/config.js';
export type { EngramConfig } from './utils/config.js';
export { formatMemoryXml, formatReviewXml, formatSummaryLine } from './utils/format.js';
export type { MemorySection } from './utils/format.js';

export type { MessagePair, TranscriptAdapter } from './transcript/types.js';
export type { ExtractionResult, MemoryTarget } from './extractors/types.js';
