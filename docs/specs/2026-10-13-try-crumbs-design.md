# Try crumbs: design

Date: 2026-10-13
Status: draft, awaiting review

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

77 crumbs: 46 rewritten from the original 55 tips, 31 new. Nine original tips were dropped or merged because they had no single action, duplicated a built-in tip, or could not be verified. The working draft is `docs/crumbs-draft.json`; it replaces `tips.json` during implementation.

Format mix: 27 command, 13 when, 11 key, 11 fact, 9 goal, 6 question.

## Mechanism

Claude Code's documented `spinnerTipsOverride` setting supplies the line. No model, no context injection.

### Install (one time)

`node install.mjs` does three things and nothing else is ever needed:

1. Links the skill into `~/.claude/skills/`, as today.
2. Registers the `SessionStart` hook for `startup` and `clear`, as today.
3. Adds to `~/.claude/settings.json`:

   ```json
   "spinnerTipsOverride": { "label": "Try", "tipsFile": "<skill dir>/try-tips.json" }
   ```

   `excludeDefault` stays unset, so Claude Code's own tips keep appearing and the user stays current with new features.

The installer backs up settings first, is idempotent, preserves progress, and verifies the result by running the hook once. If `spinnerTipsEnabled` is `false`, the installer says so, because the crumbs would be hidden.

### Each session

The `SessionStart` hook runs `coach.mjs session`, which:

1. Picks 3 crumbs with the existing scheduler: 2 new and at least 1 review, one per topic, on Leitner intervals of 0, 2, 6, 16, 45, and 120 days.
2. Writes them to `try-tips.json` with a priority above the built-in tips, so the slot shows mostly crumbs and sometimes a built-in tip.
3. Prints nothing to Claude's context.

A crumb only advances its box when it has been written for a session. The spinner may not show every crumb in a short session; that is accepted, and a crumb that was written but unseen still counts as shown. This keeps the scheduler simple and the hook fast.

### Uninstall

`node install.mjs --uninstall` removes the link, the hook entries, and the `spinnerTipsOverride` key, leaving all other settings untouched.

### Failure behavior

The hook stays silent and exits 0 on any error, as today. If the tip file is missing or broken, Claude Code shows its built-in tips and the session is unaffected.

## The skill

`SKILL.md` stays, for depth and maintenance only: "I already know that one" makes Claude run `coach.mjs know <id>`; "explain that tip" makes Claude load the matching reference. The hardcoded personal paths to `C:\NewDrive\Claudes\Claude-mastery` are removed so the skill works on any machine. `digest.md` and the context contract in `coach.mjs` are deleted.

## Open items to verify during implementation

These are not documented and must be tested before the design is final:

1. **`tipsFile` format.** The docs give the size limit, not the schema. Test whether it takes the same array as `tips`.
2. **Reload of `tipsFile`.** Inline `tips` reload mid-session (confirmed on 2026-10-13). Test whether a rewritten `tipsFile` is re-read without a restart. Fallback: the hook writes inline `tips` into `settings.json` instead.
3. **Priority mixing.** Test whether priority above zero still lets built-in tips appear. Fallback: set `excludeDefault: true` in most sessions and `false` in every fourth.
4. **Desktop app.** The docs do not say whether the Claude Code desktop app shows spinner tips. Test it. If it does not, decide on an app fallback separately; the terminal design does not change.

## Testing

`test-schedule.mjs` is updated to check:

- Every crumb has `id`, `topic`, `format`, `text`, and `src`, and ids are unique.
- Every crumb is 70 to 110 characters, and questions are at most one in eight.
- Text for an id matches its hash in `crumbs.lock`.
- The 13-session scheduling simulation still holds: spacing, review slot, topic diversity.
- The generated `try-tips.json` is valid and contains exactly the picked crumbs.

## Naming

The line label is `Try`. The repo and skill are still named `claude-code-coach`; a matching name is decided before the README rewrite.
