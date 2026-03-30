const isDebugEnabled = (): boolean => process.env.ENGRAM_DEBUG === '1';

const withPrefix = (args: unknown[]): unknown[] => ['Engram:', ...args];

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.debug(...withPrefix(args));
    }
  },
  info: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.info(...withPrefix(args));
    }
  },
  warn: (...args: unknown[]): void => {
    console.warn(...withPrefix(args));
  },
  error: (...args: unknown[]): void => {
    console.error(...withPrefix(args));
  },
};
