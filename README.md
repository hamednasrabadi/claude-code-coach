# Claude Code Coach

Teaches you Claude Code while you work — 2–3 tips per session, on a spaced-repetition schedule, for a fixed ~400-token budget.

Claude Code's built-in self-knowledge is reactive: it answers questions about itself when asked, and never tells you about the feature you aren't using. This skill fixes that. A `SessionStart` hook injects a small block at the start of every session; Claude holds the tips and drops them at natural moments — when a tip's trigger actually occurs, not as a wall of text up front.

Tips you've already seen come back on a growing interval — **2 → 6 → 16 → 45 → 120 days** — so they're learned rather than shown once and forgotten.

**Key properties:**
- 🧠 **Spaced repetition** — Leitner boxes, 2 new tips + 1 review per session
- 🪶 **~400 tokens/session, zero tool calls** — the scheduler runs in `coach.mjs`, not in the model
- 🎯 **Contextual delivery** — every tip carries a trigger; Claude waits for it
- 📚 **55 tips, 17 topics** — every slash command cross-checked against the official reference
- ✍️ **Learns as you go** — add a tip the moment a session teaches you something
- 🔌 **One command to install, one to remove**

## Install

Requires [Node.js](https://nodejs.org) 18+ and Claude Code.

```sh
git clone https://github.com/hamednasrabadi/claude-code-coach.git
cd claude-code-coach/claude-code-coach
node install.mjs
```

That links the skill into `~/.claude/skills/` (a junction on Windows, a symlink elsewhere — no admin needed) and registers the `SessionStart` hook in `~/.claude/settings.json`, backing up your settings first and leaving every other key untouched.

```
Installing claude-code-coach

  + linked C:\Users\you\.claude\skills\claude-code-coach
  ~ backed up settings to C:\Users\you\.claude\backups\settings.json.2026-08-23T15-22-38-102Z
  + registered SessionStart hook for: startup, clear
  ✓ hook output parses — 1631 chars (~408 tokens per session)
  ✓ starting the curriculum from tip one

Done. Start a new session (or /clear) and the coach is live.
```

Start a new session — or `/clear` in the current one — and it's running. Re-running the installer is safe: it's idempotent and preserves your progress.

**To remove it:**

```sh
node install.mjs --uninstall
```

Unlinks the skill and strips only its own hook entries, leaving any other hooks you've configured in place.

## What a tip looks like

Claude never dumps the session's tips at startup. It waits for the moment:

> 💡 **"Always do X" is a hook, not a prompt** — a standing instruction you give in chat is something Claude can forget; a hook is enforced by the harness and can't be.

One per message, at most, at a natural seam. Never mid-debugging. If a tip's trigger doesn't occur, it's dropped silently and stays due for next time.

## How the scheduling works

Each session takes **2 never-seen tips and reserves at least one slot for a review**, capped at one tip per topic so you never get three variations of the same lesson.

That reservation is the whole design. Without it, never-shown tips are infinitely overdue and outrank every review — with a 55-tip bank you'd get nothing but new material for ~18 sessions and never see anything twice. Reviewing is the point.

```
day  0   permission-to-not-know   hooks-are-laws       commit-often
day  2   claude-improves-prompt   btw-no-derail        permission-to-not-know  ← +2d
day  3   worktree-for-risky       at-mention-files     hooks-are-laws          ← +3d
day  5   plugin-before-building    specific-not-louder  commit-often            ← +5d
day 30   esc-esc-rewind           esc-interrupt        claude-improves-prompt  ← +28d
```

State lives in `state.json`, which is gitignored — your progress is yours, and deleting it just restarts the curriculum.

## Commands

Run from the `claude-code-coach/` directory.

| Command | Effect |
|---|---|
| `node coach.mjs status` | the whole bank — boxes, due dates, coverage by topic |
| `node coach.mjs preview` | dry-run the picker; state untouched |
| `node coach.mjs know <id>` | you already do this → 120-day interval |
| `node coach.mjs again <id>` | you hit the problem anyway → back to 2 days |
| `node coach.mjs add` | append a tip (JSON on stdin) |
| `node test-schedule.mjs` | bank integrity + a 13-session scheduling simulation |

In practice you don't type these — you tell Claude "I already do that" and it runs the right one.

## Adding a tip

```sh
echo '{"id":"kebab-id","topic":"context","title":"Short imperative title",
       "body":"One or two sentences. Concrete. Under 180 chars.",
       "action":"/thecommand","triggers":["when this should fire"],
       "src":"session 2026-08-23"}' | node coach.mjs add
```

New tips enter at box 1 and join the normal rotation. `test-schedule.mjs` enforces unique ids, required fields, and the length caps, so a careless addition can't quietly blow the token budget.

## Layout

```
claude-code-coach/
  SKILL.md            skill definition — what Claude reads on demand
  install.mjs         installer / uninstaller
  coach.mjs           scheduler, CLI, and hook entrypoint
  tips.json           the tip bank
  digest.md           the model-facing lines injected each session
  learnings.md        dated log of tips added from real sessions
  test-schedule.mjs   integrity + scheduling tests
  references/         cockpit · context · building · loop (loaded on demand)
```

## Design notes

- **The hook fails silent.** Any error — corrupt bank, missing file, bad JSON — exits 0 with no output. A broken coach must never block a session start.
- **`resume` and `compact` are deliberately not hooked.** Continuing a session shouldn't re-charge you tokens or repeat tips you just saw.
- **The references are loaded on demand only.** The always-on cost is the digest and the tips; the deep material costs nothing until Claude needs it.

## Author

Hamed Nasrabadi. Tips distilled from my own Claude Code course material.
