# Cockpit: keys, modes, and the built-in commands

Checked against code.claude.com/docs (`interactive-mode`, `commands`, `permission-modes`, `checkpointing`, `settings`) on 2026-10-13.

## The controls you use all day

| Key | What it does |
|---|---|
| `Esc` | Interrupts Claude mid-turn so you can change direction. Watching a wrong approach finish is slower than stopping it. |
| `Esc` `Esc` (empty prompt) | Opens the rewind menu: restore code and conversation, conversation only, or code only, or summarize from or up to a message. With text in the prompt, it clears the draft instead. |
| `Shift+Tab` | Cycles permission modes: `default` → `acceptEdits` → `plan`, plus `auto` where available. `bypassPermissions` joins the cycle only if enabled at startup or in settings. |
| `@` + path | Attaches a real file (autocompletes) instead of describing it. |
| `!` at the start of a message | Shell mode: you run the command yourself. The right tool for interactive commands Claude can't drive, such as `gcloud auth login` or `ssh`. |
| Enter while Claude works | Queues your message for the next turn. `Esc` interrupts and keeps the queued draft. |

## More keys

| Key | What it does |
|---|---|
| `Ctrl+R` | Search your prompt history. |
| `Ctrl+G` (or `Ctrl+X Ctrl+E`) | Edit the prompt in your external editor. |
| `Ctrl+S` | Stash the draft; press again on an empty prompt to restore it. |
| `Ctrl+B` | Send a running Bash command or agent to the background. Press twice in tmux. |
| `Ctrl+T` | Show or hide Claude's task checklist. `/tasks` lists background shells and subagents. |
| `Ctrl+O` | Toggle the full transcript view. |
| `Ctrl+V` (`Alt+V` on Windows and WSL) | Paste an image. |

## Commands worth knowing by heart

| Command | When |
|---|---|
| `/init` | Draft the project's first CLAUDE.md, then add your own rules on top. |
| `/context` | Quality dipped: see what is filling the window. `/context all` expands the breakdown. |
| `/compact [instructions]` | Mid-task and running long: summarize the history and continue. |
| `/clear` (`/reset`, `/new`) | Task finished: start clean before the next one. |
| `/btw <question>` | Side question that doesn't enter the conversation history. |
| `/add-dir <path>` | Work spans a second repo or folder. `/cd <path>` moves the whole session instead. |
| `/rewind` (`/checkpoint`, `/undo`) | The last few steps went wrong. Same menu as `Esc Esc`. |
| `/resume` (`/continue`) | Reopen an earlier session. From the shell, `claude --continue` reopens the most recent one in the current folder. |
| `/branch [name]` | Try another direction without losing the conversation as it stands. |
| `/recap` | One-line summary of the session. |
| `/diff` | Review working-tree changes, including Claude's edits. |
| `/code-review` (`/review`) | Check the current diff for bugs; `--fix` applies the findings. |
| `/usage` (`/cost`, `/stats`) | What the session used. |
| `/model`, `/effort`, `/fast` | Change the model, how long it thinks, or speed up output on the same model. |
| `/plugin` | Check for an existing skill or hook before building one. |
| `/mcp` | MCP server status: what is connected and what needs sign-in. |

## Permission modes

- **`default`** (Manual): asks before most actions that edit files, run shell commands, or reach the network.
- **`acceptEdits`**: approves reads, file edits, and common filesystem commands such as `mkdir` and `mv`. Right for iterating on code you are reviewing.
- **`plan`**: reads only, ending in a plan you approve before any edit. The best value for anything non-trivial.
- **`auto`**: a second model, the classifier, reviews each action instead of you. Built for long tasks with fewer prompts. It is the starting mode for interactive terminal and VS Code sessions from v2.1.283.

## Rewind limits

Checkpoints cover the 100 most recent prompts. Changes made through Bash (`rm`, `mv`, `cp`) are not tracked, and subagent edits are usually not restored. Commit before letting Claude delete or move files.

## Settings scopes

| File | Applies to | Commit it? |
|---|---|---|
| `~/.claude/settings.json` | you, every project | it's yours alone |
| `.claude/settings.json` | this project, everyone on it | yes |
| `.claude/settings.local.json` | this project, just you | no. Claude Code adds it to your global git excludes when it creates the file; if you create it by hand, add it to `.gitignore` yourself. |
