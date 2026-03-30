import { buildMemoryPayload, enforceBudget, renderMemoryPayload } from './generate-output.js';
import { markGuidanceConsumed } from './guidance.js';
import { hashString, loadInjectionState, saveInjectionState } from './injection-state.js';
import { loadConfig } from './utils/config.js';
import { ensureDirs } from './utils/paths.js';

export const generateDiffOutput = (globalDir: string, projectDir: string): string => {
  ensureDirs(globalDir, projectDir);

  const config = loadConfig(globalDir);
  const parts = enforceBudget(buildMemoryPayload(globalDir, projectDir), config.injection_budget);
  const output = renderMemoryPayload(parts);
  const previousHash = loadInjectionState(projectDir)?.hash;

  if (!output) {
    saveInjectionState(projectDir, hashString(output));
    return '';
  }

  const currentHash = hashString(output);
  if (previousHash === currentHash) {
    return '';
  }

  if (parts.guidance) {
    markGuidanceConsumed(projectDir);
    saveInjectionState(
      projectDir,
      hashString(renderMemoryPayload({ ...parts, guidance: undefined })),
    );
  } else {
    saveInjectionState(projectDir, currentHash);
  }

  return output;
};
