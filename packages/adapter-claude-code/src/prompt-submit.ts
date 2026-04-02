import { generateDiffOutput } from '@engram/core';
import { resolveClaudeSettings } from './config-bridge.js';
import { runClaudeHook } from './plugin-kit-hooks.js';
import { readStdinJson } from './hooks-io.js';

interface HookInput {
  cwd?: string;
  session_id?: string;
}

export const main = async (): Promise<void> => {
  if (process.env.ENGRAM_DISABLED === '1') {
    return process.exit(0);
  }

  const input = await readStdinJson<HookInput>();

  await runClaudeHook({
    input,
    missingInputMessage: 'missing cwd in hook input',
    errorLabel: 'prompt submit hook error:',
    action: ({ globalDir, projectDir }) => {
      const output = generateDiffOutput(globalDir, projectDir, resolveClaudeSettings(globalDir));

      if (output) {
        console.log(output);
      }
    },
  });
};

if (process.argv[1]?.includes('prompt-submit')) {
  void main();
}
