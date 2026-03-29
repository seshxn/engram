import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_CONFIG, loadConfig } from '../../src/utils/config.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engram-config-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when the config file does not exist', () => {
    expect(loadConfig(path.join(tmpDir, 'missing'))).toEqual(DEFAULT_CONFIG);
  });

  it('merges config file values with defaults', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'config.json'),
      JSON.stringify({ deep_review: false, max_entries_per_file: 100 }),
      'utf8',
    );

    const config = loadConfig(tmpDir);

    expect(config.deep_review).toBe(false);
    expect(config.max_entries_per_file).toBe(100);
    expect(config.max_chars_per_file).toBe(DEFAULT_CONFIG.max_chars_per_file);
  });

  it('falls back to defaults for malformed config', () => {
    fs.writeFileSync(path.join(tmpDir, 'config.json'), 'not-json', 'utf8');
    expect(loadConfig(tmpDir)).toEqual(DEFAULT_CONFIG);
  });
});
