import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const getGlobalDir = (): string => {
  return process.env.ENGRAM_HOME || path.join(os.homedir(), '.claude', 'engram');
};

const getClaudeDir = (override?: string): string => {
  return override || process.env.ENGRAM_CLAUDE_HOME || path.join(os.homedir(), '.claude');
};

const toClaudeProjectKey = (cwd: string): string => {
  const normalized = path.resolve(cwd).replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return normalized.startsWith('-') ? normalized : `-${normalized}`;
};

export const getProjectDir = (cwd: string, claudeDir = getClaudeDir()): string => {
  return path.join(getClaudeDir(claudeDir), 'projects', toClaudeProjectKey(cwd));
};

export const ensureDirs = (globalDir: string, projectDir: string): void => {
  for (const dir of [globalDir, projectDir]) {
    fs.mkdirSync(path.join(dir, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'state'), { recursive: true });
  }
};
