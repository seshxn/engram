import { runReviewCommand as runReviewCommandRuntime } from '../runtime/index.js';
import type { ReviewState } from '../services/review-service.js';

export interface ReviewCommandInput {
  globalDir: string;
  projectDir: string;
  reviewState: ReviewState;
}

export interface ReviewCommandResult {
  globalDir: string;
  hasSummary: boolean;
  pending: boolean;
  projectDir: string;
  stale: boolean;
  summary: string | null;
}

export const runReviewCommand = ({
  globalDir,
  projectDir,
  reviewState,
}: ReviewCommandInput): ReviewCommandResult =>
  runReviewCommandRuntime({
    globalDir,
    projectDir,
    reviewState,
  });
