# Engram Claude Code Plugin

Persistent local memory for Claude Code.

## What it does

This plugin adds three hooks to Claude Code:

- `SessionStart` injects current memory, guidance, and deep-review prompts
- `UserPromptSubmit` re-injects memory after compaction only when the payload changed
- `Stop` parses the transcript and stores extracted memories into Claude-native project memory

Engram stores:

- Global Engram memory in `~/.claude/engram/memory/` or `$ENGRAM_HOME/memory/`
- Project-scoped Claude-native memory in `~/.claude/projects/<resolved-cwd>/memory/`

No repo-local `.engram/` directory is required.

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
- `dist/session-start.js`: bundled SessionStart runtime
- `dist/prompt-submit.js`: bundled UserPromptSubmit runtime
- `dist/session-stop.js`: bundled Stop runtime

## Development

Build the standalone hook bundle from the repo root:

```bash
npm run build:claude-code-plugin
```

Run tests:

```bash
npm run test:claude-code
```
