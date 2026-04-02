import { ensureDirs, getGlobalDir, getProjectDir, logger } from '@engram/core';
import type { EngramHostSettings } from '@engram/plugin-kit';

export type ClaudeHookHostSettings = EngramHostSettings;

export interface ClaudeHookInput {
  cwd?: string;
}

export interface ClaudeHookContext {
  globalDir: string;
  projectDir: string;
}

export interface ClaudeHookOptions<TInput extends ClaudeHookInput> {
  input: TInput | null;
  missingInputMessage: string;
  errorLabel: string;
  action: (context: ClaudeHookContext, input: TInput) => Promise<void> | void;
}

export const resolveClaudeDirectories = (cwd: string): ClaudeHookContext => {
  const globalDir = getGlobalDir();
  const projectDir = getProjectDir(cwd);
  ensureDirs(globalDir, projectDir);

  return { globalDir, projectDir };
};

export const runClaudeHook = async <TInput extends ClaudeHookInput>({
  input,
  missingInputMessage,
  errorLabel,
  action,
}: ClaudeHookOptions<TInput>): Promise<void> => {
  if (!input?.cwd) {
    logger.debug(missingInputMessage);
    return process.exit(0);
  }

  const context = resolveClaudeDirectories(input.cwd);

  try {
    await action(context, input);
  } catch (error) {
    logger.error(errorLabel, error);
    return process.exit(1);
  }
};
