export type MemoryTarget =
  | 'user-preferences'
  | 'user-patterns'
  | 'pending-items'
  | 'project-context'
  | 'project-decisions';

export interface ExtractionResult {
  entry: string;
  target: MemoryTarget;
  scope: 'global' | 'project';
}
