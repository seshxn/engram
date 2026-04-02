import { generateOutput } from '@engram/core';
import { resolveClaudeSettings } from './config-bridge.js';
import { runClaudeHook } from './plugin-kit-hooks.js';
import { readStdinJson } from './hooks-io.js';

interface HookInput {
  session_id?: string;
  cwd?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    return process.exit(0);
  }

  const input = await readStdinJson<HookInput>();

  await runClaudeHook({
    input,
    missingInputMessage: 'missing cwd in hook input',
    errorLabel: 'start hook error:',
    action: ({ globalDir, projectDir }) => {
      const output = generateOutput(globalDir, projectDir, resolveClaudeSettings(globalDir));

      if (output) {
        console.log(output);
      }
    },
  });
};

if (process.argv[1]?.includes('session-start')) {
  void main();
}
