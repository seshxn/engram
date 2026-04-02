import { logger, processSession } from '@engram/core';
import { runClaudeHook } from './plugin-kit-hooks.js';
import { readStdinJson } from './hooks-io.js';
import { claudeCodeAdapter } from './transcript-adapter.js';

interface HookInput {
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    return process.exit(0);
  }

  const input = await readStdinJson<HookInput>();

  if (!input?.cwd || !input.transcript_path) {
    logger.debug('missing transcript_path or cwd in hook input');
    return process.exit(0);
  }

  await runClaudeHook({
    input,
    missingInputMessage: 'missing transcript_path or cwd in hook input',
    errorLabel: 'stop hook error:',
    action: async ({ globalDir, projectDir }, hookInput) => {
      const pairs = await claudeCodeAdapter.parse(hookInput.transcript_path);
      await processSession(pairs, globalDir, projectDir);
    },
  });
};

if (process.argv[1]?.includes('session-stop')) {
  void main();
}
