# Try crumbs: design

Date: 2026-10-13
Status: approved, revised after the docs check on 2026-10-13

## Problem

The first version of this skill did not work in practice. It injected about 400 tokens into Claude's context at session start and relied on Claude to deliver tips "at a natural seam". That failed in three ways:

- The user never saw that the coach was active, so "no tip yet" and "broken" looked the same.
- Delivery depended on the model remembering a contract buried in startup context, which other context hooks dilute.
- The tips themselves were concepts more than actions, so even a delivered tip often gave the user nothing to do.

## Goal

Teach Claude Code through small, glanceable breadcrumbs that appear on their own, with a one-time install and nothing to configure afterward. It is on by default once installed.

## Non-goals

- No chat messages, banners, or cards. The crumb never interrupts.
- No model involvement in delivery. Zero tokens per session.
- No per-session user action. The user never triggers it.

## The crumb

A crumb is one dim line in the slot Claude Code already uses for its own spinner tips:

```
✻ Pollinating… (4s · esc to interrupt)
  ⎿ Try: Before a big change, commit first so undoing it is a single git command
```

- **Label:** `Try`. Rendered by Claude Code as `Try: <text>`.
- **Length:** 70 to 110 characters of text after the label. It must read in the 2 to 5 seconds the spinner is visible and fit one line in a normal terminal.
- **Content:** one exact key, command, or phrase the user can act on, plus what it does. No shorthand that makes the user guess.

### Formats

Each crumb uses one of six formats, chosen by the kind of tip:

| Format | Used for | Example |
|---|---|---|
| `command` | discovering a command | `/recap gives a one-line summary of where this session stands, handy after a break` |
| `key` | keys and shortcuts | `Press Ctrl+R to search your prompt history and reuse something you already typed once` |
| `when` | habits tied to a moment | `Before a big change, commit first so undoing it is a single git command` |
| `goal` | recovery and how-to | `To undo Claude's last steps, press Esc twice on an empty prompt and restore code, chat, or both` |
| `fact` | limits and surprises | `Rewind can't undo rm, mv, or cp run in Bash, so commit before Claude deletes files` |
| `question` | clear "oops" moments only | `Closed the terminal by accident? claude --continue reopens the last session in this folder` |

Questions are capped at one crumb in eight.

### Fixed text rule

**One crumb, one fixed text.** A crumb's wording and format never change between showings. Recognition is what makes a review work; a reworded crumb reads as a new tip and wastes the review. Variety comes from showing different crumbs, never from varying one.

Changing a crumb's text means giving it a new id, which restarts its schedule. A committed `crumbs.lock` file records a hash of each crumb's text, and the test suite fails when an id's text no longer matches its hash. The hook itself never checks this; it must stay silent.

### Quality bar

Every crumb must pass all of these:

1. One action the user can take now.
2. 70 to 110 characters.
3. States what the user gains, not only what the feature is.
4. Not already taught by Claude Code's built-in tips. The two documented built-in tips cover Plan Mode via Shift+Tab and `/config` for the default permission mode, so the bank must not repeat those.
5. Verified against the official docs at code.claude.com, with a source per crumb.
6. Readable on its own, with no jargon.
7. Marked for the surface it is true on: terminal, app, or both.

## The bank

77 crumbs: 46 rewritten from the original 55 tips, 31 new. Nine original tips were dropped or merged because they had no single action, duplicated a built-in tip, or could not be verified.

Format mix: 27 command, 13 when, 11 key, 11 fact, 9 goal, 6 question.

Each crumb also has a `level`:

| Level | Meaning | Priority sent to Claude Code |
|---|---|---|
| 1 | basics every user needs | `2` |
| 2 | everyday habits and commands | `0` |
| 3 | advanced or niche | `-2` |

## Mechanism

Claude Code's documented `spinnerTipsOverride` setting supplies the line. No hook, no model, no context injection, no state of our own.

### What Claude Code already does

From the settings reference (v2.1.247 or later):

- `tipsFile` is a JSON file holding an array of tip entries, up to 256 KB and 200 tips.
- Each entry has an `id`, `text`, `cooldownSessions` (sessions to wait before showing it again), and `priority`.
- Claude Code keeps each tip's show history by `id`. It shows the tip that has gone unshown longest; `priority` breaks ties, higher first.
- Custom tips share the rotation with the built-in tips unless `excludeDefault` is `true`.
- The file is read once per process, at startup.
- If the file is missing or every entry is invalid, Claude Code falls back to its built-in tips.

