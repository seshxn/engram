# Engram Claude Code Plugin

Persistent local memory for Claude Code.

## What it does

This plugin adds two hooks to Claude Code:

- `SessionStart` reads Engram global memory and emits deep-review prompts when needed
- `Stop` parses the transcript and stores extracted memories into Claude-native project memory

Engram stores:

- Global Engram memory in `~/.claude/engram/memory/` or `$ENGRAM_HOME/memory/`
- Project-scoped Claude-native memory in `~/.claude/projects/<resolved-cwd>/memory/`

No repo-local `.engram/` directory is required.

## Install

From the repo root, the easiest path is:

```bash
npm install
npm run install:claude-code-plugin
```

Or run Claude directly with the plugin directory:

```bash
claude --plugin-dir ./packages/adapter-claude-code
```

Then run `/reload-plugins` after changes.

## Files

- `.claude-plugin/plugin.json`: plugin metadata
- `hooks/hooks.json`: Claude Code hook registration
- `dist/session-start.js`: bundled SessionStart runtime
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
