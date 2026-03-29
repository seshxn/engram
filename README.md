# Engram

Persistent local memory for AI coding agents. Learns from your sessions, remembers across them.

## What it does

Engram gives AI coding agents persistent memory across sessions. It:

1. Learns from session transcripts at session end
2. Stores memories as human-readable markdown files
3. Injects relevant memories into the next session
4. Prompts a deeper review after substantial sessions

No external APIs. No account setup. No cost. Everything stays on your machine.

## Supported agents

| Agent | Status | Package |
| --- | --- | --- |
| Claude Code | Supported | `@engram/adapter-claude-code` |
| Cursor | Planned | — |
| Cline | Planned | — |
| Aider | Planned | — |

## Install

### Claude Code

```bash
npm install
npm run install:claude-code-plugin
```

Then start Claude Code with the local plugin:

```text
claude --plugin-dir ./packages/adapter-claude-code
```

After Claude starts, run `/reload-plugins`.

## How it works

Two hooks power the Claude Code adapter:

- `SessionStart` reads Engram global memory and can inject deep-review prompts
- `Stop` parses the transcript and syncs memories into Claude-native project memory files

Memory is stored in two tiers:

- Global: `~/.claude/engram/memory/`
- Per-project: `~/.claude/projects/<resolved-cwd>/memory/`

Project memory uses Claude-native files such as `MEMORY.md`, `feedback_*.md`, `project_*.md`,
`decision_*.md`, and `todo_*.md`. Global Engram memory remains plain markdown under
`~/.claude/engram/`. No repo-local `.engram/` directory is required.

## Memory files

| File | Scope | Purpose |
| --- | --- | --- |
| `user-preferences.md` | Global | Coding style, tool preferences, corrections |
| `user-patterns.md` | Global | Recurring struggles and patterns |
| `pending-items.md` | Global | TODOs and follow-ups |
| `MEMORY.md` | Project | Claude-native index of project memories |
| `feedback_*.md` | Project | Preferences and corrections Claude can reuse |
| `project_*.md` / `decision_*.md` / `todo_*.md` | Project | Context, decisions, and pending items |

## Configuration

Optional config file at `~/.claude/engram/config.json`:

```json
{
  "deep_review": true,
  "deep_review_threshold": 10,
  "max_entries_per_file": 50,
  "max_chars_per_file": 5000,
  "injection_budget": 15000
}
```

Environment variables:

- `ENGRAM_HOME` overrides the Engram global directory
- `ENGRAM_DISABLED=1` disables the hooks
- `ENGRAM_DEBUG=1` enables debug logging

## Architecture

```text
@engram/core
  extractors/
  memory/
  transcript/
  utils/

@engram/adapter-claude-code
  transcript-adapter
  session-start hook
  session-stop hook
```

To add a new agent adapter, implement `TranscriptAdapter` and wire its lifecycle hooks to `processSession()` and `generateOutput()`.

## Development

```bash
npm test
npm run test:core
npm run test:claude-code
```