That is a scheduler already. The first version of this skill ran its own spaced-repetition scheduler in a `SessionStart` hook; this design deletes it and lets Claude Code rotate a static bank.

### Effect on learning

- **Curriculum order.** At first every crumb is equally unshown, so priority decides: basics first, advanced last.
- **Repetition.** After a crumb is shown, `cooldownSessions: 3` keeps it away for three sessions. Then it competes again by time unshown, so every crumb comes back after the rest of the rotation has had its turn.
- **Trade-off.** Expanding intervals (2, 6, 16, 45 days) are gone. Repetition is a steady cycle instead. In exchange there is nothing to run, nothing to break, and nothing to reset.
- **Mix with built-in tips.** 77 crumbs share the rotation with Claude Code's built-in tips, so most lines are crumbs, and new built-in tips about new features still appear.

### Fixed ids carry the history

Claude Code's show history is keyed by `id`. That is the same reason the fixed text rule exists: an id must never be reused for different text.

### Files

| File | Role |
|---|---|
| `crumbs.json` | source of truth: `id`, `text`, `topic`, `format`, `level`, `surface`, `src` |
| `try-tips.json` | generated, committed: only `id`, `text`, `cooldownSessions`, `priority`, which is what Claude Code reads |
| `crumbs.lock` | committed `id` → text hash, to enforce the fixed text rule |
| `crumbs.mjs` | `build` regenerates `try-tips.json` and records new ids in the lock; `list` prints the bank |

`try-tips.json` is committed rather than built at install time, so `git pull` updates the crumbs with no reinstall. A test fails if it drifts from `crumbs.json`.

The generated file carries only documented fields. Extra metadata in a tip entry is not documented, and an invalid entry is silently dropped, so the metadata stays in `crumbs.json`.

### Install (one time)

`node install.mjs`:

1. Links the skill into `~/.claude/skills/` (a junction on Windows, a symlink elsewhere).
2. Sets in `~/.claude/settings.json`:

   ```json
   "spinnerTipsOverride": { "label": "Try", "tipsFile": "<repo>/claude-code-coach/try-tips.json" }
   ```

   Any `tips` the user already has are kept. `excludeDefault` is not touched.
3. Removes the `SessionStart` hook entries the first version registered, if present.
4. Checks the result: the tip file parses, every entry is valid, and the Claude Code version is 2.1.247 or later. It warns if `spinnerTipsEnabled` is `false`, because that hides every tip.

The installer backs up settings once before writing, is idempotent, and refuses to overwrite a `tipsFile` that points somewhere else.

After that, nothing is ever needed. New sessions pick the crumbs up on their own.

### Uninstall

`node install.mjs --uninstall` removes the link, removes `label` and `tipsFile` if they are ours, and deletes `spinnerTipsOverride` if nothing else is left in it. All other settings stay untouched.

## The skill

`SKILL.md` stays, for depth and maintenance. It points Claude at the four reference files for how-to questions, and explains how to add a crumb. The hardcoded personal paths to the author's course material are removed. `coach.mjs`, `tips.json`, `digest.md`, and `test-schedule.mjs` are deleted.

## Verified so far

- Inline `tips` with a custom `label` render as `Try: …` in the terminal, and reload mid-session (2026-10-13).
- `tipsFile` schema, read-once behavior, priority, and cooldown semantics are documented in the settings reference.

## Still open

- **Desktop app.** The docs do not say whether the Claude Code desktop app shows spinner tips. The README states the terminal is supported and the app depends on Claude Code showing spinner tips there.
- **Built-in tip count.** The share of crumbs in the rotation depends on how many built-in tips Claude Code has. If built-in tips turn out to dominate, revisit `excludeDefault`.

## Testing

`test.mjs` checks:

- Every crumb has all fields, ids are unique, and the bank is at most 200.
- Every crumb is 70 to 110 characters, and questions are at most one in eight.
- Every crumb's text matches its hash in `crumbs.lock`.
- `try-tips.json` matches what `crumbs.mjs build` would generate.
- The installer, against a temporary config directory: install, reinstall with no change, other settings preserved, legacy hook removed, foreign `tipsFile` refused, uninstall leaves nothing behind.

## Naming

The line label is `Try`. The repo and skill keep the name `claude-code-coach`: the name describes what the project is, the label describes what each line asks you to do, and renaming the published repo would break existing links.
