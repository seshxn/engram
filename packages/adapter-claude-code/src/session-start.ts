import { ensureDirs, generateOutput, getGlobalDir, getProjectDir } from '@engram/core';
import { readStdinJson } from './hooks-io.js';

interface HookInput {
  session_id?: string;
  cwd?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    process.exit(0);
  }

  const input = await readStdinJson<HookInput>();
  if (!input?.cwd) {
    if (process.env.ENGRAM_DEBUG === '1') {
      console.error('Engram: missing cwd in hook input');
    }
    process.exit(0);
  }

  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(input.cwd);
  ensureDirs(globalDir, projectDir);

  try {
    const output = generateOutput(globalDir, projectDir);
    if (output) {
      console.log(output);
    }
  } catch (error) {
    if (process.env.ENGRAM_DEBUG === '1') {
      console.error('Engram start hook error:', error);
    }
    process.exit(1);
  }
};

if (process.argv[1]?.includes('session-start')) {
  void main();
}
