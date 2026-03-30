import { describe, expect, it } from 'vitest';
import { detectScope } from '../../src/extractors/scope.js';

describe('scope detection', () => {
  it('detects strong global scope signals', () => {
    expect(detectScope('use pnpm across all projects')).toBe('global');
  });

  it('treats generic first-person preferences as global scope', () => {
    expect(detectScope('I prefer shorter answers')).toBe('global');
  });

  it('keeps repo-local phrasing scoped to the project', () => {
    expect(detectScope('in this repo use vitest')).toBe('project');
  });
});
