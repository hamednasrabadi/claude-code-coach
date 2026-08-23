# claude-code-coach

A Claude Code skill that teaches you Claude Code while you work.

A `SessionStart` hook injects ~400 tokens at the start of every session: a short
operating digest for the model, plus 2–3 tips selected by a spaced-repetition
scheduler. Claude holds the tips and delivers them at natural moments rather than
dumping them up front. Tips you have seen come back on a growing interval
(2 → 6 → 16 → 45 → 120 days), so they are learned rather than shown once.

All scheduling happens in `coach.mjs`, not in the model — the session costs zero
tool calls and a fixed token budget.

## Install

```sh
# make the skill visible in every project (Windows, no admin needed)
New-Item -ItemType Junction `
  -Path   "$HOME\.claude\skills\claude-code-coach" `
  -Target "<repo>\claude-code-coach"
```

Then add to `~/.claude/settings.json`:

```json
"hooks": {
  "SessionStart": [
    { "matcher": "startup",
      "hooks": [{ "type": "command",
                  "command": "node \"<repo>/claude-code-coach/coach.mjs\" session" }] },
    { "matcher": "clear",
      "hooks": [{ "type": "command",
                  "command": "node \"<repo>/claude-code-coach/coach.mjs\" session" }] }
  ]
}
```

`resume` and `compact` are deliberately excluded — continuing a session should not
re-charge tokens or repeat tips you just saw.

## Use

| Command | Effect |
|---|---|
| `node coach.mjs status` | the bank, boxes, due dates |
| `node coach.mjs preview` | dry-run the picker, state untouched |
| `node coach.mjs know <id>` | already known → 120-day interval |
| `node coach.mjs again <id>` | hit the problem anyway → back to 2 days |
| `node coach.mjs add` | append a tip (JSON on stdin) |
| `node test-schedule.mjs` | bank integrity + 13-session scheduling simulation |

## Content

The 55 tips are distilled from the author's own Claude Code course. Every slash
command in the bank is cross-checked against the official command reference.
