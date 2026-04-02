#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import {
  loadMemorySnapshot,
  loadReviewState,
  runReviewCommand,
  runSearchCommand,
  runStatusCommand,
  readMemorySections,
} from '../../plugin-kit/src/index.js';

const getGlobalDir = () => process.env.ENGRAM_HOME || path.join(os.homedir(), '.claude', 'engram');
const getClaudeDir = () => process.env.ENGRAM_CLAUDE_HOME || path.join(os.homedir(), '.claude');
const toClaudeProjectKey = (cwd) => {
  const normalized = path.resolve(cwd).replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return normalized.startsWith('-') ? normalized : `-${normalized}`;
};
const getProjectDir = (cwd) => path.join(getClaudeDir(), 'projects', toClaudeProjectKey(cwd));

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const clearDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) return;
  for (const name of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, name), { force: true, recursive: true });
  }
};

const formatEntry = (entry) => (typeof entry === 'string' ? entry : entry.text);

const printSections = (sections, io) => {
  if (sections.length === 0) {
    io.stdout.write('No memories found.\n');
    return;
  }

  for (const section of sections) {
    io.stdout.write(`## ${section.heading}\n`);
    for (const entry of section.entries) {
      io.stdout.write(`- ${formatEntry(entry)}\n`);
    }
    io.stdout.write('\n');
  }
};

export const runCli = (
  args = process.argv.slice(2),
  io = { stderr: process.stderr, stdout: process.stdout },
  cwd = process.cwd(),
) => {
  const command = args[0];
  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(cwd);

  if (command === 'status') {
    const snapshot = loadMemorySnapshot(globalDir, projectDir);
    const sessionState = readJson(path.join(projectDir, 'state', 'session-history.json'));
    const stats = readJson(path.join(globalDir, 'state', 'stats.json'));
    const status = runStatusCommand({ globalDir, projectDir, snapshot, sessionState, stats });

    io.stdout.write(`Global dir: ${status.globalDir}\n`);
    io.stdout.write(`Project dir: ${status.projectDir}\n`);
    io.stdout.write(`Global memories: ${status.globalCount}\n`);
    io.stdout.write(`Project memories: ${status.projectCount}\n`);
    io.stdout.write(`Last session: ${status.lastProcessed}\n`);
    io.stdout.write(`Sessions processed: ${status.sessionCount}\n`);
    return 0;
  }

  if (command === 'list') {
    const mode = args.includes('--global') ? 'global' : 'all';
    printSections(readMemorySections(globalDir, projectDir, mode).sections, io);
    return 0;
  }

  if (command === 'search') {
    const query = args[1]?.toLowerCase();
    if (!query) {
      io.stderr.write('Usage: engram search <query>\n');
      return 1;
    }

    const snapshot = loadMemorySnapshot(globalDir, projectDir);
    const results = runSearchCommand({ query, snapshot });

    printSections(results.sections, io);
    return 0;
  }

  if (command === 'review') {
    const review = runReviewCommand({
      globalDir,
      projectDir,
      reviewState: loadReviewState(globalDir, projectDir),
    });

    io.stdout.write(`Global dir: ${review.globalDir}\n`);
    io.stdout.write(`Project dir: ${review.projectDir}\n`);
    io.stdout.write(`Review pending: ${review.pending ? 'yes' : 'no'}\n`);
    io.stdout.write(`Review stale: ${review.stale ? 'yes' : 'no'}\n`);
    io.stdout.write(`Review summary: ${review.hasSummary ? 'available' : 'missing'}\n`);
    return 0;
  }

  if (command === 'clear') {
    const clearGlobal = args.includes('--global') || (!args.includes('--project') && !args.includes('--global'));
    const clearProject = args.includes('--project') || (!args.includes('--project') && !args.includes('--global'));
    if (!args.includes('--yes')) {
      io.stderr.write('Refusing to clear memories without --yes.\n');
      return 1;
    }

    if (clearGlobal) {
      clearDir(path.join(globalDir, 'memory'));
    }
    if (clearProject) {
      clearDir(path.join(projectDir, 'memory'));
    }

    io.stdout.write('Cleared requested memories.\n');
    return 0;
  }

  io.stderr.write('Usage: engram <status|list|search|review|clear>\n');
  return 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runCli());
}
