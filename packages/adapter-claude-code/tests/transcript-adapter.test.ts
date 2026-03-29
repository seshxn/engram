import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { claudeCodeAdapter } from '../src/transcript-adapter.js';

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'transcripts',
);

describe('Claude Code transcript adapter', () => {
  it('exposes the expected adapter name', () => {
    expect(claudeCodeAdapter.name).toBe('claude-code');
  });

  it('parses JSONL transcripts into normalized message pairs', async () => {
    const pairs = await claudeCodeAdapter.parse(path.join(FIXTURES, 'basic-session.jsonl'));

    expect(pairs.length).toBe(4);
    expect(pairs[0].user).toBe('no, use pnpm not npm for this project');
    expect(pairs[0].assistant).toContain('pnpm');
  });

  it('skips system messages', async () => {
    const pairs = await claudeCodeAdapter.parse(path.join(FIXTURES, 'basic-session.jsonl'));
    expect(pairs.some((pair) => pair.user.includes('init'))).toBe(false);
  });

  it('returns an empty array for a missing transcript file', async () => {
    await expect(claudeCodeAdapter.parse('/tmp/engram-missing.jsonl')).resolves.toEqual([]);
  });

  it('parses the real Claude CLI transcript shape with message.content payloads', async () => {
    const transcript = [
      JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: 'Remember that staging uses a different schema.',
        },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'internal' },
            { type: 'text', text: 'I will remember that.' },
          ],
        },
      }),
    ].join('\n');

    const pairs = await claudeCodeAdapter.parse(transcript);

    expect(pairs).toEqual([
      {
        user: 'Remember that staging uses a different schema.',
        assistant: 'I will remember that.',
      },
    ]);
  });
});
