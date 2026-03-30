export type MemoryTarget =
  | 'user-preferences'
  | 'user-patterns'
  | 'pending-items'
  | 'project-context'
  | 'project-decisions';

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ExtractionResult {
  entry: string;
  target: MemoryTarget;
  scope: 'global' | 'project';
  confidence: ExtractionConfidence;
}
