import * as fs from 'fs';
import * as path from 'path';

export interface EngramConfig {
  deep_review: boolean;
  deep_review_threshold: number;
  max_entries_per_file: number;
  max_chars_per_file: number;
  injection_budget: number;
}

export const DEFAULT_CONFIG: EngramConfig = {
  deep_review: true,
  deep_review_threshold: 10,
  max_entries_per_file: 50,
  max_chars_per_file: 5000,
  injection_budget: 15000,
};

export const loadConfig = (globalDir: string): EngramConfig => {
  const configPath = path.join(globalDir, 'config.json');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EngramConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};
