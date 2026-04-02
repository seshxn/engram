import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'core',
      root: './packages/core',
      include: ['tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'claude-code',
      root: './packages/adapter-claude-code',
      include: ['tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
  {
    test: {
      name: 'plugin-kit',
      root: './packages/plugin-kit',
      include: ['tests/**/*.test.ts'],
      passWithNoTests: true,
    },
  },
]);
