# The loop, verification, recovery, and the dials

Source: `mastery/10-development-loop.md`, PLAYBOOK Parts 1, 2, 4, 5.

## The loop

> **Explore** (read first) → **Plan** (approve before edits) → **Code** (steer) → **Verify** (run it) → **Commit** (save point) → **Review** (second eyes) → `/clear`

One task per loop, clear between loops. Without it, AI coding degenerates into generate-and-pray: ask, get a plausible blob, discover it's subtly wrong, ask again, repeat until exhausted.

**Plan is the highest-ROI station.** Read the plan like a reviewer — fixing a plan is a sentence, fixing finished work is a rewrite.

## Verification

In code you have a truth machine: the compiler, the type checker, and the tests do not hallucinate. Don't read generated code and nod — run it. Read the actual diff rather than trusting "done."

Match verification to stakes. A brainstorm needs none; a number going into a report, or code touching production, always does.

## Hallucination — where it lives

Risk spikes on claims that are **specific, checkable, and unlikely to be genuinely known**: API signatures, config flags, method names, versions, citations, URLs, statistics, anything recent or niche. Uniform confidence across easy and hard claims is itself a tell.

Detection: ask for the source quote first · re-ask in a fresh session and compare · ask it to argue the opposite · check against reality (run it, read the docs).

Prevention: give explicit permission to say "I don't know" — one line in CLAUDE.md measurably reduces fabrication. Ground answers in supplied sources rather than general knowledge.

## Recovery ladder — match the undo to the mistake

| Symptom | Reach for |
|---|---|
| Shallow or rushed on a hard problem | Raise effort / "think harder", re-ask |
| Session quality slowly degrading | `/context` to diagnose → `/clear` to cure |
| The last few steps went wrong | `/rewind` (or Esc Esc) |
| The whole approach was wrong | `git reset` to the last good commit |
| It was risky and you knew it | You should have been in a worktree |

Two companion rules: **interrupt early** — Esc the moment it's heading wrong, because a finished wrong approach also poisons the context. And **if two corrections haven't landed, stop arguing** — a third "no, like I said…" into a context full of the misunderstanding rarely works. Go fresh with what you learned baked into a better prompt.

## The dials

- **Model** = how big a brain. Haiku (fast/simple) · Sonnet (daily driver) · Opus (hard/high-stakes) · Fable (enormous, long-horizon). Per-task, not per-life.
- **Effort** = how long it sits and thinks. low for trivial · medium/high for normal · xhigh for hard coding and agentic work · max for must-not-fail.
- **`/fast`** on Opus: same brain, quicker output.
- Climb when it visibly struggles (circling, missing cross-file implications, confidently wrong twice). Max effort on everything is just slower for no gain.
- `/usage` is the gauge. Big model + max effort + subagent swarms is a fine choice *when chosen*.

## Anti-patterns to unlearn

The one-liner reflex · the eternal session · trusting fluent output blindly · volume as strategy (repeating louder instead of saying *what* was wrong) · wrong tool for the job · over-engineering the setup · max effort on everything · never giving Claude permission to say "I don't know."
