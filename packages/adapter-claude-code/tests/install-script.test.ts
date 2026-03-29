import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..', '..', '..');
const INSTALL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'install-claude-plugin.sh');

describe('Claude plugin install script', () => {
  it('exists and documents the local install flow', () => {
    expect(fs.existsSync(INSTALL_SCRIPT)).toBe(true);

    const content = fs.readFileSync(INSTALL_SCRIPT, 'utf8');

    expect(content).toContain('#!/usr/bin/env bash');
    expect(content).toContain('npm run build:claude-code-plugin');
    expect(content).toContain('claude plugin validate');
    expect(content).toContain('claude --plugin-dir');
  });
});
