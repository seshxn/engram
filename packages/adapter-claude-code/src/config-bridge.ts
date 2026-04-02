import { loadConfig, type EngramConfig } from '@engram/core';
import { resolveEngramSettings } from '../../plugin-kit/src/index.js';
import type { EngramHostSettings } from '../../plugin-kit/src/config/types.js';

const parseBooleanOption = (value: string | undefined): boolean | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
};

const parseNumberOption = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const getClaudeHostSettings = (
  env: NodeJS.ProcessEnv = process.env,
): EngramHostSettings => ({
  deep_review: parseBooleanOption(env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW),
  deep_review_threshold: parseNumberOption(env.CLAUDE_PLUGIN_OPTION_DEEP_REVIEW_THRESHOLD),
  injection_budget: parseNumberOption(env.CLAUDE_PLUGIN_OPTION_INJECTION_BUDGET),
});

export const resolveClaudeSettings = (
  globalDir: string,
  env: NodeJS.ProcessEnv = process.env,
): EngramConfig => resolveEngramSettings(loadConfig(globalDir), getClaudeHostSettings(env));
