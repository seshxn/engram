<p align="center">
  <img src="./assets/engram.png" alt="Engram logo" width="160" />
</p>

# Engram

Persistent local memory for AI coding agents. Learns from your sessions, remembers across them.

## What it does

Engram gives AI coding agents persistent memory across sessions. It:

1. Learns from session transcripts at session end
2. Stores memories as human-readable markdown files
3. Re-injects memory after compaction when the active payload changes
4. Carries forward short-lived session guidance into the next session
5. Prompts a deeper review after substantial sessions
6. Exposes a local CLI for inspecting and searching memory

No external APIs. No account setup. No cost. Everything stays on your machine.

Engram now has a shared multi-host product layer:

- `@engram/core` owns the durable memory engine
- `@engram/plugin-kit` owns shared commands, services, and config helpers
- `@engram/adapter-claude-code` is the first host adapter

## Supported agents

| Agent | Status | Package |
| --- | --- | --- |
| Claude Code | Supported | `@engram/adapter-claude-code` |

## Install

### Claude Code

Add the marketplace and install the plugin:

```text
/plugin marketplace add https://raw.githubusercontent.com/seshanpillay/engram/main/.claude-plugin/marketplace.json
/plugin install engram@engram-tools
```

Refresh marketplaces when you want the latest catalog entry:

```text
/plugin marketplace update
```

This install path does not require users to clone the repo. The marketplace entry fetches the plugin from the monorepo with a sparse `git-subdir` source.

For local development from this repository, keep using:

```bash
npm install
npm run install:claude-code-plugin
```

## How it works

Three hooks power the Claude Code adapter:

- `SessionStart` injects current memory, guidance, and deep-review prompts
- `UserPromptSubmit` re-injects memory after compaction only when the payload changed
- `Stop` parses the transcript and syncs memories into Claude-native project memory files

Memory is stored in two tiers:

- Global: `~/.claude/engram/memory/`
- Per-project: `~/.claude/projects/<resolved-cwd>/memory/`

Project memory uses Claude-native files such as `MEMORY.md`, `feedback_*.md`, `project_*.md`,
`decision_*.md`, and `todo_*.md`. Global Engram memory remains plain markdown under
`~/.claude/engram/`. No repo-local `.engram/` directory is required.

Engram also keeps transient session state in `state/`, including:

- `guidance.json` for next-session continuity
- `last-injection.json` for diff-based prompt reinjection
- `session-history.json` for deep-review lifecycle
- `stats.json` for extractor and session metrics

## Memory files

| File | Scope | Purpose |
| --- | --- | --- |
| `user-preferences.md` | Global | Coding style, tool preferences, corrections |
| `user-patterns.md` | Global | Recurring struggles and patterns |
| `pending-items.md` | Global | TODOs and follow-ups |
| `MEMORY.md` | Project | Claude-native index of project memories |
| `feedback_*.md` | Project | Preferences and corrections Claude can reuse |
| `project_*.md` / `decision_*.md` / `todo_*.md` | Project | Context, decisions, and pending items |

Memory entries also carry freshness and confidence metadata internally so Engram can trim low-value memories first when the injection budget is tight.

## Configuration

Claude Code users can tune the plugin from the `/plugin` UI after installation. Engram exposes:

- `deep_review`
- `deep_review_threshold`
- `injection_budget`

Those plugin settings are applied by the Claude hooks at runtime and override the file-based values below for Claude sessions only.

Optional file config at `~/.claude/engram/config.json`:

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
- `ENGRAM_CLAUDE_HOME` overrides the Claude base directory used for project memory lookup
- `ENGRAM_DISABLED=1` disables the hooks
- `ENGRAM_DEBUG=1` enables debug logging

The file config remains the shared fallback for local CLI usage and for hosts that do not expose plugin-managed settings yet.

## CLI

The repo now exposes a local `engram` command:

```bash
engram status
engram list
engram list --global
engram search pnpm
engram clear --project --yes
```

This is meant for local repo usage for now rather than npm installation.

## Architecture

```text
@engram/core
  extractors/
  memory/
  transcript/
  utils/
  CLI

@engram/plugin-kit
  commands/
  services/
  config/
  capabilities/

@engram/adapter-claude-code
  transcript-adapter
  session-start hook
  prompt-submit hook
  session-stop hook
  commands/
  skills/
```

The current shared command surface starts with `status`, `search`, `review`, and `inspect`, with Claude exposing the first three through plugin commands today.

To add a new host adapter, keep host-specific lifecycle wiring in the adapter and route reusable behavior through `plugin-kit` and `core`.

## Development

```bash
npm test
npm run test:core
npm run test:claude-code
```
