import { describe, expect, it } from 'vitest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(TEST_DIR, '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');
const NPM_CACHE = path.join(os.tmpdir(), 'engram-npm-cache');

const packFiles = (): string[] => {
  const output = childProcess.execFileSync(
    'npm',
    ['pack', '--dry-run', '--json'],
    {
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        npm_config_cache: NPM_CACHE,
      },
      encoding: 'utf8',
    },
  );

  const manifest = JSON.parse(output) as Array<{ files?: Array<{ path: string }> }>;

  return manifest[0]?.files?.map((entry) => entry.path) ?? [];
};

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

  it('declares esbuild in the adapter package boundary for prepack builds', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
    ) as {
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.devDependencies?.esbuild).toBe('^0.27.4');
  });

  it('declares Claude command and skill surfaces in the plugin manifest', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'),
    ) as Record<string, unknown>;

    expect(manifest.commands).toBe('./commands');
    expect(manifest.skills).toBe('./skills');

    const expectedFiles = [
      'commands/engram-status.md',
      'commands/engram-search.md',
      'commands/engram-review.md',
      'skills/engram-memory-hygiene/SKILL.md',
      'skills/engram-session-review/SKILL.md',
      'skills/engram-project-onboarding/SKILL.md',
      'skills/engram-preferences-audit/SKILL.md',
    ];

    for (const relativePath of expectedFiles) {
      expect(fs.existsSync(path.join(PACKAGE_ROOT, relativePath))).toBe(true);
    }
  });

  it('declares Claude plugin userConfig for shared Engram settings', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'),
    ) as {
      userConfig?: Record<
        string,
        {
          type?: string;
          title?: string;
          description?: string;
          default?: boolean | number;
        }
      >;
    };

    expect(manifest.userConfig).toEqual({
      deep_review: {
        type: 'boolean',
        title: 'Deep Review',
        description: expect.any(String),
        default: true,
      },
      deep_review_threshold: {
        type: 'number',
        title: 'Deep Review Threshold',
        description: expect.any(String),
        default: 10,
      },
      injection_budget: {
        type: 'number',
        title: 'Injection Budget',
        description: expect.any(String),
        default: 15000,
      },
    });
  });

  it('ships the compiled dist hook entrypoints in a packed adapter release', () => {
    const files = packFiles();

    expect(files).toContain('dist/prompt-submit.js');
    expect(files).toContain('dist/session-start.js');
    expect(files).toContain('dist/session-stop.js');
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

  it('publishes a repo-root marketplace that installs the plugin from this monorepo subdirectory', () => {
    const marketplacePath = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');

    expect(fs.existsSync(marketplacePath)).toBe(true);

    const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8')) as {
      name: string;
      owner: { name: string };
      plugins: Array<{
        name: string;
        source: {
          source: string;
          url: string;
          path: string;
        };
      }>;
    };

    expect(marketplace.name).toBeTypeOf('string');
    expect(marketplace.owner.name).toBeTypeOf('string');

    const engramEntry = marketplace.plugins.find((plugin) => plugin.name === 'engram');

    expect(engramEntry).toBeDefined();
    expect(engramEntry?.source.source).toBe('git-subdir');
    expect(engramEntry?.source.url).toContain('github.com/seshanpillay/engram');
    expect(engramEntry?.source.path).toBe('packages/adapter-claude-code');
  });

  it('documents marketplace install commands in the main README', () => {
    const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');

    expect(readme).toContain('/plugin marketplace add');
    expect(readme).toContain('/plugin install engram@');
  });
});
