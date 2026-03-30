import * as fs from 'fs';
import * as path from 'path';

interface InjectionState {
  hash: string;
  updated_at: string;
}

const LAST_INJECTION_PATH = (projectDir: string): string =>
  path.join(projectDir, 'state', 'last-injection.json');

export const hashString = (value: string): string => {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }

  return String(hash);
};

export const loadInjectionState = (projectDir: string): InjectionState | null => {
  try {
    return JSON.parse(fs.readFileSync(LAST_INJECTION_PATH(projectDir), 'utf8')) as InjectionState;
  } catch {
    return null;
  }
};

export const saveInjectionState = (
  projectDir: string,
  hash: string,
  updatedAt = new Date().toISOString(),
): void => {
  fs.writeFileSync(
    LAST_INJECTION_PATH(projectDir),
    JSON.stringify({ hash, updated_at: updatedAt }, null, 2),
    'utf8',
  );
};
