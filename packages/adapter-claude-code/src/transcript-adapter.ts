import * as fs from 'fs';
import type { MessagePair, TranscriptAdapter } from '@engram/core';

interface ClaudeTranscriptEntry {
  type?: string;
  content?: unknown;
  message?: {
    role?: string;
    content?: unknown;
  };
}

const flattenContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text;
        }

        if (
          item &&
          typeof item === 'object' &&
          'type' in item &&
          item.type === 'text' &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text;
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
    return content.text.trim();
  }

  return '';
};

const normalizeSource = (source: string | Buffer): string => {
  if (typeof source === 'string' && fs.existsSync(source)) {
    return fs.readFileSync(source, 'utf8');
  }

  return Buffer.isBuffer(source) ? source.toString('utf8') : source;
};

const getEntryContent = (entry: ClaudeTranscriptEntry): string => {
  return flattenContent(entry.message?.content ?? entry.content);
};

export const claudeCodeAdapter: TranscriptAdapter = {
  name: 'claude-code',
  async parse(source: string | Buffer): Promise<MessagePair[]> {
    const raw = normalizeSource(source);
    if (!raw || (typeof source === 'string' && !fs.existsSync(source) && !raw.includes('\n') && raw === source)) {
      return [];
    }

    const pairs: MessagePair[] = [];
    let pendingUser: string | null = null;

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let entry: ClaudeTranscriptEntry;
      try {
        entry = JSON.parse(trimmed) as ClaudeTranscriptEntry;
      } catch {
        continue;
      }

      const type = entry.type?.toLowerCase();
      if (type === 'system') {
        continue;
      }

      const content = getEntryContent(entry);
      if (!content) {
        continue;
      }

      if (type === 'user') {
        pendingUser = content;
        continue;
      }

      if (type === 'assistant' && pendingUser) {
        pairs.push({ user: pendingUser, assistant: content });
        pendingUser = null;
      }
    }

    return pairs;
  },
};
