import {
  ensureDirs,
  generateDiffOutput,
  getGlobalDir,
  getProjectDir,
  logger,
} from '@engram/core';
import { readStdinJson } from './hooks-io.js';

interface HookInput {
  cwd?: string;
  session_id?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    process.exit(0);
  }

  const input = await readStdinJson<HookInput>();
  if (!input?.cwd) {
    logger.debug('missing cwd in hook input');
    process.exit(0);
  }

  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(input.cwd);
  ensureDirs(globalDir, projectDir);

  try {
    const output = generateDiffOutput(globalDir, projectDir);
    if (output) {
      console.log(output);
    }
  } catch (error) {
    logger.error('prompt submit hook error:', error);
    process.exit(1);
  }
};

if (process.argv[1]?.includes('prompt-submit')) {
  void main();
}
