import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

export interface EngramConfig {
  deep_review: boolean;
  deep_review_threshold: number;
  max_entries_per_file: number;
  max_chars_per_file: number;
  injection_budget: number;
}

const require = createRequire(import.meta.url);
const defaultConfigData = require('../../../shared/config/default-config.json') as EngramConfig;

export const DEFAULT_CONFIG: EngramConfig = defaultConfigData;

const stripUndefinedValues = <T extends object>(overrides?: Partial<T>): Partial<T> => {
  if (!overrides) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
};

export const mergeConfig = (
  base: EngramConfig,
  overrides?: Partial<EngramConfig>,
): EngramConfig => ({
  ...base,
  ...stripUndefinedValues(overrides),
});

export const loadConfig = (globalDir: string): EngramConfig => {
  const configPath = path.join(globalDir, 'config.json');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EngramConfig>;
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch {
    return mergeConfig(DEFAULT_CONFIG);
  }
};

export const resolveConfig = (
  globalDir: string,
  overrides?: Partial<EngramConfig>,
): EngramConfig => mergeConfig(loadConfig(globalDir), overrides);
