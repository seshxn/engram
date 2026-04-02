import { loadReviewState as loadReviewStateRuntime } from '../runtime/index.js';

export interface ReviewState {
  pending: boolean;
  stale: boolean;
  summary: string | null;
}

export const loadReviewState = (_globalDir: string, projectDir: string): ReviewState => {
  return loadReviewStateRuntime(_globalDir, projectDir);
};
