#!/usr/bin/env node
/**
 * Cross-platform launcher for engram hooks.
 * Runs tsx scripts via the local node_modules installation.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);

if (args[0] !== 'tsx' || args.length < 2) {
  console.error('Usage: launcher.cjs tsx <script.ts>');
  process.exit(1);
}

const scriptArgs = args.slice(1);
const pluginRoot = path.resolve(__dirname, '..');
const tsxCli = path.join(pluginRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

let child;

if (fs.existsSync(tsxCli)) {
  child = spawn(process.execPath, [tsxCli, ...scriptArgs], {
    stdio: 'inherit',
    windowsHide: isWindows,
  });
} else {
  const rootTsx = path.join(pluginRoot, '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (fs.existsSync(rootTsx)) {
    child = spawn(process.execPath, [rootTsx, ...scriptArgs], {
      stdio: 'inherit',
      windowsHide: isWindows,
    });
  } else {
    child = spawn('npx', args, {
      stdio: 'inherit',
      shell: isWindows,
      windowsHide: isWindows,
    });
  }
}

child.on('exit', (code) => process.exit(code || 0));
child.on('error', (err) => {
  console.error('Failed to start subprocess:', err);
  process.exit(1);
});
