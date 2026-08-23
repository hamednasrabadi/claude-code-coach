---
name: claude-code-coach
description: Use when the user asks how to do something in Claude Code (keys, slash commands, permission modes, CLAUDE.md, skills, subagents, hooks, plugins, MCP, context management, models/effort, recovery), when deciding where a rule belongs (CLAUDE.md vs skill vs hook vs command), or when maintaining the session tip bank — adding a tip learned this session, marking one known, or resurfacing one.
---

# Claude Code Coach

Two jobs: keep Claude grounded in this user's own Claude Code corpus instead of recalling, and teach the user 2–3 things per session on a spaced-repetition schedule so the knowledge sticks.

A `SessionStart` hook runs `coach.mjs session`, which injects a ~400-token block: a short operating digest, the coach contract, and this session's due tips already rendered. **That happens automatically — you do not invoke this skill to get tips.** Load this skill for depth, or to maintain the bank.

## References — read the one that matches the question

| File | Covers |
|---|---|
| `references/cockpit.md` | Keys (Esc, Esc Esc, Shift+Tab, `@`, `!`), the built-in commands, permission modes, settings scopes |
| `references/context.md` | The context window as a budget; `/context` `/compact` `/clear` `/btw` `/add-dir`, resume, subagent offload |
| `references/building.md` | CLAUDE.md, skills vs commands, subagents, hooks, plugins, MCP, the routing rule, premature-automation trap |
| `references/loop.md` | explore→plan→code→verify→commit→review, hallucination, recovery ladder, model/effort dials, anti-patterns |

## The primary corpus

These reference files are distillations. The full source is the user's own material — **prefer it over recalled knowledge** for anything about Claude Code:

- **English** — `C:\NewDrive\Claudes\Claude-mastery\ClaudeCodePackage\ROADMAP\mastery\` : 11 modules (`00-index` … `11-capstone`) plus `PLAYBOOK.md`, "The Unspoken Tips".
- **Persian** — `C:\NewDrive\Claudes\Claude-mastery\ClaudeCodePackage\claude-mastery-course\` : 44 modules; 26–34 are the Claude Code layer. `_cheatsheets/` and `_glossary/glossary.md` are the fastest way in.

Treat these as read-only. They are a source, never a target.

## Delivering tips

The hook hands you the session's tips with a trigger for each. The rules, restated:

- **Never dump them at session start.** Hold them and deliver at a natural seam — after a task lands, or the moment the tip's trigger actually occurs.
- One per message, at most. Never two in the same reply.
- Format exactly: `💡 **<title>** — <body>` followed by the literal key or command. No preamble, no "as you may know".
- Never interrupt debugging or an in-flight multi-step task to teach.
- If a trigger never occurs in a short session, drop the tip silently. A forced tip is worse than a skipped one.

## Maintaining the bank

Run from `C:\NewDrive\Claudes\tip-skill\claude-code-coach\`.

| Situation | Command |
|---|---|
| User says they already do this | `node coach.mjs know <id>` — jumps to box 6 |
| User hits the exact problem a tip warns about | `node coach.mjs again <id>` — back to box 1, returns in 2 days |
| See the whole bank, boxes, due dates | `node coach.mjs status` |
| Dry-run the picker without touching state | `node coach.mjs preview [--now=ISO]` |
| Verify scheduling still holds after edits | `node test-schedule.mjs` |

**Adding a tip learned this session.** When a session surfaces a real Claude Code gotcha or a technique that worked, add it — that's the point of the learning log. Keep `body` under ~150 characters or the session budget slips.

```bash
echo '{"id":"kebab-id","topic":"context","title":"Short imperative title",
       "body":"One or two sentences. Concrete. Under 150 chars.",
       "action":"/thecommand","triggers":["when this should fire"],
       "src":"session 2026-08-23"}' | node coach.mjs add
```

Then append a dated line to `learnings.md`. New tips enter at box 1 and join the normal rotation.

Only add things that are **non-obvious and repeatable**. A one-off fact about one repo belongs in that repo's CLAUDE.md, not here.

## Scheduling model

Leitner boxes 1–6, intervals `0 / 2 / 6 / 16 / 45 / 120` days. Each session takes 2 new tips and reserves at least 1 slot for a due review — without that reservation, never-shown tips crowd out reviews until the bank is exhausted and nothing is ever repeated. At most one tip per topic per session. State lives in `state.json`; it is disposable — deleting it just restarts the curriculum.

## Files

```
install.mjs         installer / uninstaller (link + hook registration)
coach.mjs           scheduler + CLI + hook entrypoint
tips.json           the tip bank (content)
digest.md           the Claude-facing lines injected every session
state.json          box + lastShown per tip (disposable)
learnings.md        dated log of tips added from real sessions
test-schedule.mjs   simulates 13 sessions, asserts spacing/diversity/budget
references/         the four deep-dive files above
```
