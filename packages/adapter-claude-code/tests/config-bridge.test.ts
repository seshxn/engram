import { afterEach, describe, expect, it } from 'vitest';
import { getClaudeHostSettings } from '../src/config-bridge.js';

describe('Claude config bridge', () => {
  afterEach(() => {
    delete process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW;
    delete process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW_THRESHOLD;
    delete process.env.CLAUDE_PLUGIN_OPTION_INJECTION_BUDGET;
  });

  it('maps Claude plugin option env vars into Engram host settings', () => {
    process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW = 'false';
    process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW_THRESHOLD = '25';
    process.env.CLAUDE_PLUGIN_OPTION_INJECTION_BUDGET = '1200';

    expect(getClaudeHostSettings()).toEqual({
      deep_review: false,
      deep_review_threshold: 25,
      injection_budget: 1200,
    });
  });

  it('ignores invalid or missing plugin option env vars', () => {
    process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW = 'maybe';
    process.env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW_THRESHOLD = 'abc';

    expect(getClaudeHostSettings()).toEqual({});
  });
});
