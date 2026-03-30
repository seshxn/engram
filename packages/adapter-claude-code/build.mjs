import { build } from 'esbuild';

await build({
  absWorkingDir: new URL('.', import.meta.url).pathname,
  entryPoints: {
    'prompt-submit': './src/prompt-submit.ts',
    'session-start': './src/session-start.ts',
    'session-stop': './src/session-stop.ts',
  },
  outdir: './dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
  logLevel: 'info',
  packages: 'bundle',
});
