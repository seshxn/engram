import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/utils/logger.js';

describe('logger', () => {
  afterEach(() => {
    delete process.env.ENGRAM_DEBUG;
    vi.restoreAllMocks();
  });

  it('suppresses debug output unless ENGRAM_DEBUG is enabled', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    logger.debug('hidden');
    expect(spy).not.toHaveBeenCalled();

    process.env.ENGRAM_DEBUG = '1';
    logger.debug('visible');
    expect(spy).toHaveBeenCalledWith('Engram:', 'visible');
  });

  it('always emits warnings and errors', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.warn('warned');
    logger.error('broken');

    expect(warnSpy).toHaveBeenCalledWith('Engram:', 'warned');
    expect(errorSpy).toHaveBeenCalledWith('Engram:', 'broken');
  });
});
