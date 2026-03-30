import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(TEST_DIR, '..');

describe('adapter package marketplace readiness', () => {
  it('has a plugin-level README', () => {
    expect(fs.existsSync(path.join(PACKAGE_ROOT, 'README.md'))).toBe(true);
  });

  it('declares repository and homepage metadata in the plugin manifest', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'),
    ) as Record<string, unknown>;

    expect(manifest.homepage).toBeTypeOf('string');
    expect(manifest.repository).toBeTypeOf('string');
  });

  it('runs compiled dist hook entrypoints instead of tsx source files', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, 'hooks', 'hooks.json'), 'utf8'),
    ) as {
      hooks: {
        SessionStart: Array<{ hooks: Array<{ command: string }> }>;
        Stop: Array<{ hooks: Array<{ command: string }> }>;
        UserPromptSubmit: Array<{ hooks: Array<{ command: string }> }>;
      };
    };

    const startCommand = hooksConfig.hooks.SessionStart[0].hooks[0].command;
    const stopCommand = hooksConfig.hooks.Stop[0].hooks[0].command;
    const promptSubmitCommand = hooksConfig.hooks.UserPromptSubmit[0].hooks[0].command;

    expect(startCommand).toContain('dist/session-start.js');
    expect(stopCommand).toContain('dist/session-stop.js');
    expect(promptSubmitCommand).toContain('dist/prompt-submit.js');
    expect(startCommand).not.toContain('tsx');
    expect(stopCommand).not.toContain('tsx');
    expect(promptSubmitCommand).not.toContain('tsx');
    expect(startCommand).not.toContain('/src/');
    expect(stopCommand).not.toContain('/src/');
    expect(promptSubmitCommand).not.toContain('/src/');
  });

  it('keeps the Stop hook synchronous so Claude print-mode runs persist memory before exit', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, 'hooks', 'hooks.json'), 'utf8'),
    ) as {
      hooks: {
        Stop: Array<{ hooks: Array<{ async?: boolean }> }>;
      };
    };

    expect(hooksConfig.hooks.Stop[0].hooks[0].async).not.toBe(true);
  });

  it('uses Claude-supported matcher semantics for SessionStart and Stop', () => {
    const hooksConfig = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, 'hooks', 'hooks.json'), 'utf8'),
    ) as {
      hooks: {
        SessionStart: Array<{ matcher?: string }>;
        Stop: Array<{ matcher?: string }>;
      };
    };

    expect(hooksConfig.hooks.SessionStart.map((entry) => entry.matcher)).toEqual([
      'startup',
      'resume',
      'clear',
      'compact',
    ]);
    expect(hooksConfig.hooks.Stop[0].matcher).toBeUndefined();
  });
});
