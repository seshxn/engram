import { ensureDirs, getGlobalDir, getProjectDir, processSession } from '@engram/core';
import { readStdinJson } from './hooks-io.js';
import { claudeCodeAdapter } from './transcript-adapter.js';

interface HookInput {
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    process.exit(0);
  }

  const input = await readStdinJson<HookInput>();
  if (!input?.cwd || !input.transcript_path) {
    if (process.env.ENGRAM_DEBUG === '1') {
      console.error('Engram: missing transcript_path or cwd in hook input');
    }
    process.exit(0);
  }

  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(input.cwd);
  ensureDirs(globalDir, projectDir);

  try {
    const pairs = await claudeCodeAdapter.parse(input.transcript_path);
    await processSession(pairs, globalDir, projectDir);
  } catch (error) {
    if (process.env.ENGRAM_DEBUG === '1') {
      console.error('Engram stop hook error:', error);
    }
    process.exit(1);
  }
};

if (process.argv[1]?.includes('session-stop')) {
  void main();
}
