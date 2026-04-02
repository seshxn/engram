import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DEFAULT_CONFIG = require('../../../shared/config/default-config.json');

const stripUndefinedValues = (settings) => {
  if (!settings) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => value !== undefined),
  );
};

export const mergeEngramSettings = (base, overrides) => ({
  ...base,
  ...stripUndefinedValues(overrides),
});

export const resolveEngramSettings = (fileConfig, hostOverrides) =>
  mergeEngramSettings(mergeEngramSettings(DEFAULT_CONFIG, fileConfig), hostOverrides);
