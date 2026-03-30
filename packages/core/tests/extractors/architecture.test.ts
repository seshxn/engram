import { describe, expect, it } from 'vitest';
import { extractArchitecture } from '../../src/extractors/architecture.js';

describe('architecture extractor', () => {
  it('captures architecture signals from framework and build keywords', () => {
    const results = extractArchitecture(
      'the app uses Next.js in a pnpm monorepo and deploys to AWS',
      'Noted.',
    );

    expect(results).toEqual([
      {
        entry: 'The app uses Next.js in a pnpm monorepo and deploys to AWS',
        target: 'project-context',
        scope: 'project',
        confidence: 'low',
      },
    ]);
  });

  it('captures modern stack signals beyond the initial keyword set', () => {
    const results = extractArchitecture(
      'this repo uses GraphQL with Redis and deploys on Fly',
      'Noted.',
    );

    expect(results).toEqual([
      {
        entry: 'This repo uses GraphQL with Redis and deploys on Fly',
        target: 'project-context',
        scope: 'project',
        confidence: 'low',
      },
    ]);
  });

  it('returns no results for generic requests', () => {
    expect(extractArchitecture('please write tests', 'Working on it.')).toEqual([]);
  });

  it('does not treat preference corrections as architecture context', () => {
    expect(
      extractArchitecture('no, use pnpm not npm for this project', 'Switching to pnpm.'),
    ).toEqual([]);
  });
});
