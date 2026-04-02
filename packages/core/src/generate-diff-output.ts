import { buildMemoryPayload, enforceBudget, renderMemoryPayload } from './generate-output.js';
import { markGuidanceConsumed } from './guidance.js';
import { hashString, loadInjectionState, saveInjectionState } from './injection-state.js';
import { resolveConfig, type EngramConfig } from './utils/config.js';
import { ensureDirs } from './utils/paths.js';

export const generateDiffOutput = (
  globalDir: string,
  projectDir: string,
  configOverrides?: Partial<EngramConfig>,
): string => {
  ensureDirs(globalDir, projectDir);

  const config = resolveConfig(globalDir, configOverrides);
  const parts = buildMemoryPayload(globalDir, projectDir);
  if (!config.deep_review) {
    parts.review = undefined;
  }
  const trimmedParts = enforceBudget(parts, config.injection_budget);
  const output = renderMemoryPayload(trimmedParts);
  const previousHash = loadInjectionState(projectDir)?.hash;

  if (!output) {
    saveInjectionState(projectDir, hashString(output));
    return '';
  }

  const currentHash = hashString(output);
  if (previousHash === currentHash) {
    return '';
  }

  if (trimmedParts.guidance) {
    markGuidanceConsumed(projectDir);
    saveInjectionState(
      projectDir,
      hashString(renderMemoryPayload({ ...trimmedParts, guidance: undefined })),
    );
  } else {
    saveInjectionState(projectDir, currentHash);
  }

  return output;
};
