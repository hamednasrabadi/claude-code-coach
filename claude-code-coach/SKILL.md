---
name: claude-code-coach
description: Use when the user asks how to do something in Claude Code (keys, slash commands, permission modes, CLAUDE.md, skills, subagents, hooks, plugins, MCP, context management, models and effort, recovery), when deciding where a rule belongs (CLAUDE.md, skill, hook, or command), when the user asks about a "Try:" line they saw under the spinner, or when adding or editing a crumb in this skill's bank.
---

# Claude Code Coach

This skill does two things:

1. **Crumbs.** While Claude works, Claude Code shows one short line under the spinner, such as `Try: Before a big change, commit first so undoing it is a single git command`. These come from `try-tips.json` through the `spinnerTipsOverride` setting. Claude Code picks and rotates them itself. You do not deliver them, and nothing about them enters your context.
2. **Depth.** When the user asks how something in Claude Code works, or asks about a crumb they saw, answer from the references below.

## References: read the one that matches the question

| File | Covers |
|---|---|
| `references/cockpit.md` | Keys (Esc, Esc Esc, Shift+Tab, `@`, `!`), built-in commands, permission modes, settings scopes |
| `references/context.md` | The context window as a budget: `/context`, `/compact`, `/clear`, `/btw`, `/add-dir`, resume, subagent offload |
| `references/building.md` | CLAUDE.md, skills and commands, subagents, hooks, plugins, MCP, where a rule belongs |
| `references/loop.md` | Explore, plan, code, verify, commit, review; hallucination; recovery; model and effort |

For exact flags and syntax, prefer the official docs at https://code.claude.com/docs over these notes. Each crumb's `src` field in `crumbs.json` names its source page.

## When the user asks about a crumb

Find it in `crumbs.json` by its text. Explain it in two or three sentences with a concrete example from their current work, then point to its `src`.

## Adding or editing crumbs

Run commands from this skill's directory.

1. Add an entry to `crumbs.json`:

   ```json
   {
     "id": "kebab-case-id",
     "text": "Before you X, run /y so that Z",
     "topic": "context",
     "format": "when",
     "level": 2,
     "surface": "both",
     "src": "https://code.claude.com/docs/en/commands"
   }
   ```

2. Run `node crumbs.mjs build` to regenerate `try-tips.json` and lock the new id.
3. Run `node test.mjs`.

Every crumb must meet these rules:

- **One action.** One exact key, command, or phrase the user can type now, and what it does.
- **70 to 110 characters.** The line is visible for a few seconds while Claude works.
- **One of six formats:** `command` (`/recap gives…`), `key` (`Press Ctrl+R to…`), `when` (`Before a big change, …`), `goal` (`To undo…, press…`), `fact` (`Rewind can't undo…, so…`), or `question` (`Closed the terminal by accident? …`). At most one crumb in eight is a question.
- **Verified.** Check the command against the official docs before adding it.
- **Not a built-in tip.** Claude Code already teaches Plan Mode with Shift+Tab and `/config` for the default permission mode.
- **Fixed text.** Never reword an existing crumb. Claude Code tracks show history by id, and the user recognizes a crumb by its wording. To change one, delete it and add a new id. Leave the old id in `crumbs.lock` so it can never be reused for different text. `test.mjs` fails if an id's text changes.

`level` sets the order for new users: `1` basics show first, `3` advanced show last.
