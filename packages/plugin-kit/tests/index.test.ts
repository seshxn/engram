import { describe, expect, expectTypeOf, it } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { CommandSurface, SessionSource } from '../src/index.js';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_MANIFEST = JSON.parse(
  fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
) as { main?: string };
const ENTRYPOINT_URL = pathToFileURL(path.join(PACKAGE_ROOT, PACKAGE_MANIFEST.main ?? 'src/index.ts'));

describe('plugin-kit entrypoint', () => {
  it('loads the shared capability entrypoint from package metadata', async () => {
    const pluginKit = await import(ENTRYPOINT_URL.href);

    expect(pluginKit).toBeDefined();
  });

  it('loads the declared package main in plain node', () => {
    const script = `
      import('${ENTRYPOINT_URL.href}').then((mod) => {
        if (
          typeof mod.runStatusCommand !== 'function' ||
          typeof mod.mergeEngramSettings !== 'function' ||
          typeof mod.resolveEngramSettings !== 'function'
        ) {
          process.exit(1);
        }
      }).catch((error) => {
        console.error(error);
        process.exit(1);
      });
    `;

    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      stdio: 'pipe',
    });
  });

  it('exposes the starter capability shapes', () => {
    expectTypeOf<SessionSource>().toEqualTypeOf<{ readonly host: string }>();
    expectTypeOf<CommandSurface>().toEqualTypeOf<{ readonly host: string }>();
  });
});
