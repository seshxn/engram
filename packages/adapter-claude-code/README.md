# Engram Claude Code Plugin

Persistent local memory for Claude Code.

This package is the Claude Code host adapter for Engram's shared multi-host architecture:

- `@engram/core` owns extraction, storage, and payload generation
- `@engram/plugin-kit` owns shared memory commands, services, and config helpers
- `@engram/adapter-claude-code` maps those surfaces into Claude hooks, commands, and skills

## What it does

This plugin adds three hooks to Claude Code:

- `SessionStart` injects current memory, guidance, and deep-review prompts
- `UserPromptSubmit` re-injects memory after compaction only when the payload changed
- `Stop` parses the transcript and stores extracted memories into Claude-native project memory

Engram stores:

- Global Engram memory in `~/.claude/engram/memory/` or `$ENGRAM_HOME/memory/`
- Project-scoped Claude-native memory in `~/.claude/projects/<resolved-cwd>/memory/`

No repo-local `.engram/` directory is required.

The Claude adapter also exposes:

- plugin commands for memory status, search, and review
- shared Engram skills for onboarding, session review, memory hygiene, and preferences audit
- Claude plugin `userConfig` for `deep_review`, `deep_review_threshold`, and `injection_budget`

## Install

Install from the Engram marketplace:

```text
/plugin marketplace add https://raw.githubusercontent.com/seshanpillay/engram/main/.claude-plugin/marketplace.json
/plugin install engram@engram-tools
```

This install path does not require cloning the repository. The marketplace fetches the plugin from the monorepo with a sparse `git-subdir` source.

For local development from this repository, build the plugin bundle from the repo root:

```bash
npm install
npm run install:claude-code-plugin
```

## Files

- `.claude-plugin/plugin.json`: plugin metadata
- `hooks/hooks.json`: Claude Code hook registration
- `commands/`: Claude command markdown entrypoints backed by shared Engram handlers
- `skills/`: Claude-exposed Engram skill content
- `dist/session-start.js`: bundled SessionStart runtime
- `dist/prompt-submit.js`: bundled UserPromptSubmit runtime
- `dist/session-stop.js`: bundled Stop runtime

## Configuration

After installation, configure plugin-managed settings from the Claude `/plugin` UI. Those values override `~/.claude/engram/config.json` for Claude sessions only.

File config remains supported for shared defaults and local CLI usage.

## Development

Build the standalone hook bundle from the repo root:

```bash
npm run build:claude-code-plugin
```

Run tests:

```bash
npm run test:claude-code
```
