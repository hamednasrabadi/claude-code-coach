# Cockpit — keys, modes, and the built-in commands

Source: `Claude-mastery/ClaudeCodePackage/ROADMAP/mastery/01-foundations.md`, `04-slash-commands.md`, and the Persian course cheatsheet `claude-mastery-course/_cheatsheets/claude-code-cockpit.md`.

## The five controls

| Key | What it does |
|---|---|
| `Esc` | Interrupts mid-flight so you can change direction. Interrupting is not rude; watching a wrong approach finish is just slow. |
| `Esc` `Esc` (empty input) | Rewind menu. Claude Code auto-checkpoints file changes, so this restores code, conversation, or both. |
| `Shift+Tab` | Cycles permission modes: normal → auto-accept → plan. |
| `@` + path | Points at a real file (tab-completes) instead of describing it. |
| `!` at the start of a message | Bash mode — you run the command yourself. The right tool for interactive things Claude can't drive (`gcloud auth login`, `ssh`). |

## Commands worth knowing by heart

| Command | When |
|---|---|
| `/init` | Generate the project's first CLAUDE.md, then add your own rules on top. |
| `/context` | Quality dipped — see what's actually eating the window. |
| `/compact` | Mid-task and running long: compress and continue. |
| `/clear` | Task finished: clean desk before the next one. |
| `/btw` | Side question that shouldn't derail the main thread. |
| `/add-dir` | Work spans a second repo or sibling folder. |
| `/rewind` | The last few steps went wrong. Same as double-Esc. |
| `/resume` | Pick a previous session back up with its context. |
| `/usage` (`/cost`) | What this session actually burned. |
| `/model`, `/fast` | Change the brain; `/fast` speeds Opus output without downgrading it. |
| `/plugin` | Check for an existing skill/hook before building one. |
| `/mcp` | Server status — what's connected, what's broken, where OAuth stalled. |

## Permission modes

- **normal** — asks before each consequential action.
- **auto-accept** — stops asking; right for mechanical, low-risk sweeps you're watching.
- **plan** — read-only exploration; produces a plan you approve before any edit. The highest-ROI mode for anything non-trivial.

## Settings scopes

| File | Applies to | Commit it? |
|---|---|---|
| `~/.claude/settings.json` | you, every project | it's yours alone |
| `.claude/settings.json` | this project, everyone on it | yes |
| `.claude/settings.local.json` | this project, just you | no (gitignored) |
